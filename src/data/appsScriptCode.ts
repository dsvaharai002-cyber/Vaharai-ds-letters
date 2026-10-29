/**
 * Divisional Secretariat - Koralaipattu North, Vaharai
 * Official Mail Management System - Google Apps Script (Code.gs)
 * Dynamic Header-Mapped Architecture (Zero Column Shifting)
 */

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
