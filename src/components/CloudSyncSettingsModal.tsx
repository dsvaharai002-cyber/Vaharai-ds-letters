import React, { useState } from 'react';
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  X,
  UploadCloud,
  Code2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import { Letter } from '../types';

interface CloudSyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  onSaveUrl: (newUrl: string) => Promise<boolean>;
  onTestConnection: (urlToTest?: string) => Promise<{
    ok: boolean;
    statusCode?: number;
    errorType?: string;
    message?: string;
    letterCount?: number;
  }>;
  letters: Letter[];
  onSyncAllLetters: (onProgress: (done: number, total: number) => void) => Promise<{
    success: number;
    failed: number;
  }>;
  cloudStatus: 'connected' | 'error_403' | 'offline' | 'checking';
  cloudMessage: string;
}

export const APPS_SCRIPT_CODE = `/**
 * Vaharai Divisional Secretariat - Mail Management System
 * Google Apps Script (Code.gs)
 *
 * அறிவுறுத்தல்கள்:
 * 1. Google Sheet -> Extensions -> Apps Script திறக்கவும்.
 * 2. இக்குறியீட்டை Code.gs-ல் ஒட்டி Save செய்யவும்.
 * 3. Deploy -> New deployment -> Web app தேர்ந்தெடுக்கவும்.
 * 4. Execute as: Me
 * 5. **மிக முக்கியம்**: Who has access: Anyone (அனைவருக்கும்) என அமைக்கவும்!
 */

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || 'get_all';
  
  if (type === 'ping' || type === 'test') {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      status: 'connected',
      message: 'Vaharai DS Mail System API connected successfully!'
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lettersSheet = getOrCreateSheet(ss, 'Letters', getLetterHeaders());
  var usersSheet = getOrCreateSheet(ss, 'Users', getUserHeaders());
  
  var lettersData = lettersSheet.getDataRange().getValues();
  var usersData = usersSheet.getDataRange().getValues();
  
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    letters: lettersData,
    users: usersData
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '';
    var data = {};
    try {
      data = JSON.parse(raw);
    } catch(err) {
      data = {};
    }
    
    var action = data.action || '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === 'ADD_LETTER') {
      var sheet = getOrCreateSheet(ss, 'Letters', getLetterHeaders());
      var row = letterToRow(data);
      sheet.appendRow(row);
      SpreadsheetApp.flush();
      return jsonResponse({ ok: true, action: action, id: data.id || '' });
    }
    
    if (action === 'UPDATE_LETTER') {
      var sheet = getOrCreateSheet(ss, 'Letters', getLetterHeaders());
      var id = String(data.id || '').trim();
      var originalNo = String(data.originalNo || '').trim();
      var values = sheet.getDataRange().getValues();
      var rowIndex = -1;
      
      for (var i = 1; i < values.length; i++) {
        if ((id && String(values[i][0]).trim() === id) || (originalNo && String(values[i][1]).trim() === originalNo)) {
          rowIndex = i + 1;
          break;
        }
      }
      
      var row = letterToRow(data);
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
      } else {
        sheet.appendRow(row);
      }
      SpreadsheetApp.flush();
      return jsonResponse({ ok: true, action: action, id: id });
    }

    if (action === 'DELETE_LETTER') {
      var sheet = getOrCreateSheet(ss, 'Letters', getLetterHeaders());
      var id = String(data.id || '').trim();
      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (id && String(values[i][0]).trim() === id) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      SpreadsheetApp.flush();
      return jsonResponse({ ok: true, action: action, id: id });
    }
    
    if (action === 'ADD_USER' || action === 'UPDATE_USER') {
      var sheet = getOrCreateSheet(ss, 'Users', getUserHeaders());
      var uid = String(data.User_ID || data.id || '').trim().toLowerCase();
      var values = sheet.getDataRange().getValues();
      var rowIndex = -1;
      for (var u = 1; u < values.length; u++) {
        if (String(values[u][0]).trim().toLowerCase() === uid) {
          rowIndex = u + 1;
          break;
        }
      }
      var userRow = userToRow(data);
      if (rowIndex > 0 && action === 'UPDATE_USER') {
        sheet.getRange(rowIndex, 1, 1, userRow.length).setValues([userRow]);
      } else {
        sheet.appendRow(userRow);
      }
      SpreadsheetApp.flush();
      return jsonResponse({ ok: true, action: action, User_ID: uid });
    }
    
    if (action === 'DELETE_USER') {
      var sheet = getOrCreateSheet(ss, 'Users', getUserHeaders());
      var uid = String(data.User_ID || data.id || '').trim().toLowerCase();
      var values = sheet.getDataRange().getValues();
      for (var d = 1; d < values.length; d++) {
        if (String(values[d][0]).trim().toLowerCase() === uid) {
          sheet.deleteRow(d + 1);
          break;
        }
      }
      SpreadsheetApp.flush();
      return jsonResponse({ ok: true, action: action });
    }
    
    return jsonResponse({ ok: true, note: 'Processed' });
  } catch(error) {
    return jsonResponse({ ok: false, error: error.toString() });
  }
}

function letterToRow(d) {
  var extra = d.extraData || {};
  var fwdDivs = d.forwardedDivisions || extra.forwardedDivisions || [];
  var fwdTo = d.forwardedTo || extra.forwardedTo || [];
  return [
    String(d.id || extra.id || ''),
    String(d.originalNo || extra.originalNo || ''),
    String(d.date || extra.date || ''),
    String(d.dispatchedDate || extra.dispatchedDate || d.date || ''),
    String(d.letterType || extra.letterType || 'Registered Post'),
    String(d.registeredPostNo || extra.registeredPostNo || 'No'),
    String(d.inwardNo || extra.inwardNo || ''),
    String(d.fromWhom || extra.fromWhom || ''),
    String(d.subject || extra.subject || ''),
    String(d.division || extra.division || ''),
    Array.isArray(fwdDivs) ? fwdDivs.join(', ') : String(fwdDivs),
    Array.isArray(fwdTo) ? fwdTo.join(', ') : String(fwdTo),
    String(d.actionStatus || d.action || extra.action || 'Not Yet Viewed'),
    String(d.replyResponse || extra.replyResponse || ''),
    String(d.fileNo || extra.fileNo || ''),
    JSON.stringify(extra)
  ];
}

function userToRow(u) {
  var extra = u.extraData || {};
  var divs = u.assignedDivisions || extra.assignedDivisions || [];
  var offs = u.assignedOfficers || extra.assignedOfficers || [];
  return [
    String(u.User_ID || u.id || ''),
    String(u.Password || ''),
    String(u.Name || ''),
    String(u.Role || 'User'),
    String(u.Division || ''),
    String(u.Status || 'Active'),
    Array.isArray(divs) ? divs.join(', ') : String(divs),
    Array.isArray(offs) ? offs.join(', ') : String(offs),
    JSON.stringify(extra)
  ];
}

function getLetterHeaders() {
  return [
    'ID', 'OriginalNo', 'Date', 'DispatchedDate', 'Post Type',
    'RegisteredPostNo', 'InwardNo', 'FromWhom', 'Subject',
    'Division', 'ForwardedDivisions', 'ForwardedTo', 'ActionStatus',
    'ReplyResponse', 'FileNo', 'ExtraData'
  ];
}

function getUserHeaders() {
  return [
    'User_ID', 'Password', 'Name', 'Role', 'Division',
    'Status', 'AssignedDivisions', 'AssignedOfficers', 'ExtraData'
  ];
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export const CloudSyncSettingsModal: React.FC<CloudSyncSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  onTestConnection,
  letters,
  onSyncAllLetters,
  cloudStatus,
  cloudMessage,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    statusCode?: number;
    errorType?: string;
    message?: string;
    letterCount?: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [syncSummary, setSyncSummary] = useState<{ success: number; failed: number } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection(urlInput.trim());
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const ok = await onSaveUrl(urlInput.trim());
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await handleTest();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleBatchSync = async () => {
    if (letters.length === 0) return;
    setIsSyncingAll(true);
    setSyncSummary(null);
    try {
      const res = await onSyncAllLetters((done, total) => {
        setSyncProgress({ done, total });
      });
      setSyncSummary(res);
    } finally {
      setIsSyncingAll(false);
      setSyncProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600/30 p-2 border border-blue-400/30">
              <Cloud className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Google Sheets Cloud Sync (கூகிள் சீட் ஒத்திசைவு அமைப்புகள்)
              </h2>
              <p className="text-xs text-blue-200">
                Live Google Sheets Cloud Database Integration & Diagnostics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Status Alert Banner */}
          <div
            className={`rounded-xl border p-4 flex items-start gap-3.5 ${
              cloudStatus === 'connected'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : cloudStatus === 'error_403'
                ? 'bg-red-50 border-red-300 text-red-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            {cloudStatus === 'connected' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : cloudStatus === 'error_403' ? (
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CloudOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {cloudStatus === 'connected'
                    ? 'Google Sheets இணைக்கப்பட்டுள்ளது (Connected)'
                    : cloudStatus === 'error_403'
                    ? 'அனுமதி பிழை: 403 Forbidden (Access Denied)'
                    : 'உள்ளூர் முறைமை (Local Cache Mode)'}
                </span>
                <span
                  className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                    cloudStatus === 'connected'
                      ? 'bg-emerald-200 text-emerald-900'
                      : cloudStatus === 'error_403'
                      ? 'bg-red-200 text-red-950 animate-pulse'
                      : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {cloudStatus}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{cloudMessage}</p>
            </div>
          </div>

          {/* 403 Error Solution Guide Box (Highlighted when 403 occurs) */}
          {(cloudStatus === 'error_403' || testResult?.errorType === 'ACCESS_DENIED') && (
            <div className="rounded-xl border-2 border-red-400 bg-red-50/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>ஏன் கடிதங்கள் சீட்டில் சேவ் ஆகவில்லை? (காரணம் & தீர்வு)</span>
              </div>
              <p className="text-xs text-red-900 leading-relaxed">
                Google Apps Script Web App-இன் அணுகல் அனுமதி (Who has access) சரியாக அமைக்கப்படவில்லை. கூகிள் உங்கள் Web App-ஐ தடுத்து நிறுத்துகிறது (403 Forbidden).
              </p>
              <div className="rounded-lg bg-white p-3 text-xs text-slate-800 space-y-2 border border-red-200">
                <p className="font-bold text-slate-900">
                  இதைச் சரிசெய்ய 2 நிமிட வழிமுறைகள் (Quick Steps to Fix):
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-700">
                  <li>
                    உங்கள் <strong>Google Sheet</strong>-ஐத் திறந்து <strong>Extensions &gt; Apps Script</strong> செல்லவும்.
                  </li>
                  <li>
                    மேல் வலதுபுறத்தில் உள்ள நீல நிற <strong>Deploy &gt; Manage deployments</strong> கிளிக் செய்யவும்.
                  </li>
                  <li>
                    இடதுபுறம் உள்ள Web app-ஐத் தேர்ந்தெடுத்து, மேலே உள்ள பென்சில் குறியீட்டை (<strong>Edit / தொகு</strong>) அழுத்தவும்.
                  </li>
                  <li>
                    <strong className="text-red-700 underline">
                      Who has access என்பதை &quot;Anyone&quot; (அனைவருக்கும்)
                    </strong>{' '}
                    என மாற்றவும் (முக்கியம்: &quot;Only myself&quot; என்று இருந்தால் சீட்டில் சேமிக்க முடியாது).
                  </li>
                  <li>
                    <strong>Deploy</strong> கிளிக் செய்து, புதிய Web app URL-ஐ நகலெடுத்து கீழே உள்ள கட்டத்தில் ஒட்டவும்!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Configuration Input */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-xs font-bold text-slate-700">
              Google Apps Script Web App URL (கடிதங்கள் சேமிக்கப்படும் சீட் இணைப்பு):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting || !urlInput.trim()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                >
                  {isTesting ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                  )}
                  <span>சோதிக்க (Test)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || !urlInput.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                >
                  {isSaving ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : saveSuccess ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                  <span>{saveSuccess ? 'சேமிக்கப்பட்டது!' : 'சேமிக்க (Save)'}</span>
                </button>
              </div>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div
                className={`rounded-lg p-3 text-xs border ${
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testResult.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span>
                    {testResult.ok
                      ? `இணைப்பு வெற்றி! (Status: ${testResult.statusCode})`
                      : `இணைப்பு தோல்வி (Status: ${testResult.statusCode || 'Error'})`}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{testResult.message}</p>
                {testResult.letterCount !== undefined && (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                    சீட்டில் தற்போதுள்ள கடிதங்களின் எண்ணிக்கை: {testResult.letterCount}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sync All Local Letters to Cloud Sheet */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-blue-600" />
                  <span>உள்ளூர் கடிதங்களை சீட்டுடன் ஒத்திசைக்க (Sync Local Letters to Sheet)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  இங்கு பதிவு செய்யப்பட்ட <strong>{letters.length}</strong> கடிதங்கள் உள்ளன. இணைப்பு சரிசெய்யப்பட்ட பின் அனைத்தையும் ஒரே கிளிக்கில் சீட்டுக்கு ஏற்றலாம்.
                </p>
              </div>
              <button
                type="button"
                onClick={handleBatchSync}
                disabled={isSyncingAll || letters.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs shrink-0"
              >
                {isSyncingAll ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5" />
                )}
                <span>
                  {isSyncingAll
                    ? `ஒத்திசைக்கப்படுகிறது (${syncProgress?.done ?? 0}/${syncProgress?.total ?? letters.length})...`
                    : 'சீட்டுக்கு பதிவேற்றுக (Sync Now)'}
                </span>
              </button>
            </div>

            {/* Sync Summary Result */}
            {syncSummary && (
              <div className="rounded-lg bg-white border border-blue-200 p-2.5 text-xs text-slate-800">
                <span className="font-bold text-emerald-700">
                  ✓ {syncSummary.success} கடிதங்கள் சீட்டுடன் வெற்றிகரமாக ஒத்திசைக்கப்பட்டது!
                </span>
                {syncSummary.failed > 0 && (
                  <span className="block text-red-600 mt-0.5">
                    ✗ {syncSummary.failed} கடிதங்கள் ஒத்திசைக்க முடியவில்லை (சீட் இணைப்பைச் சோதிக்கவும்).
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Collapsible: Google Apps Script Code & Step-by-Step Setup */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowScriptGuide((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left text-xs font-bold text-slate-800"
            >
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-purple-600" />
                <span>Google Apps Script (Code.gs) முழுமையான குறியீடு & அமைக்கும் முறை</span>
              </div>
              <span className="text-blue-600 font-medium">
                {showScriptGuide ? 'மறைக்க (Hide)' : 'காட்டுக (View Code)'}
              </span>
            </button>

            {showScriptGuide && (
              <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    புதிய Google Sheet உருவாக்கி, Apps Script-இல் ஒட்டுவதற்கான முழுமையான குறியீடு:
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700 transition"
                  >
                    {copiedScript ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedScript ? 'நகலெடுக்கப்பட்டது!' : 'குறியீட்டை நகலெடு (Copy Code)'}</span>
                  </button>
                </div>

                <pre className="max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-emerald-400 border border-slate-800">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Divisional Secretariat • Koralaipattu North, Vaharai
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 font-bold text-white hover:bg-slate-700 transition"
          >
            மூடுக (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
