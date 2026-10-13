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
} from 'lucide-react';
import { Letter } from '../types';
import { OFFICIAL_APPS_SCRIPT_CODE } from '../data/appsScriptCode';

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
  onRepairShiftedRows?: () => Promise<{
    ok: boolean;
    message?: string;
    fixedCount?: number;
  }>;
  cloudStatus: 'connected' | 'error_403' | 'offline' | 'checking';
  cloudMessage: string;
}

export const CloudSyncSettingsModal: React.FC<CloudSyncSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUrl,
  onSaveUrl,
  onTestConnection,
  letters,
  onSyncAllLetters,
  onRepairShiftedRows,
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
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

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

          {/* Official Google Apps Script (15-Columns Aligned Fix) */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Code className="h-4 w-4 text-indigo-600" />
                  <span>Google Apps Script புதிய குறியீடு (15-Columns Aligned Code)</span>
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  action நிலை மாற்றும்போது தரவுகள் முன்னைய கொலத்திற்கு நகர்வதைத் தடுத்து, நேரலையாக குறித்த இடத்தில் விரைவாகப் பதிய உதவும் அதிகாரப்பூர்வ Apps Script குறியீடு.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-xs"
                >
                  {copiedScript ? (
                    <Check className="h-3.5 w-3.5 text-emerald-200" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedScript ? 'நகலெடுக்கப்பட்டது!' : 'குறியீட்டை நகலெடு (Copy Code)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScriptCode(!showScriptCode)}
                  className="flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition"
                  title="குறியீட்டைப் பார்"
                >
                  {showScriptCode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 border border-indigo-100 text-xs text-slate-700 space-y-2.5">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="text-amber-600">⚠️</span>
                <span>சீட்டில் கொலங்கள் நகர்வதை நிரந்தரமாக சரிசெய்ய 3 எளிய வழிமுறைகள்:</span>
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                <li>உங்கள் <strong>Google Sheet</strong>-இல் சென்று <strong>Extensions &gt; Apps Script</strong> என்பதைத் திறக்கவும்.</li>
                <li>அங்குள்ள பழைய குறியீடுகளை முழுவதும் அழித்துவிட்டு, மேலே உள்ள <strong>&quot;குறியீட்டை நகலெடு (Copy Code)&quot;</strong> பொத்தானை அழுத்திப் பெற்று ஒட்டவும் (Paste).</li>
                <li>
                  <strong className="text-indigo-800">மிக முக்கியம்:</strong> மேல் வலதுபுறம் உள்ள <strong>Deploy &gt; Manage deployments</strong> சென்று, பென்சில் ஐகானை (<strong>Edit</strong>) கிளிக் செய்து, <strong>Version</strong> என்பதில் <strong className="text-red-700 underline">&quot;New version&quot; (புதிய பதிப்பு)</strong> எனத் தெரிவுசெய்து <strong>Deploy</strong> செய்யவும்! (புதிய version தெரிவு செய்யாவிட்டால் பழைய ஸ்கிரிப்டே இயங்கும்).
                </li>
              </ol>

              {onRepairShiftedRows && (
                <div className="pt-2 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-600">
                    சீட்டில் ஏற்கெனவே நகர்ந்துள்ள Action Status வரிகளை தானாக நேராக்க:
                  </span>
                  <button
                    type="button"
                    onClick={handleRepairRows}
                    disabled={isRepairing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs shrink-0 disabled:opacity-50"
                  >
                    {isRepairing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>சீட்டில் நகர்ந்த வரிகளை சீரமைக்க (Fix Shifted Rows)</span>
                  </button>
                </div>
              )}

              {repairResult && (
                <div className="p-2 rounded bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-900 mt-1">
                  {repairResult}
                </div>
              )}
            </div>

            {showScriptCode && (
              <div className="rounded-lg border border-slate-300 bg-slate-900 p-3 text-slate-100 font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed">
                <pre className="whitespace-pre-wrap">{OFFICIAL_APPS_SCRIPT_CODE}</pre>
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
