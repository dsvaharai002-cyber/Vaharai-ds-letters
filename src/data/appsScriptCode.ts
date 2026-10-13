/**
 * Divisional Secretariat - Koralaipattu North, Vaharai
 * Official Mail Management System - Google Apps Script (Code.gs)
 * Aligned with the 15-Column Google Sheet Structure
 */

export const OFFICIAL_APPS_SCRIPT_CODE = `/**
 * Divisional Secretariat - Koralaipattu North, Vaharai
 * Mail Management System - Google Apps Script (Code.gs)
 * 15-Column Aligned Edition (No Shifting, Fast In-Place Updates)
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
    
    // 1. ADD NEW LETTER (Strict 15-Column Schema)
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
        
      var row = [
        data.id || ("LTR-" + Date.now()),                                            // 1: ID
        data.originalNo || "",                                                        // 2: OriginalNo
        data.date || "",                                                              // 3: Date
        data.dispatchedDate || data.date || "",                                       // 4: DispatchedDate
        data.letterType || data.postType || "Registered Post",                         // 5: Post Type
        data.registeredPostNo || "No",                                                // 6: RegisteredPostNo
        data.inwardNo || "",                                                          // 7: InwardNo
        data.fromWhom || "",                                                          // 8: FromWhom
        data.subject || "",                                                           // 9: Subject
        data.division || "",                                                          // 10: Division
        safeFwdDivs,                                                                  // 11: ForwardedDivisions
        data.actionStatus || data.action || data.letterAction || "Not Yet Viewed",     // 12: ActionStatus
        safeFwdTo,                                                                    // 13: ForwardedTo
        data.replyResponse || "",                                                     // 14: ReplyResponse
        safeExtra                                                                     // 15: ExtraData
      ];
      lettersSheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "ADD_LETTER" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. UPDATE LETTER (In-Place 15-Column Update, Preserves Row Order & Exact Column Slots)
    if (action === "UPDATE_LETTER" || action === "UPDATE_STATUS" || action === "UPDATE_ACTION") {
      var id = String(data.id || "").trim();
      var origNo = String(data.originalNo || "").trim();
      var rows = lettersSheet.getDataRange().getValues();
      var foundRowIndex = -1;
      
      for (var i = 1; i < rows.length; i++) {
        var rowId = String(rows[i][0] || "").trim();
        var rowOrig = String(rows[i][1] || "").trim();
        if ((id && rowId === id) || (origNo && rowOrig === origNo)) {
          foundRowIndex = i + 1; // 1-based index in sheet
          break;
        }
      }
      
      if (foundRowIndex > 0) {
        var existing = rows[foundRowIndex - 1];
        var actionVal = data.actionStatus || data.action || data.letterAction || existing[11] || "Not Yet Viewed";
        var safeFwdDivs = data.forwardedDivisions !== undefined
          ? (Array.isArray(data.forwardedDivisions) ? JSON.stringify(data.forwardedDivisions) : String(data.forwardedDivisions))
          : existing[10];
        var safeFwdTo = data.forwardedTo !== undefined
          ? (Array.isArray(data.forwardedTo) ? JSON.stringify(data.forwardedTo) : String(data.forwardedTo))
          : existing[12];
        var safeExtra = data.extraData !== undefined
          ? (typeof data.extraData === "string" ? data.extraData : JSON.stringify(data.extraData))
          : existing[14];
          
        var updatedRow = [
          existing[0] || id,                                                          // 1: ID
          data.originalNo !== undefined ? data.originalNo : existing[1],              // 2: OriginalNo
          data.date !== undefined ? data.date : existing[2],                          // 3: Date
          data.dispatchedDate !== undefined ? data.dispatchedDate : existing[3],      // 4: DispatchedDate
          (data.letterType || data.postType) !== undefined ? (data.letterType || data.postType) : existing[4], // 5: Post Type
          data.registeredPostNo !== undefined ? data.registeredPostNo : existing[5],  // 6: RegisteredPostNo
          data.inwardNo !== undefined ? data.inwardNo : existing[6],                  // 7: InwardNo
          data.fromWhom !== undefined ? data.fromWhom : existing[7],                  // 8: FromWhom
          data.subject !== undefined ? data.subject : existing[8],                    // 9: Subject
          data.division !== undefined ? data.division : existing[9],                  // 10: Division
          safeFwdDivs,                                                                // 11: ForwardedDivisions
          actionVal,                                                                  // 12: ActionStatus
          safeFwdTo,                                                                  // 13: ForwardedTo
          data.replyResponse !== undefined ? data.replyResponse : existing[13],       // 14: ReplyResponse
          safeExtra                                                                   // 15: ExtraData
        ];
        lettersSheet.getRange(foundRowIndex, 1, 1, 15).setValues([updatedRow]);
        return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "UPDATE_LETTER", row: foundRowIndex }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        // Fallback: append if not yet present
        var row = [
          id || ("LTR-" + Date.now()),
          origNo,
          data.date || "",
          data.dispatchedDate || data.date || "",
          data.letterType || data.postType || "Registered Post",
          data.registeredPostNo || "No",
          data.inwardNo || "",
          data.fromWhom || "",
          data.subject || "",
          data.division || "",
          Array.isArray(data.forwardedDivisions) ? JSON.stringify(data.forwardedDivisions) : String(data.forwardedDivisions || ""),
          data.actionStatus || data.action || "Not Yet Viewed",
          Array.isArray(data.forwardedTo) ? JSON.stringify(data.forwardedTo) : String(data.forwardedTo || ""),
          data.replyResponse || "",
          typeof data.extraData === "string" ? data.extraData : JSON.stringify(data.extraData || {})
        ];
        lettersSheet.appendRow(row);
        return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "ADD_LETTER" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 3. DELETE LETTER
    if (action === "DELETE_LETTER") {
      var id = String(data.id || "").trim();
      var origNo = String(data.originalNo || "").trim();
      var rows = lettersSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if ((id && String(rows[i][0] || "").trim() === id) || (origNo && String(rows[i][1] || "").trim() === origNo)) {
          lettersSheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ ok: true, result: "success", action: "DELETE_LETTER" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. USERS MANAGEMENT
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
