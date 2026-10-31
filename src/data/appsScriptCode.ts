/**
 * Divisional Secretariat - Koralaipattu North, Vaharai
 * Official Mail Management System - Google Apps Script (Code.gs)
 * Dual Storage Architecture: Ultra-Fast Google Drive JSON + Google Sheets
 */

export const DEFAULT_DRIVE_FILE_ID = '1hp1cpRYvwRPC00OscMK-s5LmsHy-KiNM';

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

    // A2. BULK RE-ALIGN & REWRITE LETTERS SHEET (Full Alignment Fix)
    if (action === "SYNC_ALL_TO_SHEET" || action === "FIX_SHIFTED_ROWS" || action === "REPAIR_SHEET_ROWS") {
      var sSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var lSheet = sSpreadsheet.getSheetByName("Letters") || sSpreadsheet.getSheets()[0];
      if (lSheet) {
        var cleanLetters = data.letters || [];
        var standardHeaders = [
          "ID", "OriginalNo", "Date", "DispatchedDate", "Post Type",
          "RegisteredPostNo", "InwardNo", "FromWhom", "Subject", "Division",
          "ForwardedDivisions", "ActionStatus", "ForwardedTo", "ReplyResponse", "ExtraData"
        ];
        var outRows = [standardHeaders];
        for (var si = 0; si < cleanLetters.length; si++) {
          var lItem = cleanLetters[si];
          var sFwdDivs = Array.isArray(lItem.forwardedDivisions) ? JSON.stringify(lItem.forwardedDivisions) : String(lItem.forwardedDivisions || "");
          var sFwdTo = Array.isArray(lItem.forwardedTo) ? JSON.stringify(lItem.forwardedTo) : String(lItem.forwardedTo || "");
          var sExtra = typeof lItem.extraData === "string" ? lItem.extraData : JSON.stringify({
            fileNo: lItem.fileNo || "",
            image: lItem.image || "",
            chats: lItem.chats || [],
            registeredBy: lItem.registeredBy || "",
            registeredByName: lItem.registeredByName || "",
            createdAt: lItem.createdAt || ""
          });

          outRows.push([
            lItem.id || ("LTR-" + (si + 1)),
            lItem.originalNo || "",
            lItem.date || "",
            lItem.dispatchedDate || lItem.date || "",
            lItem.letterType || lItem.postType || "Normal Post",
            lItem.registeredPostNo || "No",
            lItem.inwardNo || "-",
            lItem.fromWhom || "-",
            lItem.subject || "-",
            lItem.division || "பொதுப் பிரிவு (General)",
            sFwdDivs,
            lItem.action || lItem.actionStatus || "Not Yet Viewed",
            sFwdTo,
            lItem.replyResponse || "",
            sExtra
          ]);
        }
        lSheet.clearContents();
        if (outRows.length > 0) {
          lSheet.getRange(1, 1, outRows.length, standardHeaders.length).setValues(outRows);
        }
        return ContentService.createTextOutput(JSON.stringify({
          ok: true,
          result: "success",
          action: action,
          rowCount: outRows.length - 1
        })).setMimeType(ContentService.MimeType.JSON);
      }
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
        } else if (action === "ADD_USER" || action === "UPDATE_USER") {
          var uid = String(data.User_ID || data.id || "").trim().toLowerCase();
          var userObj = data.extraData || data;
          var uFound = false;
          for (var ui = 0; ui < dData.users.length; ui++) {
            if (String(dData.users[ui].User_ID || "").trim().toLowerCase() === uid) {
              dData.users[ui] = Object.assign({}, dData.users[ui], userObj);
              uFound = true;
              break;
            }
          }
          if (!uFound) dData.users.push(userObj);
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
    var usersSheet = ss.getSheetByName("Users");
    
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

      // DELETE LETTER IN SHEET
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
