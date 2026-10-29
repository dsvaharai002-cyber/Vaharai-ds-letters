import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

const CONFIG_FILE = path.resolve(process.cwd(), 'cloud-config.json');

// In-memory cache for fast read responses and reducing Google Apps Script cold starts
let cloudDataCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 20000; // 20 seconds cache

export const OFFICIAL_APPS_SCRIPT_CODE = `/**
 * Divisional Secretariat - Koralaipattu North, Vaharai
 * Mail Management System - Google Apps Script (Code.gs)
 * Dynamic Header-Mapped Edition (Zero Shifting, Precise In-Place Cell Updates)
 */

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || "get_all";
  if (type === "ping") {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, status: "connected", result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lettersSheet = ss.getSheetByName("Letters") || ss.getSheets()[0];
  var usersSheet = ss.getSheetByName("Users");
  
  var letters = lettersSheet ? lettersSheet.getDataRange().getValues() : [];
  var users = usersSheet ? usersSheet.getDataRange().getValues() : [];
  
  return ContentService.createTextOutput(JSON.stringify({ ok: true, letters: letters, users: users }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var data = {};
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      data = (e && e.parameter) || {};
    }
    
    var action = String(data.action || "").toUpperCase().trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var lettersSheet = ss.getSheetByName("Letters") || ss.getSheets()[0];
    var usersSheet = ss.getSheetByName("Users");
    
    if (action === "PING" || action === "TEST_CONNECTION") {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Dynamic Header Column Mapping (Reads Row 1 in sheet)
    var lastCol = lettersSheet.getLastColumn();
    var headers = lastCol > 0 ? lettersSheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    var colMap = {};
    for (var c = 0; c < headers.length; c++) {
      var hKey = String(headers[c] || "").trim().toLowerCase().replace(/[\\s_\\-]+/g, "");
      if (hKey) colMap[hKey] = c + 1; // 1-based index
    }

    function getCol() {
      for (var a = 0; a < arguments.length; a++) {
        var k = String(arguments[a]).toLowerCase().replace(/[\\s_\\-]+/g, "");
        if (colMap[k] !== undefined) return colMap[k];
      }
      return 0;
    }

    var colId = getCol("id") || 1;
    var colOrigNo = getCol("originalno", "original_no") || 2;
    var colDate = getCol("date") || 3;
    var colDispDate = getCol("dispatcheddate", "dispatched_date") || 4;
    var colPostType = getCol("posttype", "lettertype", "post_type") || 5;
    var colRegPostNo = getCol("registeredpostno", "regpostno", "registered_post_no") || 6;
    var colInwardNo = getCol("inwardno", "inward_no") || 7;
    var colFromWhom = getCol("fromwhom", "from_whom") || 8;
    var colSubject = getCol("subject") || 9;
    var colDivision = getCol("division") || 10;
    var colFwdDivs = getCol("forwardeddivisions", "forwardeddivision", "fwd_divs") || 11;
    var colAction = getCol("actionstatus", "action", "letteraction", "status") || 12;
    var colFwdTo = getCol("forwardedto", "forward_to", "forwardto") || 13;
    var colReply = getCol("replyresponse", "reply", "response") || 14;
    var colExtra = getCol("extradata", "extra_data", "extra") || 15;

    // Normalizes Action Status value (Never allow RPC command names like UPDATE_LETTER)
    function sanitizeAction(val) {
      if (!val) return "Not Yet Viewed";
      var str = String(val).trim();
      if (str === "UPDATE_LETTER" || str === "ADD_LETTER" || str === "DELETE_LETTER" || str === "UPDATE_ACTION" || str === "UPDATE_STATUS") {
        return "Not Yet Viewed";
      }
      if (str.indexOf("Taken") !== -1 || str.indexOf("எடுக்கப்பட்டது") !== -1) return "Action Taken";
      if (str.indexOf("Not Taken") !== -1 || str.indexOf("எடுக்கப்படவில்லை") !== -1) return "Action Not Taken";
      if (str.indexOf("Investig") !== -1 || str.indexOf("ஆய்வில்") !== -1) return "Under Investigation";
      return str;
    }

    // 1. ADD NEW LETTER (Precise Header Column Slotting)
    if (action === "ADD_LETTER") {
      var safeFwdDivs = Array.isArray(data.forwardedDivisions)
        ? JSON.stringify(data.forwardedDivisions)
        : String(data.forwardedDivisions || "");
      var safeFwdTo = Array.isArray(data.forwardedTo)
        ? JSON.stringify(data.forwardedTo)
        : String(data.forwardedTo || "");
      var safeExtra = typeof data.extraData === "string"
        ? data.extraData
        : JSON.stringify(data.extraData || {});
      var rawAct = data.actionStatus || data.letterAction || data.ActionStatus || data.Action;
      var actionVal = sanitizeAction(rawAct);

      var numCols = Math.max(headers.length, 15);
      var row = new Array(numCols).fill("");

      function setCell(cIdx, val) {
        if (cIdx > 0 && cIdx <= numCols) row[cIdx - 1] = val;
      }

      setCell(colId, data.id || ("LTR-" + Date.now()));
      setCell(colOrigNo, data.originalNo || "");
      setCell(colDate, data.date || "");
      setCell(colDispDate, data.dispatchedDate || data.date || "");
      setCell(colPostType, data.letterType || data.postType || "Registered Post");
      setCell(colRegPostNo, data.registeredPostNo || "No");
      setCell(colInwardNo, data.inwardNo || "");
      setCell(colFromWhom, data.fromWhom || "");
      setCell(colSubject, data.subject || "");
      setCell(colDivision, data.division || "");
      setCell(colFwdDivs, safeFwdDivs);
      setCell(colAction, actionVal);
      setCell(colFwdTo, safeFwdTo);
      setCell(colReply, data.replyResponse || "");
      setCell(colExtra, safeExtra);

      lettersSheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "ADD_LETTER" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. UPDATE LETTER / UPDATE ACTION STATUS (Zero Shift, Precise Target Cell Updates)
    if (action === "UPDATE_LETTER" || action === "UPDATE_STATUS" || action === "UPDATE_ACTION") {
      var id = String(data.id || "").trim();
      var origNo = String(data.originalNo || "").trim();
      var rows = lettersSheet.getDataRange().getValues();
      var foundRowIndex = -1;
      
      for (var i = 1; i < rows.length; i++) {
        var rowId = String(rows[i][colId - 1] || rows[i][0] || "").trim();
        var rowOrig = String(rows[i][colOrigNo - 1] || rows[i][1] || "").trim();
        if ((id && rowId === id) || (origNo && rowOrig === origNo)) {
          foundRowIndex = i + 1; // 1-based index in sheet
          break;
        }
      }
      
      if (foundRowIndex > 0) {
        var existingRow = rows[foundRowIndex - 1];
        var rawAct = data.actionStatus || data.letterAction || data.ActionStatus || data.Action;
        if (!rawAct && data.action && data.action !== "UPDATE_LETTER" && data.action !== "UPDATE_ACTION" && data.action !== "UPDATE_STATUS") {
          rawAct = data.action;
        }
        var actionVal = sanitizeAction(rawAct || (colAction > 0 ? existingRow[colAction - 1] : "Not Yet Viewed"));

        // Direct cell update for ActionStatus - NEVER writes to ForwardedDivisions!
        if (colAction > 0 && actionVal) {
          lettersSheet.getRange(foundRowIndex, colAction).setValue(actionVal);
        }

        // Direct cell update for ExtraData
        if (colExtra > 0 && data.extraData !== undefined) {
          var safeExtra = typeof data.extraData === "string" ? data.extraData : JSON.stringify(data.extraData);
          lettersSheet.getRange(foundRowIndex, colExtra).setValue(safeExtra);
        }

        // Direct cell update for ForwardedDivisions only if explicitly updated
        if (colFwdDivs > 0 && data.forwardedDivisions !== undefined) {
          var safeFwdDivs = Array.isArray(data.forwardedDivisions) ? JSON.stringify(data.forwardedDivisions) : String(data.forwardedDivisions);
          lettersSheet.getRange(foundRowIndex, colFwdDivs).setValue(safeFwdDivs);
        }

        // Direct cell update for ForwardedTo only if explicitly updated
        if (colFwdTo > 0 && data.forwardedTo !== undefined) {
          var safeFwdTo = Array.isArray(data.forwardedTo) ? JSON.stringify(data.forwardedTo) : String(data.forwardedTo);
          lettersSheet.getRange(foundRowIndex, colFwdTo).setValue(safeFwdTo);
        }

        // Direct cell update for ReplyResponse only if explicitly updated
        if (colReply > 0 && data.replyResponse !== undefined) {
          lettersSheet.getRange(foundRowIndex, colReply).setValue(String(data.replyResponse));
        }

        // Full edits if fields are provided
        if (colOriginalNo > 0 && data.originalNo !== undefined) lettersSheet.getRange(foundRowIndex, colOriginalNo).setValue(String(data.originalNo));
        if (colDate > 0 && data.date !== undefined) lettersSheet.getRange(foundRowIndex, colDate).setValue(String(data.date));
        if (colDispDate > 0 && (data.dispatchedDate !== undefined || data.date !== undefined)) lettersSheet.getRange(foundRowIndex, colDispDate).setValue(String(data.dispatchedDate || data.date));
        if (colPostType > 0 && (data.letterType || data.postType) !== undefined) lettersSheet.getRange(foundRowIndex, colPostType).setValue(String(data.letterType || data.postType));
        if (colRegPostNo > 0 && data.registeredPostNo !== undefined) lettersSheet.getRange(foundRowIndex, colRegPostNo).setValue(String(data.registeredPostNo));
        if (colInwardNo > 0 && data.inwardNo !== undefined) lettersSheet.getRange(foundRowIndex, colInwardNo).setValue(String(data.inwardNo));
        if (colFromWhom > 0 && data.fromWhom !== undefined) lettersSheet.getRange(foundRowIndex, colFromWhom).setValue(String(data.fromWhom));
        if (colSubject > 0 && data.subject !== undefined) lettersSheet.getRange(foundRowIndex, colSubject).setValue(String(data.subject));
        if (colDivision > 0 && data.division !== undefined) lettersSheet.getRange(foundRowIndex, colDivision).setValue(String(data.division));

        return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "UPDATE_LETTER", row: foundRowIndex }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        // Fallback: append if record not yet in sheet
        var safeFwdDivs = Array.isArray(data.forwardedDivisions) ? JSON.stringify(data.forwardedDivisions) : String(data.forwardedDivisions || "");
        var safeFwdTo = Array.isArray(data.forwardedTo) ? JSON.stringify(data.forwardedTo) : String(data.forwardedTo || "");
        var safeExtra = typeof data.extraData === "string" ? data.extraData : JSON.stringify(data.extraData || {});
        var rawAct = data.actionStatus || data.letterAction || data.ActionStatus || data.Action;
        var actionVal = sanitizeAction(rawAct);

        var numCols = Math.max(headers.length, 15);
        var row = new Array(numCols).fill("");

        function setCell(cIdx, val) {
          if (cIdx > 0 && cIdx <= numCols) row[cIdx - 1] = val;
        }

        setCell(colId, id || ("LTR-" + Date.now()));
        setCell(colOrigNo, origNo);
        setCell(colDate, data.date || "");
        setCell(colDispDate, data.dispatchedDate || data.date || "");
        setCell(colPostType, data.letterType || data.postType || "Registered Post");
        setCell(colRegPostNo, data.registeredPostNo || "No");
        setCell(colInwardNo, data.inwardNo || "");
        setCell(colFromWhom, data.fromWhom || "");
        setCell(colSubject, data.subject || "");
        setCell(colDivision, data.division || "");
        setCell(colFwdDivs, safeFwdDivs);
        setCell(colAction, actionVal);
        setCell(colFwdTo, safeFwdTo);
        setCell(colReply, data.replyResponse || "");
        setCell(colExtra, safeExtra);

        lettersSheet.appendRow(row);
        return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "ADD_LETTER" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 3. AUTO-REPAIR / FIX SHIFTED ROWS (Corrects any rows where Action was saved in ForwardedDivisions)
    if (action === "FIX_SHIFTED_ROWS" || action === "REPAIR_COLUMNS") {
      var rows = lettersSheet.getDataRange().getValues();
      var fixedCount = 0;
      for (var r = 1; r < rows.length; r++) {
        var cFwdDivs = String(rows[r][colFwdDivs - 1] || "").trim();
        var isActionInFwd = cFwdDivs === "Action Taken" || cFwdDivs === "Action Not Taken" || cFwdDivs === "Under Investigation" || cFwdDivs === "Not Yet Viewed";
        if (isActionInFwd) {
          // Set ActionStatus cell to the action value
          lettersSheet.getRange(r + 1, colAction).setValue(cFwdDivs);
          // Reset ForwardedDivisions cell back to "[]"
          lettersSheet.getRange(r + 1, colFwdDivs).setValue("[]");
          fixedCount++;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", fixedCount: fixedCount }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. DELETE LETTER
    if (action === "DELETE_LETTER") {
      var id = String(data.id || "").trim();
      var origNo = String(data.originalNo || "").trim();
      var rows = lettersSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var rowId = String(rows[i][colId - 1] || rows[i][0] || "").trim();
        var rowOrig = String(rows[i][colOrigNo - 1] || rows[i][1] || "").trim();
        if ((id && rowId === id) || (origNo && rowOrig === origNo)) {
          lettersSheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "DELETE_LETTER" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. USERS MANAGEMENT
    if (action === "ADD_USER" && usersSheet) {
      usersSheet.appendRow([
        data.User_ID || "",
        data.Password || "123",
        data.Name || "",
        data.Role || "User",
        data.Division || "",
        data.Status || "Active",
        JSON.stringify(data.assignedDivisions || []),
        JSON.stringify(data.assignedOfficers || []),
        typeof data.extraData === "string" ? data.extraData : JSON.stringify(data.extraData || {})
      ]);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "ADD_USER" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}
`;

export const getStoredWebAppUrl = (): string => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data.webAppUrl === 'string' && data.webAppUrl.trim()) {
        return data.webAppUrl.trim();
      }
    }
  } catch {
    // Ignore read errors
  }
  return (process.env.GOOGLE_SHEETS_WEB_APP_URL || DEFAULT_WEB_APP_URL).trim();
};

export const setStoredWebAppUrl = (url: string): void => {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ webAppUrl: url.trim(), updatedAt: new Date().toISOString() }, null, 2),
      'utf-8'
    );
  } catch (err) {
    console.error('Failed to write cloud-config.json:', err);
  }
};

/**
 * Tests connection to a Google Apps Script Web App URL and diagnoses permissions.
 */
async function testConnection(url: string) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    return {
      ok: false,
      statusCode: 400,
      errorType: 'MISSING_URL',
      url: '',
      message: 'Google Apps Script URL தேவை (URL is required).',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${cleanUrl}?type=ping&t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();

    // Check for Google Login redirect or 403 permission denied
    const isGoogleLogin =
      res.status === 403 ||
      text.includes('accounts.google.com') ||
      text.includes('You need access') ||
      text.includes('ServiceLogin') ||
      text.includes('Sign in - Google Accounts');

    if (isGoogleLogin) {
      return {
        ok: false,
        statusCode: 403,
        errorType: 'ACCESS_DENIED',
        url: cleanUrl,
        message:
          'Google Apps Script அனுமதி மறுக்கப்பட்டது (403 Forbidden / Access Denied). Web App Deploy அமைப்பில் "Who has access" என்பதை "Anyone" (அனைவருக்கும்) என அமைக்க வேண்டும்.',
      };
    }

    try {
      const json = JSON.parse(text);
      const isSuccess =
        json &&
        (json.ok !== undefined ||
          json.status === 'connected' ||
          json.result === 'success' ||
          json.result === 'ok' ||
          json.success === true ||
          Array.isArray(json.letters) ||
          (res.status === 200 && !json.error));

      if (isSuccess) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Sheets API வெற்றிகரமாக இணைக்கப்பட்டுள்ளது (Connected successfully)!',
          letterCount: Array.isArray(json.letters) ? Math.max(0, json.letters.length - 1) : undefined,
          data: json,
        };
      }
    } catch {
      // If it returned non-JSON text but valid 200 response
      if (res.status === 200 && (text.includes('success') || text.includes('connected') || text.includes('ok'))) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Sheets API வெற்றிகரமாக இணைக்கப்பட்டுள்ளது (Connected successfully)!',
        };
      }
    }

    // Secondary lightweight check: POST ping
    try {
      const postController = new AbortController();
      const postTimeout = setTimeout(() => postController.abort(), 15000);
      const postRes = await fetch(cleanUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'PING' }),
        signal: postController.signal,
      });
      clearTimeout(postTimeout);
      const postText = await postRes.text();
      const postJson = JSON.parse(postText);
      if (
        postJson &&
        (postJson.result === 'success' ||
          postJson.result === 'ok' ||
          postJson.ok ||
          postJson.success !== false ||
          (postRes.status === 200 && !postJson.error))
      ) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Sheets API வெற்றிகரமாக இணைக்கப்பட்டுள்ளது (Connected successfully)!',
          data: postJson,
        };
      }
    } catch {
      // POST fallback check failed
    }

    return {
      ok: false,
      statusCode: res.status,
      errorType: 'INVALID_RESPONSE',
      url: cleanUrl,
      message: 'Google Sheets Web App பதில் செல்லுபடியாகவில்லை (Valid response கிடைக்கவில்லை).',
    };
  } catch (err: any) {
    const isTimeout =
      err?.name === 'AbortError' ||
      String(err?.message || '').toLowerCase().includes('aborted') ||
      String(err?.message || '').toLowerCase().includes('timeout');

    return {
      ok: false,
      statusCode: isTimeout ? 504 : 500,
      errorType: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      url: cleanUrl,
      message: isTimeout
        ? 'கூகிள் சேவையக இணைப்பு நேரம் கடந்துவிட்டது (Timeout). Apps Script சர்வர் பதிலளிக்க அதிக நேரம் எடுத்தது. தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் சோதிக்கவும்.'
        : `கூகிள் சேவையக இணைப்பு தோல்வி: ${err?.message || 'Connection timeout or network failure'}`,
    };
  }
}

export default async function handler(req: Request, res: Response): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Web-App-Url');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Resolve target Google Apps Script URL: request header > query > body > config > default
  const customHeaderUrl = (req.headers['x-web-app-url'] as string) || '';
  const customQueryUrl = (req.query.webAppUrl as string) || '';
  const customBodyUrl = req.body?.customWebAppUrl || '';
  const resolvedUrl = (
    customHeaderUrl ||
    customQueryUrl ||
    customBodyUrl ||
    getStoredWebAppUrl()
  ).trim();

  // Test / Diagnosis Endpoint
  if (req.query.type === 'test' || req.query.type === 'status') {
    const testResult = await testConnection(resolvedUrl);
    res.status(200).json(testResult);
    return;
  }

  // Get Config URL Endpoint
  if (req.query.type === 'get_config') {
    res.status(200).json({
      ok: true,
      url: getStoredWebAppUrl(),
      isDefault: getStoredWebAppUrl() === DEFAULT_WEB_APP_URL,
    });
    return;
  }

  // Get Official Apps Script Code Endpoint
  if (req.query.type === 'get_script') {
    res.status(200).json({
      ok: true,
      code: OFFICIAL_APPS_SCRIPT_CODE,
    });
    return;
  }

  // GET: Fetch letters and users from Google Sheets
  if (req.method === 'GET') {
    // Check in-memory cache first for fast response and smooth navigation
    const forceFresh = req.query.force === 'true' || req.query.fresh === 'true';
    if (!forceFresh && cloudDataCache && Date.now() - cloudDataCache.timestamp < CACHE_TTL_MS) {
      res.status(200).json({ ok: true, cached: true, ...cloudDataCache.data });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${resolvedUrl}?type=get_all&t=${Date.now()}`, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const rawText = await response.text();

      // Check if redirected to Google sign-in or 403 Forbidden
      const isAccessDenied =
        response.status === 403 ||
        rawText.includes('accounts.google.com') ||
        rawText.includes('You need access') ||
        rawText.includes('ServiceLogin');

      if (isAccessDenied) {
        res.status(200).json({
          ok: false,
          offline: true,
          statusCode: 403,
          errorType: 'ACCESS_DENIED',
          message:
            'Google Apps Script 403 Forbidden: Apps Script Web App Deploy அமைப்பில் "Who has access" என்பதை "Anyone" (அனைவருக்கும்) என அமைக்க வேண்டும்.',
          letters: [],
          users: [],
        });
        return;
      }

      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        res.status(200).json({
          ok: false,
          offline: true,
          statusCode: response.status,
          errorType: 'NON_JSON_RESPONSE',
          message: 'Google Sheets பதில் JSON வடிவில் இல்லை.',
          letters: [],
          users: [],
        });
        return;
      }

      // Save to cache
      cloudDataCache = {
        data,
        timestamp: Date.now(),
      };

      res.status(200).json({ ok: true, ...data });
      return;
    } catch (err: any) {
      clearTimeout(timeout);
      const isTimeout =
        err?.name === 'AbortError' ||
        String(err?.message || '').toLowerCase().includes('aborted');

      res.status(200).json({
        ok: false,
        offline: true,
        statusCode: isTimeout ? 504 : 500,
        errorType: isTimeout ? 'TIMEOUT' : 'FETCH_ERROR',
        message: isTimeout
          ? 'Google Sheets தகவல்கள் பெற அதிக நேரம் எடுத்தது (Timeout). இணைய இணைப்பைச் சோதிக்கவும்.'
          : err?.message || 'Google Sheets fetch timeout',
        letters: [],
        users: [],
      });
      return;
    }
  }

  // POST: Write letter, update status, batch sync, or configure URL
  if (req.method === 'POST') {
    // Invalidate read cache immediately on any write
    cloudDataCache = null;
    // Action: Set Config URL
    if (req.body?.action === 'SET_CONFIG_URL' && req.body?.url) {
      const newUrl = String(req.body.url).trim();
      setStoredWebAppUrl(newUrl);
      const testRes = await testConnection(newUrl);
      res.status(200).json({ ok: true, url: newUrl, test: testRes });
      return;
    }

    // Action: Test Connection via POST
    if (req.body?.action === 'TEST_CONNECTION') {
      const testResult = await testConnection(resolvedUrl);
      res.status(200).json(testResult);
      return;
    }

    // Action: Data push (ADD_LETTER, UPDATE_LETTER, BATCH_ADD_LETTERS, etc.)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

      const response = await fetch(resolvedUrl, {
        method: 'POST',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const resText = await response.text();

      // Check for Google Access Denied / Login screen
      const isAccessDenied =
        response.status === 403 ||
        resText.includes('accounts.google.com') ||
        resText.includes('You need access') ||
        resText.includes('ServiceLogin');

      if (isAccessDenied) {
        res.status(200).json({
          ok: false,
          statusCode: 403,
          errorType: 'ACCESS_DENIED',
          message:
            'Google Apps Script 403 Forbidden: Apps Script அமைப்பில் "Who has access" என்பதை "Anyone" (அனைவருக்கும்) என அமைக்க வேண்டும்.',
        });
        return;
      }

      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(resText);
      } catch {
        // Plain text response from script
      }

      const hasError =
        Boolean(parsedJson?.error) ||
        parsedJson?.result === 'error' ||
        parsedJson?.status === 'error' ||
        parsedJson?.ok === false ||
        parsedJson?.success === false;

      const isSuccess = response.ok && !hasError;

      res.status(200).json({
        ok: isSuccess,
        statusCode: response.status,
        data: parsedJson,
        message: isSuccess
          ? 'Google Sheet-இல் வெற்றிகரமாகப் பதிவு செய்யப்பட்டது'
          : parsedJson?.error || 'Sheet sync failed',
      });
      return;
    } catch (err: any) {
      clearTimeout(timeout);
      res.status(200).json({
        ok: false,
        statusCode: 504,
        errorType: 'TIMEOUT',
        message: `Google Apps Script நேரம் கடந்துவிட்டது அல்லது நெட்வொர்க் பிழை (${err?.message || 'Timeout'})`,
      });
      return;
    }
  }

  res.status(405).json({ ok: false, error: 'Method not allowed' });
}
