import React, { useState } from 'react';
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  UploadCloud,
  ShieldAlert,
  Copy,
  Code,
  ChevronDown,
  ChevronUp,
  Zap,
  HardDrive,
  ExternalLink,
  Download,
  FileJson,
  Layers,
} from 'lucide-react';
import { Letter, User } from '../types';
import { OFFICIAL_APPS_SCRIPT_CODE, DEFAULT_DRIVE_FILE_ID } from '../data/appsScriptCode';

interface CloudSyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageMode: 'drive_json' | 'sheets';
  onSaveStorageMode: (mode: 'drive_json' | 'sheets') => void;
  driveFileId: string;
  onSaveDriveFileId: (id: string) => Promise<boolean>;
  onTestDriveConnection: (id?: string) => Promise<{
    ok: boolean;
    latencyMs?: number;
    statusCode?: number;
    uninitialized?: boolean;
    letterCount?: number;
    message?: string;
  }>;
  onUploadAllToDrive: () => Promise<{
    ok: boolean;
    message?: string;
  }>;
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
  users: User[];
  onSyncAllLetters: (onProgress: (done: number, total: number) => void) => Promise<{
    success: number;
    failed: number;
  }>;
  onRepairShiftedRows?: () => Promise<{
    ok: boolean;
    message?: string;
    fixedCount?: number;
  }>;
  cloudStatus: 'connected' | 'error_403' | 'offline' | 'checking';
  cloudMessage: string;
  driveLatency?: number | null;
  onRestoreBaseline?: () => void;
}

export const CloudSyncSettingsModal: React.FC<CloudSyncSettingsModalProps> = ({
  isOpen,
  onClose,
  storageMode,
  onSaveStorageMode,
  driveFileId,
  onSaveDriveFileId,
  onTestDriveConnection,
  onUploadAllToDrive,
  currentUrl,
  onSaveUrl,
  onTestConnection,
  letters,
  users,
  onSyncAllLetters,
  onRepairShiftedRows,
  cloudStatus,
  cloudMessage,
  driveLatency,
  onRestoreBaseline,
}) => {
  const [activeTab, setActiveTab] = useState<'drive_json' | 'sheets' | 'script'>('drive_json');
  const [driveIdInput, setDriveIdInput] = useState(driveFileId || DEFAULT_DRIVE_FILE_ID);
  const [urlInput, setUrlInput] = useState(currentUrl);

  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    statusCode?: number;
    uninitialized?: boolean;
    letterCount?: number;
    message?: string;
  } | null>(null);

  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadToDriveResult, setUploadToDriveResult] = useState<string | null>(null);

  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState<{
    ok: boolean;
    statusCode?: number;
    errorType?: string;
    message?: string;
    letterCount?: number;
  } | null>(null);

  const [isSavingDrive, setIsSavingDrive] = useState(false);
  const [saveDriveSuccess, setSaveDriveSuccess] = useState(false);
  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [saveSheetSuccess, setSaveSheetSuccess] = useState(false);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);
  const [syncSummary, setSyncSummary] = useState<{ success: number; failed: number } | null>(null);

  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<string | null>(null);

  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  if (!isOpen) return null;

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    setDriveTestResult(null);
    try {
      const res = await onTestDriveConnection(driveIdInput.trim());
      setDriveTestResult(res);
    } finally {
      setIsTestingDrive(false);
    }
  };

  const handleSaveDriveId = async () => {
    setIsSavingDrive(true);
    setSaveDriveSuccess(false);
    try {
      const ok = await onSaveDriveFileId(driveIdInput.trim());
      if (ok) {
        setSaveDriveSuccess(true);
        setTimeout(() => setSaveDriveSuccess(false), 3000);
        await handleTestDrive();
      }
    } finally {
      setIsSavingDrive(false);
    }
  };

  const handleUploadAllToDrive = async () => {
    setIsUploadingToDrive(true);
    setUploadToDriveResult(null);
    try {
      const res = await onUploadAllToDrive();
      if (res.ok) {
        setUploadToDriveResult(`✓ ${letters.length} கடிதங்கள் மற்றும் ${users.length} பயனாளர்கள் Google Drive JSON கோப்பில் (${driveIdInput.trim()}) வெற்றிகரமாக பதிவேற்றப்பட்டது!`);
        await handleTestDrive();
      } else {
        setUploadToDriveResult(`எச்சரிக்கை: ${res.message || 'Drive JSON-இல் பதிவேற்ற முடியவில்லை'}`);
      }
    } catch (err: any) {
      setUploadToDriveResult(`பிழை: ${err?.message || 'Upload failed'}`);
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleDownloadBackupJson = () => {
    const backupData = {
      ok: true,
      source: 'vaharai_ds_office',
      exportDate: new Date().toISOString(),
      driveFileId: driveIdInput.trim(),
      totalLetters: letters.length,
      letters,
      users,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaharai_ds_letter_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTestSheet = async () => {
    setIsTestingSheet(true);
    setSheetTestResult(null);
    try {
      const res = await onTestConnection(urlInput.trim());
      setSheetTestResult(res);
    } finally {
      setIsTestingSheet(false);
    }
  };

  const handleSaveSheetUrl = async () => {
    setIsSavingSheet(true);
    setSaveSheetSuccess(false);
    try {
      const ok = await onSaveUrl(urlInput.trim());
      if (ok) {
        setSaveSheetSuccess(true);
        setTimeout(() => setSaveSheetSuccess(false), 3000);
        await handleTestSheet();
      }
    } finally {
      setIsSavingSheet(false);
    }
  };

  const handleBatchSyncSheet = async () => {
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

  const handleRepairRows = async () => {
    if (!onRepairShiftedRows) return;
    setIsRepairing(true);
    setRepairResult(null);
    try {
      const res = await onRepairShiftedRows();
      if (res.ok) {
        setRepairResult(`✓ சீட்டில் நகர்ந்த வரிகள் வெற்றிகரமாக சீரமைக்கப்பட்டது! (${res.fixedCount ?? 0} வரிகள் திருத்தப்பட்டது)`);
      } else {
        setRepairResult(`எச்சரிக்கை: ${res.message || 'Apps Script புதிய பதிப்பு Deploy செய்யப்பட்ட பின் இதை இயக்கவும்.'}`);
      }
    } catch (err: any) {
      setRepairResult(`பிழை: ${err?.message || 'Repair failed'}`);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(OFFICIAL_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600/30 p-2 border border-blue-400/30">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Cloud Storage & Speed Optimization (சேமிப்பக மேலாண்மை)</span>
              </h2>
              <p className="text-xs text-blue-200">
                Google Drive JSON அதிவேக சேமிப்பகம் & Google Sheets ஒத்திசைவு
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

        {/* Storage Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('drive_json')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === 'drive_json'
                ? 'bg-white text-blue-700 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Zap className="h-4 w-4 text-amber-500" />
            <span>Google Drive JSON (மின்னல் வேகம் ⚡)</span>
            {storageMode === 'drive_json' && (
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-300">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === 'sheets'
                ? 'bg-white text-blue-700 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Layers className="h-4 w-4 text-blue-500" />
            <span>Google Sheets (சீட் முறைமை)</span>
            {storageMode === 'sheets' && (
              <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 border border-blue-300">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === 'script'
                ? 'bg-white text-purple-700 border-slate-200 -mb-px shadow-xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Code className="h-4 w-4 text-purple-500" />
            <span>Code.gs குறியீடு</span>
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
              <Zap className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : cloudStatus === 'error_403' ? (
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            ) : (
              <CloudOff className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {storageMode === 'drive_json'
                    ? 'Google Drive JSON சேமிப்பகம் (Super Fast Mode)'
                    : 'Google Sheets சீட் முறைமை'}
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
                  {cloudStatus === 'connected'
                    ? driveLatency
                      ? `${driveLatency}ms (Ultra Fast)`
                      : 'Connected'
                    : cloudStatus}
                </span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">{cloudMessage}</p>
            </div>
          </div>

          {/* TAB 1: GOOGLE DRIVE JSON FILE STORAGE */}
          {activeTab === 'drive_json' && (
            <div className="space-y-5">
              {/* Highlight Card: Why Drive JSON is 20x faster */}
              <div className="rounded-xl border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-600 p-2 text-white shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 text-xs text-slate-700">
                    <h3 className="font-bold text-slate-900 text-sm">
                      ஏன் Google Drive JSON முறைமைக்கு மாற வேண்டும்?
                    </h3>
                    <p className="leading-relaxed">
                      Google Sheets-இல் வரிகள் மற்றும் கலங்களை கணக்கிட Apps Script <strong>10 முதல் 15 வினாடிகள்</strong> தாமதமாகிறது.
                      ஆனால் Google Drive-இல் உள்ள JSON கோப்பைப் பயன்படுத்தும்போது <strong>0.3 வினாடிகளில் (250-400ms)</strong> மிக விரைவாகவும், லொகின் செய்தவுடன் தாமதமின்றியும் இயங்கும்!
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Activation Switch */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    Google Drive JSON சேமிப்பகத்தைப் பயன்படுத்து:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    கடிதங்கள் வாசிப்பதற்கும் பதியவதற்கும் Drive JSON கோப்பை முன்னுரிமையாக வைக்கும்.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSaveStorageMode('drive_json')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                    storageMode === 'drive_json'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {storageMode === 'drive_json' && <Check className="h-3.5 w-3.5" />}
                  <span>{storageMode === 'drive_json' ? 'இணைக்கப்பட்டுள்ளது (Active)' : 'இதை இயக்கு (Activate)'}</span>
                </button>
              </div>

              {/* Drive File ID Configuration */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Google Drive JSON கோப்பு ஐடி (File ID):
                  </label>
                  <a
                    href={`https://drive.google.com/file/d/${driveIdInput.trim()}/view`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    <span>Google Drive-இல் கோப்பைத் திறக்க (vaharai_ds_letter.json)</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={driveIdInput}
                    onChange={(e) => setDriveIdInput(e.target.value)}
                    placeholder="1hp1cpRYvwRPC00OscMK-s5LmsHy-KiNM"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestDrive}
                      disabled={isTestingDrive || !driveIdInput.trim()}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                    >
                      {isTestingDrive ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span>வேகம் சோதிக்க (Test Speed)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDriveId}
                      disabled={isSavingDrive || !driveIdInput.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                    >
                      {isSavingDrive ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : saveDriveSuccess ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                      <span>{saveDriveSuccess ? 'சேமிக்கப்பட்டது!' : 'சேமிக்க'}</span>
                    </button>
                  </div>
                </div>

                {/* Drive Test Result Box */}
                {driveTestResult && (
                  <div
                    className={`rounded-lg p-3 text-xs border ${
                      driveTestResult.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {driveTestResult.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span>
                        {driveTestResult.ok
                          ? `Google Drive JSON இணைப்பு வெற்றி! (பதில் நேரம்: ${driveTestResult.latencyMs ?? 300}ms)`
                          : `Drive இணைப்பு தோல்வி (Status: ${driveTestResult.statusCode || 'Error'})`}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">{driveTestResult.message}</p>
                    {driveTestResult.uninitialized && (
                      <p className="mt-1 text-[11px] font-semibold text-amber-800">
                        குறிப்பு: உங்கள் Drive கோப்பு ({'{ [ ] }'}) தயாராக உள்ளது. தற்போதுள்ள கடிதங்களை உள்ளே ஏற்ற கீழே உள்ள &quot;Upload to Drive&quot; பொத்தானை அழுத்தவும்.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Populate / Upload All to Drive JSON */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                      <UploadCloud className="h-4 w-4 text-emerald-600" />
                      <span>Drive JSON கோப்பில் தகவல்களைப் பதிவேற்றுக (Upload All Records)</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">
                      கணினியில் தற்போதுள்ள <strong>{letters.length} கடிதங்கள்</strong> மற்றும் <strong>{users.length} பயனாளர்கள்</strong> விபரங்களை உங்களின் <code>vaharai_ds_letter.json</code> கோப்பில் ஒரே கிளிக்கில் முழுமையாகப் பதியலாம்.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleUploadAllToDrive}
                      disabled={isUploadingToDrive || letters.length === 0}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs"
                    >
                      {isUploadingToDrive ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                      <span>{isUploadingToDrive ? 'பதிவேற்றப்படுகிறது...' : 'Drive JSON-இல் ஏற்று (Upload to Drive)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBackupJson}
                      title="கணினியில் JSON கோப்பை பதிவிறக்கம் செய்ய"
                      className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Download JSON</span>
                    </button>
                    {onRestoreBaseline && (
                      <button
                        type="button"
                        onClick={onRestoreBaseline}
                        title="உத்தியோகபூர்வ 460 கடிதங்கள் & 108 உத்தியோகத்தர்களை மீளமைக்க"
                        className="flex items-center gap-1 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                        <span className="hidden sm:inline">460 கடிதங்களை மீட்டெடு ({letters.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {uploadToDriveResult && (
                  <div className="rounded-lg bg-white border border-emerald-200 p-2.5 text-xs text-slate-800 font-medium">
                    {uploadToDriveResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SHEETS STORAGE */}
          {activeTab === 'sheets' && (
            <div className="space-y-5">
              {/* Mode Activation Switch */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">
                    Google Sheets சீட் முறைமையைப் பயன்படுத்து:
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    கடிதங்களை வழக்கம் போல Google Sheet-இன் Letters மற்றும் Users தாள்களில் பதியும்.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSaveStorageMode('sheets')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                    storageMode === 'sheets'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {storageMode === 'sheets' && <Check className="h-3.5 w-3.5" />}
                  <span>{storageMode === 'sheets' ? 'இணைக்கப்பட்டுள்ளது (Active)' : 'இதை இயக்கு (Activate)'}</span>
                </button>
              </div>

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
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTestSheet}
                      disabled={isTestingSheet || !urlInput.trim()}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                    >
                      {isTestingSheet ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                      )}
                      <span>சோதிக்க (Test)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSheetUrl}
                      disabled={isSavingSheet || !urlInput.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs"
                    >
                      {isSavingSheet ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : saveSheetSuccess ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                      <span>{saveSheetSuccess ? 'சேமிக்கப்பட்டது!' : 'சேமிக்க'}</span>
                    </button>
                  </div>
                </div>

                {sheetTestResult && (
                  <div
                    className={`rounded-lg p-3 text-xs border ${
                      sheetTestResult.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {sheetTestResult.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span>
                        {sheetTestResult.ok
                          ? `இணைப்பு வெற்றி! (Status: ${sheetTestResult.statusCode})`
                          : `இணைப்பு தோல்வி (Status: ${sheetTestResult.statusCode || 'Error'})`}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">{sheetTestResult.message}</p>
                    {sheetTestResult.letterCount !== undefined && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        சீட்டில் தற்போதுள்ள கடிதங்களின் எண்ணிக்கை: {sheetTestResult.letterCount}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Repair Rows & Batch Sync for Sheet */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                      <UploadCloud className="h-4 w-4 text-blue-600" />
                      <span>உள்ளூர் கடிதங்களை சீட்டுடன் ஒத்திசைக்க</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      கணினியில் உள்ள <strong>{letters.length}</strong> கடிதங்களை Google Sheet-க்கு ஏற்றலாம்.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBatchSyncSheet}
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
                        : 'சீட்டுக்கு பதிவேற்றுக'}
                    </span>
                  </button>
                </div>

                {syncSummary && (
                  <div className="rounded-lg bg-white border border-blue-200 p-2.5 text-xs text-slate-800">
                    <span className="font-bold text-emerald-700">
                      ✓ {syncSummary.success} கடிதங்கள் சீட்டுடன் வெற்றிகரமாக ஒத்திசைக்கப்பட்டது!
                    </span>
                  </div>
                )}

                {onRepairShiftedRows && (
                  <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                    <span className="text-xs text-slate-600">சீட்டில் நகர்ந்த வரிகளை சரிசெய்ய:</span>
                    <button
                      type="button"
                      onClick={handleRepairRows}
                      disabled={isRepairing}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold transition shrink-0"
                    >
                      {isRepairing ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                      <span>சீட்டில் நகர்ந்த வரிகளை சீரமைக்க</span>
                    </button>
                  </div>
                )}
                {repairResult && (
                  <div className="p-2 rounded bg-white border border-amber-200 text-xs text-amber-900 font-semibold">
                    {repairResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APPS SCRIPT CODE */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                      <Code className="h-4 w-4 text-indigo-600" />
                      <span>Google Apps Script புதிய இரட்டைச் சேமிப்புக் குறியீடு (Dual Drive + Sheet Code)</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      இந்த புதிய குறியீடு உங்கள் <code>vaharai_ds_letter.json</code> Google Drive கோப்பு மற்றும் Google Sheet ஆகிய இரண்டையும் ஒரே நேரத்தில் மிக விரைவாக ஒத்திசைக்க உதவும்.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs shrink-0"
                  >
                    {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-200" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedScript ? 'நகலெடுக்கப்பட்டது!' : 'குறியீட்டை நகலெடு (Copy Code)'}</span>
                  </button>
                </div>

                <div className="rounded-lg bg-white p-3 border border-indigo-100 text-xs text-slate-700 space-y-2">
                  <p className="font-bold text-slate-900">Apps Script-இல் அமைப்பது எப்படி?</p>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                    <li>உங்கள் Google Sheet-இல் <strong>Extensions &gt; Apps Script</strong> செல்லவும்.</li>
                    <li>மேலே உள்ள <strong>&quot;குறியீட்டை நகலெடு&quot;</strong> பொத்தானை அழுத்தி அங்கே ஒட்டவும்.</li>
                    <li>வலது மேல்புறத்தில் <strong>Deploy &gt; Manage deployments</strong> சென்று, <strong>Edit &gt; Version: New version &gt; Who has access: Anyone</strong> என அமைத்து <strong>Deploy</strong> செய்யவும்!</li>
                  </ol>
                </div>

                <div className="rounded-lg border border-slate-300 bg-slate-900 p-3 text-slate-100 font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed">
                  <pre className="whitespace-pre-wrap">{OFFICIAL_APPS_SCRIPT_CODE}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>தற்போதைய முறைமை:</span>
            <span className="font-bold text-slate-900">
              {storageMode === 'drive_json' ? '⚡ Google Drive JSON' : '📊 Google Sheets'}
            </span>
          </div>
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
