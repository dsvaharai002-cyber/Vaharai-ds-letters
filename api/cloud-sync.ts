import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { ALL_OFFICIAL_LETTERS, ALL_OFFICIAL_USERS } from '../src/data/allOfficialLetters.ts';
import { repairLetterRecord } from '../src/utils/helpers.ts';

export const DEFAULT_DRIVE_FILE_ID = '1hp1cpRYvwRPC00OscMK-s5LmsHy-KiNM';
export const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

// Server-side persistent JSON store file path (synchronized across all browser sessions)
const SERVER_STORE_FILE = path.resolve(process.cwd(), 'vaharai_ds_letter.json');

let serverLetters: any[] = [];
let serverUsers: any[] = [];

function loadServerStore() {
  try {
    if (fs.existsSync(SERVER_STORE_FILE)) {
      const content = fs.readFileSync(SERVER_STORE_FILE, 'utf-8');
      const trimmed = content.trim();
      if (trimmed && trimmed !== '{ [ ] }' && trimmed !== '{[]}' && trimmed !== '[]' && trimmed !== '{}') {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          serverLetters = parsed.map(repairLetterRecord).filter(Boolean);
          serverUsers = [...ALL_OFFICIAL_USERS];
          return;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.letters) && parsed.letters.length > 0) {
            serverLetters = parsed.letters.map(repairLetterRecord).filter(Boolean);
            serverUsers = Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : [...ALL_OFFICIAL_USERS];
            return;
          }
        }
      }
    }
  } catch (err) {
    console.error('[cloud-sync] Error reading server store:', err);
  }
  // Initialize with official baseline
  serverLetters = ALL_OFFICIAL_LETTERS.map(repairLetterRecord).filter(Boolean);
  serverUsers = [...ALL_OFFICIAL_USERS];
  saveServerStore();
}

function saveServerStore() {
  try {
    const payload = {
      ok: true,
      source: 'vaharai_ds_office',
      updatedAt: new Date().toISOString(),
      letters: serverLetters,
      users: serverUsers,
    };
    fs.writeFileSync(SERVER_STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('[cloud-sync] Error saving server store:', err);
  }
}

// Initial load on server module startup
loadServerStore();


export const OFFICIAL_APPS_SCRIPT_CODE = `/**
 * Divisional Secretariat - Koralaipattu North, Vaharai
 * Mail Management System - Google Apps Script (Code.gs)
 * High-Speed Google Drive JSON Storage + Dynamic Header-Mapped Google Sheets
 */

// Your Google Drive JSON File ID (vaharai_ds_letter.json)
var DRIVE_FILE_ID = "1hp1cpRYvwRPC00OscMK-s5LmsHy-KiNM";

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || "get_all";
  var mode = (e && e.parameter && e.parameter.mode) || "";
  var targetFileId = (e && e.parameter && e.parameter.file_id) || DRIVE_FILE_ID;

  if (type === "ping") {
    return ContentService.createTextOutput(JSON.stringify({ ok: true, status: "connected", result: "success", mode: mode }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // 1. ULTRA-FAST GOOGLE DRIVE JSON READ (~0.3s - 0.8s)
  if (type === "get_drive_json" || mode === "drive_json") {
    try {
      if (targetFileId) {
        var file = DriveApp.getFileById(targetFileId);
        var content = file.getBlob().getDataAsString();
        if (content && content.trim() && content.trim() !== "{ [ ] }") {
          return ContentService.createTextOutput(content)
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
    } catch (err) {
      // Fallback to Sheet if Drive file is not accessible
    }
  }
  
  // 2. GOOGLE SHEETS READ (Fallback)
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var lettersSheet = ss.getSheetByName("Letters") || ss.getSheets()[0];
    var usersSheet = ss.getSheetByName("Users");
    
    var letters = lettersSheet ? lettersSheet.getDataRange().getValues() : [];
    var users = usersSheet ? usersSheet.getDataRange().getValues() : [];
    
    return ContentService.createTextOutput(JSON.stringify({ ok: true, letters: letters, users: users, source: "sheets" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
    var targetFileId = String(data.driveFileId || DRIVE_FILE_ID || "").trim();

    if (action === "PING" || action === "TEST_CONNECTION") {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: action }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // A. BULK SYNC / OVERWRITE TO GOOGLE DRIVE JSON FILE
    if (action === "SYNC_ALL_TO_DRIVE" || action === "SAVE_TO_DRIVE_JSON") {
      if (!targetFileId) {
        return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "DRIVE_FILE_ID_MISSING" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var driveFile = DriveApp.getFileById(targetFileId);
      var drivePayload = {
        ok: true,
        source: "vaharai_ds_office",
        updatedAt: new Date().toISOString(),
        letters: data.letters || [],
        users: data.users || []
      };
      driveFile.setContent(JSON.stringify(drivePayload, null, 2));
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        result: "success",
        action: action,
        letterCount: (data.letters || []).length,
        userCount: (data.users || []).length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // B. AUTOMATIC IN-PLACE SYNC TO GOOGLE DRIVE JSON FILE
    if (targetFileId) {
      try {
        var dFile = DriveApp.getFileById(targetFileId);
        var rawContent = dFile.getBlob().getDataAsString();
        var dData = { letters: [], users: [] };
        try {
          if (rawContent && rawContent.trim() && rawContent.trim() !== "{ [ ] }") {
            var parsed = JSON.parse(rawContent);
            if (Array.isArray(parsed)) dData.letters = parsed;
            else {
              dData.letters = Array.isArray(parsed.letters) ? parsed.letters : [];
              dData.users = Array.isArray(parsed.users) ? parsed.users : [];
            }
          }
        } catch(pe) {}

        if (action === "ADD_LETTER") {
          var newLtr = data.extraData || data;
          dData.letters.unshift(newLtr);
          dData.updatedAt = new Date().toISOString();
          dFile.setContent(JSON.stringify(dData, null, 2));
        } else if (action === "UPDATE_LETTER" || action === "UPDATE_STATUS" || action === "UPDATE_ACTION") {
          var id = String(data.id || "").trim();
          var origNo = String(data.originalNo || "").trim();
          var updatedLtr = data.extraData || data;
          var found = false;
          for (var li = 0; li < dData.letters.length; li++) {
            var item = dData.letters[li];
            if ((id && String(item.id) === id) || (origNo && String(item.originalNo) === origNo)) {
              dData.letters[li] = Object.assign({}, item, updatedLtr);
              found = true;
              break;
            }
          }
          if (!found) dData.letters.unshift(updatedLtr);
          dData.updatedAt = new Date().toISOString();
          dFile.setContent(JSON.stringify(dData, null, 2));
        } else if (action === "DELETE_LETTER") {
          var id = String(data.id || "").trim();
          var origNo = String(data.originalNo || "").trim();
          dData.letters = dData.letters.filter(function(l) {
            return !((id && String(l.id) === id) || (origNo && String(l.originalNo) === origNo));
          });
          dData.updatedAt = new Date().toISOString();
          dFile.setContent(JSON.stringify(dData, null, 2));
        }
      } catch (driveErr) {
        // Continue to Sheet backup
      }
    }

    // C. GOOGLE SHEETS DYNAMIC HEADER UPDATES (Dual Storage)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var lettersSheet = ss.getSheetByName("Letters") || ss.getSheets()[0];
    
    if (lettersSheet) {
      var lastCol = lettersSheet.getLastColumn();
      var headers = lastCol > 0 ? lettersSheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      var colMap = {};
      for (var c = 0; c < headers.length; c++) {
        var hKey = String(headers[c] || "").trim().toLowerCase().replace(/[\\\\s_\\\\-]+/g, "");
        if (hKey) colMap[hKey] = c + 1;
      }

      function getCol() {
        for (var a = 0; a < arguments.length; a++) {
          var k = String(arguments[a]).toLowerCase().replace(/[\\\\s_\\\\-]+/g, "");
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

      // ADD LETTER TO SHEET
      if (action === "ADD_LETTER") {
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
      }
      
      // UPDATE LETTER IN SHEET
      if (action === "UPDATE_LETTER" || action === "UPDATE_STATUS" || action === "UPDATE_ACTION") {
        var id = String(data.id || "").trim();
        var origNo = String(data.originalNo || "").trim();
        var rows = lettersSheet.getDataRange().getValues();
        var foundRowIndex = -1;
        
        for (var i = 1; i < rows.length; i++) {
          var rowId = String(rows[i][colId - 1] || rows[i][0] || "").trim();
          var rowOrig = String(rows[i][colOrigNo - 1] || rows[i][1] || "").trim();
          if ((id && rowId === id) || (origNo && rowOrig === origNo)) {
            foundRowIndex = i + 1;
            break;
          }
        }
        
        if (foundRowIndex > 0) {
          var rawAct = data.actionStatus || data.letterAction || data.ActionStatus || data.Action;
          var actionVal = sanitizeAction(rawAct);

          if (colAction > 0 && actionVal) lettersSheet.getRange(foundRowIndex, colAction).setValue(actionVal);
          if (colExtra > 0 && data.extraData !== undefined) {
            var safeExtra = typeof data.extraData === "string" ? data.extraData : JSON.stringify(data.extraData);
            lettersSheet.getRange(foundRowIndex, colExtra).setValue(safeExtra);
          }
          if (colFwdDivs > 0 && data.forwardedDivisions !== undefined) {
            var safeFwdDivs = Array.isArray(data.forwardedDivisions) ? JSON.stringify(data.forwardedDivisions) : String(data.forwardedDivisions);
            lettersSheet.getRange(foundRowIndex, colFwdDivs).setValue(safeFwdDivs);
          }
          if (colFwdTo > 0 && data.forwardedTo !== undefined) {
            var safeFwdTo = Array.isArray(data.forwardedTo) ? JSON.stringify(data.forwardedTo) : String(data.forwardedTo);
            lettersSheet.getRange(foundRowIndex, colFwdTo).setValue(safeFwdTo);
          }
          if (colReply > 0 && data.replyResponse !== undefined) {
            lettersSheet.getRange(foundRowIndex, colReply).setValue(String(data.replyResponse));
          }
        }
      }
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

export interface CloudStorageConfig {
  storageMode: 'drive_json' | 'sheets';
  driveFileId: string;
  webAppUrl: string;
  updatedAt?: string;
}

// Global in-memory configuration store that survives across requests and runs safely on serverless / Vercel
let inMemoryConfig: CloudStorageConfig = {
  storageMode: 'drive_json',
  driveFileId: DEFAULT_DRIVE_FILE_ID,
  webAppUrl: process.env.GOOGLE_SHEETS_WEB_APP_URL || DEFAULT_WEB_APP_URL,
  updatedAt: new Date().toISOString(),
};

// In-memory cache for fast read responses
let cloudDataCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 15000;

export const getStoredConfig = (): CloudStorageConfig => {
  return { ...inMemoryConfig };
};

export const setStoredConfig = (partial: Partial<CloudStorageConfig>): CloudStorageConfig => {
  inMemoryConfig = {
    ...inMemoryConfig,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  return { ...inMemoryConfig };
};

/**
 * Downloads and parses Google Drive JSON file directly via Google's CDN with latency measurement.
 * Never throws an uncaught error.
 */
export async function fetchGoogleDriveJson(driveFileId: string): Promise<{
  ok: boolean;
  latencyMs: number;
  statusCode: number;
  uninitialized?: boolean;
  letters?: any[];
  users?: any[];
  updatedAt?: string;
  error?: string;
  message?: string;
}> {
  const fileId = String(driveFileId || DEFAULT_DRIVE_FILE_ID).trim();
  const startTime = Date.now();

  const candidateUrls = [
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'VaharaiDSMailSystem/2.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const text = await res.text();

      // Check if file is private or access denied
      if (res.status === 403 || text.includes('accounts.google.com') || text.includes('You need access')) {
        return {
          ok: false,
          statusCode: 403,
          latencyMs,
          error: 'ACCESS_DENIED',
          message: 'Google Drive கோப்பிற்கான அனுமதி மறுக்கப்பட்டது (403 Forbidden). "Anyone with the link can edit/view" என மாற்றவும்.',
        };
      }

      const trimmed = text.trim();

      // Handle uninitialized / placeholder files such as "{ [ ] }" or empty
      if (!trimmed || trimmed === '{ [ ] }' || trimmed === '{[]}' || trimmed === '[]' || trimmed === '{}') {
        return {
          ok: true,
          statusCode: res.status,
          latencyMs,
          uninitialized: true,
          letters: [],
          users: [],
          message: 'Google Drive JSON கோப்பு தயார் நிலையில் உள்ளது.',
        };
      }

      // Try parsing JSON
      try {
        const parsed = JSON.parse(text);
        let letters: any[] = [];
        let users: any[] = [];

        if (Array.isArray(parsed)) {
          letters = parsed;
        } else if (parsed && typeof parsed === 'object') {
          letters = Array.isArray(parsed.letters) ? parsed.letters : [];
          users = Array.isArray(parsed.users) ? parsed.users : [];
        }

        return {
          ok: true,
          statusCode: 200,
          latencyMs,
          uninitialized: letters.length === 0 && users.length === 0,
          letters,
          users,
          updatedAt: parsed?.updatedAt,
          message: `Google Drive JSON கோப்பு வெற்றிகரமாக பெறப்பட்டது (${latencyMs}ms, ${letters.length} கடிதங்கள்).`,
        };
      } catch {
        return {
          ok: true,
          statusCode: 200,
          latencyMs,
          uninitialized: true,
          letters: [],
          users: [],
          message: 'Drive கோப்பில் உள்ள தகவல்கள் புதிய வடிவில் புதுப்பிக்கப்பட வேண்டும் (Click "Upload to Drive").',
        };
      }
    } catch {
      // Continue to next candidate URL
    }
  }

  return {
    ok: false,
    statusCode: 200, // Return 200 with ok: false so Vercel doesn't show 500 error in browser console!
    latencyMs: Date.now() - startTime,
    error: 'DRIVE_FETCH_FAILED',
    message: 'Google Drive கோப்பை நேரடியாக அணுக முடியவில்லை.',
  };
}

/**
 * Tests connection to Google Apps Script Web App
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
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(`${cleanUrl}?type=ping&t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();

    const isGoogleLogin =
      res.status === 403 ||
      text.includes('accounts.google.com') ||
      text.includes('You need access') ||
      text.includes('ServiceLogin');

    if (isGoogleLogin) {
      return {
        ok: false,
        statusCode: 403,
        errorType: 'ACCESS_DENIED',
        url: cleanUrl,
        message:
          'Google Apps Script அனுமதி மறுக்கப்பட்டது (403 Forbidden). Web App Deploy அமைப்பில் "Who has access" என்பதை "Anyone" என அமைக்க வேண்டும்.',
      };
    }

    try {
      const json = JSON.parse(text);
      if (json && (json.ok !== undefined || json.status === 'connected' || json.result === 'success')) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Apps Script வெற்றிகரமாக இணைக்கப்பட்டுள்ளது!',
          data: json,
        };
      }
    } catch {
      if (res.status === 200) {
        return {
          ok: true,
          statusCode: 200,
          url: cleanUrl,
          message: 'Google Apps Script வெற்றிகரமாக பதிலளித்தது.',
        };
      }
    }

    return {
      ok: false,
      statusCode: res.status,
      errorType: 'INVALID_RESPONSE',
      url: cleanUrl,
      message: 'Google Apps Script பதில் செல்லுபடியாகவில்லை.',
    };
  } catch (err: any) {
    return {
      ok: false,
      statusCode: 200,
      errorType: 'NETWORK_ERROR',
      url: cleanUrl,
      message: `Apps Script இணைப்பு தோல்வி: ${err?.message || 'Network error'}`,
    };
  }
}

/**
 * Master HTTP Handler for Express and Vercel Serverless Functions
 * Completely wrapped in try/catch to NEVER return 500 error!
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, X-Web-App-Url, X-Drive-File-Id, X-Storage-Mode'
    );

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const config = getStoredConfig();
    const effectiveMode = (
      (req.headers['x-storage-mode'] as string) ||
      (req.query.mode as string) ||
      config.storageMode ||
      'drive_json'
    ).trim();

    const effectiveDriveFileId = (
      (req.headers['x-drive-file-id'] as string) ||
      (req.query.driveFileId as string) ||
      config.driveFileId ||
      DEFAULT_DRIVE_FILE_ID
    ).trim();

    const effectiveWebAppUrl = (
      (req.headers['x-web-app-url'] as string) ||
      (req.query.webAppUrl as string) ||
      config.webAppUrl ||
      DEFAULT_WEB_APP_URL
    ).trim();

    // Test Google Drive JSON Speed & Status Endpoint
    if (req.query.type === 'test_drive') {
      const driveResult = await fetchGoogleDriveJson(effectiveDriveFileId);
      res.status(200).json({
        ok: driveResult.ok,
        mode: 'drive_json',
        driveFileId: effectiveDriveFileId,
        latencyMs: driveResult.latencyMs,
        statusCode: driveResult.statusCode,
        uninitialized: driveResult.uninitialized,
        letterCount: driveResult.letters?.length ?? 0,
        userCount: driveResult.users?.length ?? 0,
        message: driveResult.message,
      });
      return;
    }

    // Get Stored Cloud Storage Config Endpoint
    if (req.query.type === 'get_config') {
      res.status(200).json({
        ok: true,
        config: getStoredConfig(),
      });
      return;
    }

    // Get Official Apps Script Code Endpoint
    if (req.query.type === 'get_script') {
      res.status(200).json({
        ok: true,
        code: OFFICIAL_APPS_SCRIPT_CODE,
        driveFileId: effectiveDriveFileId,
      });
      return;
    }

    // Test / Diagnosis Endpoint
    if (req.query.type === 'test' || req.query.type === 'status') {
      if (effectiveMode === 'drive_json') {
        const driveTest = await fetchGoogleDriveJson(effectiveDriveFileId);
        res.status(200).json({
          ok: driveTest.ok,
          mode: 'drive_json',
          latencyMs: driveTest.latencyMs,
          statusCode: driveTest.statusCode,
          message: driveTest.message,
          letterCount: driveTest.letters?.length ?? 0,
        });
        return;
      } else {
        const testResult = await testConnection(effectiveWebAppUrl);
        res.status(200).json(testResult);
        return;
      }
    }

    // Direct JSON Download Endpoint for all users
    if (req.query.type === 'download_json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="vaharai_ds_letter.json"');
      res.status(200).send(
        JSON.stringify(
          {
            ok: true,
            source: 'vaharai_ds_office',
            exportedAt: new Date().toISOString(),
            letterCount: serverLetters.length,
            userCount: serverUsers.length,
            letters: serverLetters,
            users: serverUsers,
          },
          null,
          2
        )
      );
      return;
    }

    // GET: Fetch letters and users
    if (req.method === 'GET') {
      const forceFresh = req.query.force === 'true' || req.query.fresh === 'true';

      // 1. FAST GOOGLE DRIVE & SERVER JSON MODE (~5ms - 300ms)
      if (effectiveMode === 'drive_json') {
        if (!forceFresh && cloudDataCache && Date.now() - cloudDataCache.timestamp < CACHE_TTL_MS) {
          res.status(200).json({ ok: true, cached: true, ...cloudDataCache.data });
          return;
        }

        const driveRes = await fetchGoogleDriveJson(effectiveDriveFileId);

        // If valid letters exist on Google Drive, merge into server store safely without deleting new letters
        if (driveRes.ok && Array.isArray(driveRes.letters) && driveRes.letters.length > 0 && !driveRes.uninitialized) {
          const existingKeys = new Set(serverLetters.map((l: any) => String(l.id || `${l.originalNo}-${l.date}`).trim()));
          let addedCount = 0;
          for (const dl of driveRes.letters) {
            const repaired = repairLetterRecord(dl);
            if (!repaired) continue;
            const key = String(repaired.id || `${repaired.originalNo}-${repaired.date}`).trim();
            if (key && !existingKeys.has(key)) {
              serverLetters.push(repaired);
              existingKeys.add(key);
              addedCount++;
            }
          }
          if (Array.isArray(driveRes.users) && driveRes.users.length) {
            const userKeys = new Set(serverUsers.map((u: any) => String(u.User_ID || u.id).trim().toLowerCase()));
            for (const du of driveRes.users) {
              const ukey = String(du.User_ID || du.id || '').trim().toLowerCase();
              if (ukey && !userKeys.has(ukey)) {
                serverUsers.push(du);
                userKeys.add(ukey);
              }
            }
          }
          if (addedCount > 0) {
            saveServerStore();
          }
        }

        // Return latest serverLetters (which includes baseline + any letters uploaded from any browser)
        const payload = {
          ok: true,
          mode: 'drive_json',
          source: driveRes.ok && !driveRes.uninitialized ? 'drive_json' : 'server_json',
          latencyMs: driveRes.latencyMs || 6,
          letters: serverLetters,
          users: serverUsers,
          updatedAt: new Date().toISOString(),
          message: `JSON சேமிப்பகத்திலிருந்து ${serverLetters.length} கடிதங்கள் வெற்றிகரமாகப் பெறப்பட்டன.`,
        };
        cloudDataCache = { data: payload, timestamp: Date.now() };
        res.status(200).json(payload);
        return;
      }

      // 2. GOOGLE SHEETS FALLBACK
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(`${effectiveWebAppUrl}?type=get_all&t=${Date.now()}`, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const rawText = await response.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          data = {};
        }

        res.status(200).json({
          ok: Boolean(data?.ok || data?.letters),
          mode: 'sheets',
          source: 'sheets',
          ...data,
        });
        return;
      } catch (err: any) {
        clearTimeout(timeout);
        // Fallback to serverLetters if Sheets is offline
        res.status(200).json({
          ok: true,
          offline: true,
          mode: 'sheets',
          message: err?.message || 'Sheets offline, served from server store',
          letters: serverLetters,
          users: serverUsers,
        });
        return;
      }
    }

    // POST: Write letter, save config, or bulk upload to Drive JSON
    if (req.method === 'POST') {
      cloudDataCache = null; // Invalidate cache

      // Action: Save Cloud Storage Config
      if (req.body?.action === 'SET_CONFIG' || req.body?.action === 'SET_CONFIG_URL') {
        const updated = setStoredConfig({
          storageMode: req.body.storageMode || (req.body.url ? 'sheets' : undefined),
          driveFileId: req.body.driveFileId,
          webAppUrl: req.body.url || req.body.webAppUrl,
        });
        res.status(200).json({ ok: true, config: updated });
        return;
      }

      // Action: Test Drive Connection via POST
      if (req.body?.action === 'TEST_DRIVE') {
        const driveRes = await fetchGoogleDriveJson(req.body.driveFileId || effectiveDriveFileId);
        res.status(200).json(driveRes);
        return;
      }

      // Action: Bulk Sync All to Google Drive JSON
      if (req.body?.action === 'SYNC_ALL_TO_DRIVE') {
        const targetUrl = effectiveWebAppUrl;
        const targetDriveId = req.body.driveFileId || effectiveDriveFileId;

        // 1. Immediately update server-side persistent store, preserving any images already saved
        if (Array.isArray(req.body.letters) && req.body.letters.length > 0) {
          const imgMap = new Map<string, string>();
          for (const sl of serverLetters) {
            if (sl && sl.id && sl.image) imgMap.set(sl.id, sl.image);
          }
          serverLetters = req.body.letters.map((l: any) => {
            const repaired = repairLetterRecord(l);
            if (!repaired) return null;
            if (!repaired.image && imgMap.has(repaired.id)) {
              repaired.image = imgMap.get(repaired.id);
            }
            return repaired;
          }).filter(Boolean);
        }
        if (Array.isArray(req.body.users) && req.body.users.length > 0) {
          serverUsers = req.body.users;
        }
        saveServerStore();

        // 2. Forward light payload (without bulky base64 images) to Google Apps Script in background
        const lightLettersForDrive = serverLetters.map((l) => {
          const { image, ...rest } = l;
          return rest;
        });

        fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'SYNC_ALL_TO_DRIVE',
            driveFileId: targetDriveId,
            letters: lightLettersForDrive,
            users: serverUsers,
          }),
        }).catch(() => {
          // Cloud backup in background
        });

        res.status(200).json({
          ok: true,
          driveFileId: targetDriveId,
          letterCount: serverLetters.length,
          message: `உள்ளூர் சேமிப்பகத்தில் உள்ள அனைத்து ${serverLetters.length} கடிதங்களும் JSON-இல் வெற்றிகரமாகப் பதிவேற்றப்பட்டது!`,
        });
        return;
      }

      // In-place updates to server-side JSON store for immediate multi-browser sync
      const act = String(req.body?.action || '').toUpperCase().trim();
      const payloadLetter = req.body?.extraData || req.body;

      if (act === 'ADD_LETTER' && payloadLetter) {
        const ltrId = String(payloadLetter.id || req.body?.id || `LTR-${Date.now()}`);
        const ltrOrig = String(payloadLetter.originalNo || req.body?.originalNo || '');
        serverLetters = serverLetters.filter(
          (l) => !(String(l.id) === ltrId || (ltrOrig && String(l.originalNo) === ltrOrig))
        );
        const toAdd = repairLetterRecord({ ...payloadLetter, id: ltrId });
        if (toAdd) serverLetters.unshift(toAdd);
        saveServerStore();
      } else if (
        (act === 'UPDATE_LETTER' || act === 'UPDATE_STATUS' || act === 'UPDATE_ACTION') &&
        payloadLetter
      ) {
        const ltrId = String(req.body?.id || payloadLetter.id || '');
        const ltrOrig = String(req.body?.originalNo || payloadLetter.originalNo || '');
        let updated = false;
        serverLetters = serverLetters.map((l) => {
          if ((ltrId && String(l.id) === ltrId) || (ltrOrig && String(l.originalNo) === ltrOrig)) {
            updated = true;
            const healed = repairLetterRecord({ ...l, ...payloadLetter });
            return healed || { ...l, ...payloadLetter };
          }
          return l;
        });
        if (!updated && (ltrId || ltrOrig)) {
          const toAdd = repairLetterRecord(payloadLetter);
          if (toAdd) serverLetters.unshift(toAdd);
        }
        saveServerStore();
      } else if (act === 'DELETE_LETTER') {
        const ltrId = String(req.body?.id || '');
        if (ltrId) {
          serverLetters = serverLetters.filter((l) => String(l.id) !== ltrId);
          saveServerStore();
        }
      } else if (act === 'SYNC_CLIENT_BATCH' && Array.isArray(req.body?.letters)) {
        let addedCount = 0;
        const existingKeys = new Set(serverLetters.map((l: any) => String(l.id || `${l.originalNo}-${l.date}`).trim()));
        for (const cl of req.body.letters) {
          const repaired = repairLetterRecord(cl);
          if (!repaired) continue;
          const key = String(repaired.id || `${repaired.originalNo}-${repaired.date}`).trim();
          if (key && !existingKeys.has(key)) {
            serverLetters.unshift(repaired);
            existingKeys.add(key);
            addedCount++;
          }
        }
        if (addedCount > 0) {
          saveServerStore();
        }
        res.status(200).json({
          ok: true,
          addedCount,
          totalCount: serverLetters.length,
          message: `${addedCount} புதிய கடிதங்கள் சேவையகத்தில் ஒருங்கிணைக்கப்பட்டன.`,
        });
        return;
      }

      // Forward to Google Apps Script in background (optional cloud backup, non-blocking)
      try {
        const forwardPayload = {
          ...req.body,
          driveFileId: effectiveDriveFileId,
          storageMode: effectiveMode,
        };

        // Asynchronously forward to Google Apps Script so client doesn't wait 12s
        fetch(effectiveWebAppUrl, {
          method: 'POST',
          redirect: 'follow',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(forwardPayload),
        }).catch(() => {
          // Google Apps Script is secondary backup; server store is primary authority
        });
      } catch {
        // Ignore background forward dispatch errors
      }

      res.status(200).json({
        ok: true,
        message: 'கடிதம் சேவையகத்தில் உடனடியாகப் பாதுகாப்பாகப் பதிவு செய்யப்பட்டது (Saved to Server Store)',
      });
      return;
    }

    res.status(200).json({ ok: false, error: 'Method not supported' });
  } catch (fatalError: any) {
    console.error('[cloud-sync] Fatal error safely handled:', fatalError);
    if (!res.headersSent) {
      res.status(200).json({
        ok: false,
        offline: true,
        errorType: 'SERVER_EXCEPTION',
        message: String(fatalError?.message || 'Server exception caught safely'),
        letters: [],
        users: [],
      });
    }
  }
}
