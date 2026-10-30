import React, { useState, useEffect } from 'react';
import { User, DriveBackupItem } from '../types';
import { Language, translations } from '../translations/i18n';
import {
  signInWithGoogleDrive,
  signInWithGoogleDriveRedirect,
  getGoogleAccessToken,
  setGoogleAccessToken,
  disconnectGoogleDrive,
  getGoogleDriveUser,
} from '../services/auth';
import {
  DEFAULT_DESIGNATED_FILE_ID,
  DEFAULT_DESIGNATED_FILE_URL,
  getDesignatedDriveFileId,
  setDesignatedDriveFileId,
  isDriveAutoSyncEnabled,
  setDriveAutoSyncEnabled,
  saveToDesignatedDriveFile,
  fetchFromDesignatedDriveFile,
  listDriveBackups,
  uploadBackupToDrive,
  downloadDriveBackup,
  deleteDriveBackup,
  onDriveSyncStatusChange,
  DriveSyncStatus,
  getDriveSyncStatus,
  getGoogleSheetUrl,
  setGoogleSheetUrl,
  fetchFromCloudProxy,
} from '../services/googleDrive';
import {
  createDatabaseSnapshot,
  restoreDatabaseFromSnapshot,
  getCentralDatabaseStatus,
  pushToCentralDatabase,
} from '../services/storage';

interface DriveBackupViewProps {
  currentUser: User;
  lang: Language;
  onDatabaseReload: () => void;
  onAuditLog: (action: string, details: string) => void;
}

export const DriveBackupView: React.FC<DriveBackupViewProps> = ({
  currentUser,
  lang,
  onDatabaseReload,
  onAuditLog,
}) => {
  const t = translations[lang];

  const [isConnected, setIsConnected] = useState<boolean>(() => !!getGoogleAccessToken());
  const [googleUserEmail, setGoogleUserEmail] = useState<string>(() => getGoogleDriveUser()?.email || '');
  const [driveBackups, setDriveBackups] = useState<DriveBackupItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  const [showManualToken, setShowManualToken] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [serverDbStatus, setServerDbStatus] = useState<any>(null);

  // Designated Drive Master File State
  const [designatedFileId, setDesignatedFileIdState] = useState<string>(() => getDesignatedDriveFileId());
  const [isAutoSync, setIsAutoSync] = useState<boolean>(() => isDriveAutoSyncEnabled());
  const [isEditingFileId, setIsEditingFileId] = useState<boolean>(false);
  const [fileIdInput, setFileIdInput] = useState<string>(() => getDesignatedDriveFileId());
  const [driveSyncState, setDriveSyncState] = useState<DriveSyncStatus>(() => getDriveSyncStatus());
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(() => getGoogleSheetUrl());

  // Confirmation dialog state for destructive/mutating operations
  const [confirmModalItem, setConfirmModalItem] = useState<DriveBackupItem | null>(null);

  useEffect(() => {
    const token = getGoogleAccessToken();
    if (token) {
      setIsConnected(true);
      const user = getGoogleDriveUser();
      if (user?.email) setGoogleUserEmail(user.email);
      fetchBackups();
    }

    // Subscribe to drive sync status
    const unsubscribe = onDriveSyncStatusChange((st) => {
      setDriveSyncState(st);
      if (st.fileId) setDesignatedFileIdState(st.fileId);
    });

    // Check central server status
    getCentralDatabaseStatus().then((status) => {
      if (status) setServerDbStatus(status);
    });

    return unsubscribe;
  }, []);

  const handleForceSyncServer = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await pushToCentralDatabase();
      const status = await getCentralDatabaseStatus();
      setServerDbStatus(status);
      setStatusMessage(lang === 'ta' ? 'மத்திய சர்வர் தரவுத்தளம் வெற்றிகரமாக ஒத்திசைக்கப்பட்டது!' : 'Central server database synced successfully!');
      onDatabaseReload();
    } catch (err: any) {
      setErrorMessage(err.message || 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { user } = await signInWithGoogleDrive();
      setIsConnected(true);
      setGoogleUserEmail(user.email || 'Connected Google Account');
      setStatusMessage(lang === 'ta' ? 'கூகிள் டிரைவ் வெற்றிகரமாக இணைக்கப்பட்டது!' : 'Google Drive connected successfully!');
      await fetchBackups();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to authenticate with Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogleRedirect = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await signInWithGoogleDriveRedirect();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to initialize Google redirect');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectGoogleDrive();
    setIsConnected(false);
    setGoogleUserEmail('');
    setDriveBackups([]);
    setStatusMessage(lang === 'ta' ? 'கூகிள் கணக்கு விலகப்பட்டது.' : 'Google Drive disconnected.');
  };

  const handleSwitchAccount = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await disconnectGoogleDrive();
      setIsConnected(false);
      setGoogleUserEmail('');
      setDriveBackups([]);
      const { user } = await signInWithGoogleDrive();
      setIsConnected(true);
      setGoogleUserEmail(user.email || 'Connected Google Account');
      setStatusMessage(lang === 'ta' ? 'புதிய கூகிள் டிரைவ் கணக்கு வெற்றிகரமாக மாற்றப்பட்டது!' : 'Switched to new Google Drive account successfully!');
      await fetchBackups();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to switch Google account');
    } finally {
      setIsLoading(false);
    }
  };

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyDomain = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  const handleApplyManualToken = async () => {
    if (!manualTokenInput.trim()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      setGoogleAccessToken(manualTokenInput.trim());
      setIsConnected(true);
      setGoogleUserEmail('OAuth Token User');
      setStatusMessage(lang === 'ta' ? 'அணுகல் டோக்கன் ஏற்றுக்கொள்ளப்பட்டது!' : 'Access Token applied successfully!');
      await fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid Token');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const list = await listDriveBackups();
      setDriveBackups(list);
    } catch (err: any) {
      console.error('Fetch backups error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDriveBackup = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const snapshot = createDatabaseSnapshot();
      const newFile = await uploadBackupToDrive(snapshot);
      setStatusMessage(`${t.backupSuccess} (${newFile.name})`);
      onAuditLog('DRIVE_BACKUP', `Uploaded database backup to Google Drive: ${newFile.name}`);
      await fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to backup to Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirmModalItem) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const snapshot = await downloadDriveBackup(confirmModalItem.id);
      restoreDatabaseFromSnapshot(snapshot);
      onDatabaseReload();
      onAuditLog('DRIVE_RESTORE', `Restored database from Google Drive backup: ${confirmModalItem.name}`);
      setStatusMessage(`${t.restoreSuccess} (${confirmModalItem.name})`);
      setConfirmModalItem(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore backup from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = async (item: DriveBackupItem) => {
    if (!window.confirm(lang === 'ta' ? 'இந்த காப்புப்பிரதியை கூகிள் டிரைவிலிருந்து நிச்சயமாக நீக்க வேண்டுமா?' : `Delete ${item.name} from Google Drive?`)) {
      return;
    }
    setIsLoading(true);
    try {
      await deleteDriveBackup(item.id);
      onAuditLog('DRIVE_DELETE', `Deleted Google Drive backup file: ${item.name}`);
      await fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete file from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  // Designated Drive File Handlers
  const handleSaveToDesignatedFile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const snapshot = createDatabaseSnapshot();
      const res = await saveToDesignatedDriveFile(snapshot, designatedFileId);
      setStatusMessage(lang === 'ta' ? `குறிக்கப்பட்ட டிரைவ் கோப்பில் (${res.fileId}) அனைத்து தகவல்களும் வெற்றிகரமாக சேமிக்கப்பட்டன!` : `Successfully saved to designated Drive file (${res.fileId})!`);
      onAuditLog('DRIVE_MASTER_SYNC', `Saved master database directly to Google Drive file: ${res.fileId}`);
      await fetchBackups();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save to designated Google Drive file');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullFromDesignatedFile = async () => {
    if (!window.confirm(lang === 'ta' ? 'குறிக்கப்பட்ட கூகிள் டிரைவ் கோப்பிலிருந்து தரவுகளைப் பெற்று தற்போதைய தகவல்களைப் புதுப்பிக்க விரும்புகிறீர்களா?' : 'Pull latest data from the designated Google Drive file and update local state?')) {
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const driveData = await fetchFromDesignatedDriveFile(designatedFileId);
      if (!driveData || !driveData.beneficiaries) {
        throw new Error(lang === 'ta' ? 'டிரைவ் கோப்பில் சரியான தரவுத்தள ஆவணம் காணப்படவில்லை.' : 'Designated Drive file does not contain a valid database snapshot.');
      }
      restoreDatabaseFromSnapshot(driveData);
      onDatabaseReload();
      setStatusMessage(lang === 'ta' ? `டிரைவ் கோப்பிலிருந்து ${driveData.beneficiaries?.length || 0} பிரஜைகள் மற்றும் தகவல்கள் வெற்றிகரமாகப் பெறப்பட்டன!` : `Loaded ${driveData.beneficiaries?.length || 0} citizens from designated Drive file!`);
      onAuditLog('DRIVE_MASTER_PULL', `Pulled master database from Google Drive file: ${designatedFileId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to pull from designated Google Drive file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDesignatedFileId = () => {
    if (!fileIdInput.trim()) return;
    const cleanId = setDesignatedDriveFileId(fileIdInput.trim());
    setDesignatedFileIdState(cleanId);
    setIsEditingFileId(false);
    setStatusMessage(lang === 'ta' ? `முதன்மை டிரைவ் கோப்பு அடையாள எண் மாற்றப்பட்டது: ${cleanId}` : `Designated Drive File ID updated: ${cleanId}`);
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setIsAutoSync(enabled);
    setDriveAutoSyncEnabled(enabled);
  };

  const handleSaveGoogleSheetUrl = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const saved = setGoogleSheetUrl(sheetUrlInput);
      if (saved) {
        setStatusMessage(lang === 'ta' ? 'கூகிள் சீட் இணைப்பு சேமிக்கப்பட்டது. தகவல்கள் பெறப்படுகின்றன...' : 'Google Sheet URL saved. Pulling records...');
        const data = await fetchFromCloudProxy(saved);
        if (data && data.beneficiaries && data.beneficiaries.length > 0) {
          restoreDatabaseFromSnapshot(data);
          onDatabaseReload();
          setStatusMessage(
            lang === 'ta'
              ? `✅ கூகிள் சீட்டிலிருந்து ${data.beneficiaries.length} பிரஜை விபரங்கள் வெற்றிகரமாகப் பெறப்பட்டன! ஆப் திறக்கும்போது இது தானாகவே லோட் ஆகும்.`
              : `✅ Loaded ${data.beneficiaries.length} records from Google Sheet! Will auto-load on open.`
          );
        } else {
          setStatusMessage(lang === 'ta' ? 'கூகிள் சீட் இணைப்பு வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Google Sheet URL linked successfully!');
        }
      } else {
        setStatusMessage(lang === 'ta' ? 'கூகிள் சீட் இணைப்பு நீக்கப்பட்டது.' : 'Google Sheet link removed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sync Google Sheet');
    } finally {
      setIsLoading(false);
    }
  };

  // Local JSON File export
  const handleDownloadLocalBackup = () => {
    const snapshot = createDatabaseSnapshot();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const nowStr = new Date().toISOString().slice(0, 10);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vaharai_ds_local_backup_${nowStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAuditLog('LOCAL_BACKUP', 'Exported local database JSON backup file');
  };

  const handleUploadLocalBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(t.confirmRestore)) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const snapshot = JSON.parse(text);
        restoreDatabaseFromSnapshot(snapshot);
        onDatabaseReload();
        setStatusMessage(t.restoreSuccess);
        onAuditLog('LOCAL_RESTORE', `Restored database from local file: ${file.name}`);
      } catch (err: any) {
        setErrorMessage(lang === 'ta' ? 'செல்லுபடியற்ற JSON காப்புப்பிரதி கோப்பு!' : 'Invalid JSON backup file!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">☁️</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.driveTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.driveSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isConnected ? (
            <>
              <button
                onClick={handleSwitchAccount}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-semibold transition-colors border border-emerald-300 flex items-center gap-1.5"
                title="Switch to another Google Account"
              >
                <span>🔄</span>
                <span>{lang === 'ta' ? 'வேறு கூகிள் கணக்கை மாற்றுக' : 'Switch Google Account'}</span>
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors border border-red-200"
              >
                {lang === 'ta' ? 'இணைப்பைத் துண்டி' : 'Disconnect'}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleConnectGoogle}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Google sign-in popup"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{t.connectDrive} (பாப்-அப்)</span>
              </button>

              <button
                onClick={handleConnectGoogleRedirect}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Redirects to Google directly without popups"
              >
                <span>↪️</span>
                <span>{lang === 'ta' ? 'முழு பக்க Redirect' : 'Redirect Sign-In'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Designated Master Google Drive Database Synchronization Card */}
      <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold tracking-wider uppercase px-4 py-1 rounded-bl-xl shadow-xs">
          {lang === 'ta' ? 'முதன்மை நேரடி தரவுத்தள கோப்பு' : 'DESIGNATED MASTER FILE'}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">🎯</span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {lang === 'ta' ? 'குறிக்கப்பட்ட கூகிள் டிரைவ் நேரடி தரவுத்தள இணைப்பு' : 'Designated Master Google Drive Database Sync'}
              </h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono ${isConnected ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                {isConnected ? (lang === 'ta' ? 'இணைக்கப்பட்டுள்ளது' : 'CONNECTED') : (lang === 'ta' ? 'இணைப்பு தேவை' : 'CONNECT REQUIRED')}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
              {lang === 'ta'
                ? 'பிரதேச செயலகத்தில் எந்தவொரு கணினியிலோ அல்லது வுரவுசரிலோ (Chrome, Edge, Firefox) தகவல் பதியப்பட்டாலும், அது உடனடியாக கீழே உள்ள இந்த பிரதான கூகிள் டிரைவ் கோப்பில் சேமிக்கப்படும். இதனால் அனைத்து வுரவுசர்களிலும் தகவல்கள் ஒரே சீராகப் பகிரப்படும்.'
                : 'Every record added or updated from any computer or browser automatically saves directly into this designated master Google Drive file for synchronized cross-browser access.'}
            </p>
          </div>

          {/* Auto-Sync Toggle */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl w-fit">
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-800">
                {lang === 'ta' ? 'தானியங்கி டிரைவ் சேமிப்பு' : 'Auto-Save to Drive'}
              </div>
              <div className="text-[10px] text-slate-500">
                {isAutoSync ? (lang === 'ta' ? 'ஒவ்வொரு மாற்றத்திலும்' : 'On Every Change') : (lang === 'ta' ? 'கைமுறை மட்டும்' : 'Manual Only')}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAutoSync}
              onClick={() => handleToggleAutoSync(!isAutoSync)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isAutoSync ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isAutoSync ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* File ID & Link Info */}
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <span>📁</span>
                <span>{lang === 'ta' ? 'இணைக்கப்பட்ட டிரைவ் கோப்பு அடையாள எண் (File ID):' : 'Designated Drive File ID:'}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-emerald-900 select-all">
                  {designatedFileId}
                </code>
                <a
                  href={`https://drive.google.com/file/d/${designatedFileId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-semibold transition-colors"
                >
                  <span>🌐</span>
                  <span>{lang === 'ta' ? 'டிரைவில் திறக்கவும் (Open in Drive)' : 'Open in Google Drive'}</span>
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsEditingFileId(!isEditingFileId)}
                className="px-2.5 py-1.5 text-[11px] text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors border border-slate-300"
              >
                ✏️ {isEditingFileId ? (lang === 'ta' ? 'மூடுக' : 'Close') : (lang === 'ta' ? 'கோப்பு இணைப்பை மாற்று' : 'Change File ID / Link')}
              </button>
            </div>
          </div>

          {/* Edit file ID form */}
          {isEditingFileId && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                {lang === 'ta' ? 'புதிய கூகிள் டிரைவ் பகிர்வு இணைப்பு (Share Link) அல்லது File ID-ஐ இடவும்:' : 'Paste new Google Drive share link or File ID:'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={fileIdInput}
                  onChange={(e) => setFileIdInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/1oEDEnf1xa-7FQm89Wz9hgVBGWiF5Ylr2/view?usp=sharing"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleUpdateDesignatedFileId}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'சேமி' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFileIdInput(DEFAULT_DESIGNATED_FILE_ID);
                    setDesignatedDriveFileId(DEFAULT_DESIGNATED_FILE_ID);
                    setDesignatedFileIdState(DEFAULT_DESIGNATED_FILE_ID);
                    setIsEditingFileId(false);
                  }}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                  title="Reset to default official file"
                >
                  {lang === 'ta' ? 'இயல்புநிலை' : 'Reset Default'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2 Primary Direct Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            onClick={handleSaveToDesignatedFile}
            disabled={isLoading || !isConnected}
            className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span className="text-base">📤</span>
            <span>
              {lang === 'ta'
                ? 'இந்த டிரைவ் கோப்பில் தகவல்களை இப்போதே சேமிக்கவும் (Push to Drive File)'
                : 'Save Local Data into this Drive File Now'}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePullFromDesignatedFile}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span className="text-base">📥</span>
            <span>
              {lang === 'ta'
                ? 'இந்த டிரைவ் கோப்பிலிருந்து தகவல்களை மீட்டெடுக்கவும் (Pull from Drive File)'
                : 'Load / Pull Latest from this Drive File'}
            </span>
          </button>
        </div>

        {driveSyncState.lastSyncedAt && (
          <div className="mt-3 text-[11px] text-slate-500 font-mono text-center sm:text-left flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>
              {lang === 'ta' ? 'கடைசி நேரடி ஒத்திசைவு:' : 'Last live sync:'} {new Date(driveSyncState.lastSyncedAt).toLocaleString()}
            </span>
            {driveSyncState.message && (
              <span className="text-emerald-700 font-sans">· {driveSyncState.message}</span>
            )}
          </div>
        )}
      </div>

      {/* Google Sheets Live Auto-Sync Card */}
      <div className="bg-white border-2 border-teal-500/80 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-teal-600 text-white text-[10px] font-bold tracking-wider uppercase px-4 py-1 rounded-bl-xl shadow-xs">
          {lang === 'ta' ? 'கூகிள் சீட் நேரலை இணைப்பு' : 'LIVE GOOGLE SHEET AUTO-SYNC'}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {lang === 'ta' ? 'கூகிள் சீட் நேரலை இணைப்பு & தானியங்கி லோடிங்' : 'Google Sheets Live Auto-Sync & Startup Loading'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {lang === 'ta'
                  ? 'உங்கள் கூகிள் சீட்டின் (Google Sheets) பகிர்வு இணைப்பை இங்கே இடவும். ஆப் திறந்தவுடனேயே சீட்டிலுள்ள அனைத்து தகவல்களும் தானாக லோட் ஆகும்!'
                  : 'Enter your Google Sheets link below. Data from your Google Sheet will load automatically whenever the system is opened!'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <label className="text-[11px] font-bold text-slate-700 block">
              {lang === 'ta' ? 'Google Sheet இணைய முகவரி (URL):' : 'Google Sheet URL:'}
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={sheetUrlInput}
                onChange={(e) => setSheetUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1XXXXX/edit#gid=0"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-hidden"
              />
              <button
                type="button"
                onClick={handleSaveGoogleSheetUrl}
                disabled={isLoading}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>🔗</span>
                <span>{lang === 'ta' ? 'சீட்டை இணைத்து லோட் செய்' : 'Link & Load Sheet'}</span>
              </button>
            </div>

            {getGoogleSheetUrl() && (
              <div className="flex items-center justify-between text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-teal-500 inline-block animate-pulse shrink-0"></span>
                  <span className="font-semibold">{lang === 'ta' ? 'இணைக்கப்பட்ட சீட்:' : 'Linked Sheet:'}</span>
                  <span className="truncate font-mono text-[10px]">{getGoogleSheetUrl()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSheetUrlInput('');
                    setGoogleSheetUrl('');
                    setStatusMessage(lang === 'ta' ? 'கூகிள் சீட் இணைப்பு நீக்கப்பட்டது.' : 'Sheet disconnected.');
                  }}
                  className="text-rose-700 hover:underline font-bold shrink-0 ml-2"
                >
                  {lang === 'ta' ? 'நீக்கு' : 'Remove'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Guidance Card: Where data is stored & how to switch accounts */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-xl p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">ℹ️</span>
          <div className="space-y-2 text-xs text-slate-800">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <span>{lang === 'ta' ? 'தரவுகள் எங்கு சேமிக்கப்படுகிறது? டிரைவை எப்படி மாற்றுவது?' : 'Where are backups stored & how to switch Drive?'}</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full font-mono">
                GOOGLE DRIVE GUIDE
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-white/80 border border-emerald-100 rounded-lg p-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span>📂</span>
                  <span>{lang === 'ta' ? '1. சேமிக்கப்படும் இடம் (Storage Location):' : '1. Exact Storage Location:'}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {lang === 'ta'
                    ? 'நீங்கள் இணைத்துள்ள கூகிள் கணக்கின் Google Drive-ல் பிரதான கோப்பகத்தில் (My Drive) "vaharai_ds_backup_YYYY-MM-DD-HH-mm-ss.json" என்ற பெயரில் JSON ஆவணமாகப் பாதுகாப்பாக சேமிக்கப்படுகிறது.'
                    : 'Saved directly in your Google Drive root folder ("My Drive") as "vaharai_ds_backup_YYYY-MM-DD-HH-mm-ss.json".'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href="https://drive.google.com/drive/my-drive"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors"
                  >
                    <span>🌐</span>
                    <span>{lang === 'ta' ? 'கூகிள் டிரைவை திறக்கவும்' : 'Open drive.google.com'}</span>
                  </a>
                  <span className="text-[10px] text-slate-500 font-mono">search: vaharai_ds_backup</span>
                </div>
              </div>

              <div className="bg-white/80 border border-emerald-100 rounded-lg p-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span>🔄</span>
                  <span>{lang === 'ta' ? '2. டிரைவ் கணக்கை மாற்றுவது எப்படி?' : '2. How to switch Google Account:'}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  {lang === 'ta'
                    ? 'வேறு ஜிமெயில் கணக்கிற்கு மாற்ற விரும்பினால், மேலே உள்ள "வேறு கூகிள் கணக்கை மாற்றுக" பொத்தானை அழுத்தவும். உடனடியாக கூகிள் உள்நுழைவுத் திரை தோன்றும்; அதில் நீங்கள் விரும்பும் எந்தவொரு உத்தியோகபூர்வ ஜிமெயில் கணக்கையும் தேர்வு செய்யலாம்.'
                    : 'To use a different Google account or Gmail, click "Switch Google Account". A Google popup will open allowing you to select and authenticate with any other account.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Central Master Database & Staff Login Architecture Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-md border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">🏢</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {lang === 'ta' ? 'பிரதேச செயலக மத்திய சர்வர் சேமிப்பக முறைமை' : 'DS Central Master Server Architecture'}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {lang === 'ta' ? 'தானியங்கி ஒத்திசைவு செயலில் உள்ளது' : 'LIVE AUTO-SYNC ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {lang === 'ta'
                  ? 'அனைத்து அலுவலர்களும் தனித்தனி கூகிள் கணக்குகள் இன்றியே தங்களுடைய User ID / Password மூலம் இந்த ஒரு மைய சேமிப்பகத்தில் இயங்க முடியும்.'
                  : 'All staff operate from a single central master repository using their official Staff ID / Password.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleForceSyncServer}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs w-fit"
          >
            <span>🔄</span>
            <span>{lang === 'ta' ? 'சர்வர் தரவை இப்போதே ஒத்திசைக்குக' : 'Force Sync Server'}</span>
          </button>
        </div>

        {/* 3 Pillars of Centralized Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
              <span>👤</span>
              <span>{lang === 'ta' ? '1. உத்தியோகபூர்வ User ID / Password:' : '1. Staff ID & Password Only:'}</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              {lang === 'ta'
                ? 'வரவேற்பாளர் (111), அட்மின் 1 (123), அட்மின் 2 (456), சமுர்த்தி உத்தியோகத்தர் (604) மற்றும் நேரலை டிவி காட்சி (000) ஆகிய அனைவரும் தங்களுக்குரிய கடவுக்குறியீடு மூலமே உள்நுழைந்து இயங்குவர்.'
                : 'Officers login using their assigned staff credentials without requiring personal Google accounts.'}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
              <span>🖥️</span>
              <span>{lang === 'ta' ? '2. தனிநபர் கூகிள் டிரைவ் தேவையில்லை:' : '2. No Individual Drives Needed:'}</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              {lang === 'ta'
                ? 'சாதாரண அலுவலர்கள் எவரும் தங்களது தனிப்பட்ட ஜிமெயில் அல்லது டிரைவை இணைக்க வேண்டியதில்லை. அனைத்து தரவுகளும் மத்திய சர்வரில் (Central Database) தானாகவே ஒருமுகப்படுத்தப்படும்.'
                : 'No staff member needs to authenticate their own personal Google Drive; all operations center on this master repository.'}
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-3">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-xs">
              <span>⚡</span>
              <span>{lang === 'ta' ? '3. பல கணினிகள் நேரடி ஒத்திசைவு:' : '3. Real-Time Multi-PC Sync:'}</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              {lang === 'ta'
                ? 'கவுண்டர் 1-ல் டோக்கன் வழங்கப்பட்டால், கவுண்டர் 2 அலுவலரின் திரையிலும், வரவேற்பக நேரலை டிவி திரையிலும் அது 10 வினாடிகளுக்குள் தானாகவே புதுப்பிக்கப்படும்!'
                : 'Actions performed on any workstation automatically synchronize across all office PCs and the Live TV display.'}
            </p>
          </div>
        </div>

        {serverDbStatus?.counts && (
          <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 font-mono flex-wrap gap-2">
            <div>
              <span>📊 Central Server Counts: </span>
              <span className="text-white font-bold">{serverDbStatus.counts.citizens} Citizens</span> ·{' '}
              <span className="text-white font-bold">{serverDbStatus.counts.tokens} Tokens</span> ·{' '}
              <span className="text-white font-bold">{serverDbStatus.counts.assistance} Relief Records</span>
            </div>
            {serverDbStatus.lastModified && (
              <div>
                <span>Last Sync: {new Date(serverDbStatus.lastModified).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
          ✓ {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="space-y-3">
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium flex items-start gap-2">
            <span className="text-base mt-0.5">⚠️</span>
            <div className="flex-1">
              <div className="font-bold">{lang === 'ta' ? 'கூகிள் டிரைவ் இணைப்புப் பிழை:' : 'Google Drive Authentication Error:'}</div>
              <div className="font-mono text-[11px] mt-0.5 break-all">{errorMessage}</div>
            </div>
          </div>

          {(errorMessage.toLowerCase().includes('unauthorized-domain') ||
            errorMessage.toLowerCase().includes('unauthorized domain')) && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <span>🛡️</span>
                <span>
                  {lang === 'ta'
                    ? 'டொமைன் அனுமதி தேவை (Firebase Authorized Domain Setup)'
                    : 'Action Required: Add Domain to Firebase Authorized Domains'}
                </span>
              </div>

              <p className="text-amber-900/90 leading-relaxed text-[11px]">
                {lang === 'ta'
                  ? 'கூகிளின் பாதுகாப்பு விதிகளின்படி, இந்த செயலி இயங்கும் இணைய முகவரியை (Domain) உங்களது Firebase திட்டத்தில் (planar-grid-s3kqt) "Authorized Domains" பட்டியலில் ஒரு முறை சேர்க்க வேண்டும்.'
                  : 'Google Firebase security requires the domain hosting this applet to be explicitly added to the "Authorized Domains" whitelist in your Firebase project (planar-grid-s3kqt).'}
              </p>

              <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">
                  {lang === 'ta' ? '1. கீழே உள்ள இணைய முகவரிகளை (Domains) நகலெடுக்கவும்:' : '1. Copy these domains to authorize:'}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold w-24">
                      {lang === 'ta' ? 'தற்போதைய தளம்:' : 'Current Domain:'}
                    </span>
                    <code className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-mono text-xs border border-slate-300 select-all font-bold">
                      {currentHostname}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentHostname);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span>{copiedDomain ? '✓' : '📋'}</span>
                      <span>{copiedDomain ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied!') : (lang === 'ta' ? 'நகலெடு' : 'Copy')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold w-24">
                      {lang === 'ta' ? 'Vercel டொமைன்:' : 'Vercel App:'}
                    </span>
                    <code className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-mono text-xs border border-slate-300 select-all font-bold">
                      vaharai-ds-bams.vercel.app
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('vaharai-ds-bams.vercel.app');
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span>📋</span>
                      <span>{lang === 'ta' ? 'நகலெடு' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold w-24">
                      {lang === 'ta' ? 'அனைத்து Vercel:' : 'All Vercel:'}
                    </span>
                    <code className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded font-mono text-xs border border-slate-300 select-all font-bold">
                      vercel.app
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('vercel.app');
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span>📋</span>
                      <span>{lang === 'ta' ? 'நகலெடு' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">
                  {lang === 'ta' ? '2. Firebase Console-ல் சேர்க்கும் முறை:' : '2. How to add in Firebase Console:'}
                </div>
                <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                  <li>
                    {lang === 'ta' ? 'கீழே உள்ள பொத்தானை அழுத்தி Firebase Authentication அமைப்பைத் திறக்கவும்:' : 'Click below to open Firebase Authentication settings:'}
                  </li>
                  <li className="pl-4">
                    <a
                      href="https://console.firebase.google.com/project/planar-grid-s3kqt/authentication/settings"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-[11px] my-1"
                    >
                      <span>🔗</span>
                      <span>Firebase Auth Settings (planar-grid-s3kqt)</span>
                    </a>
                  </li>
                  <li>
                    {lang === 'ta'
                      ? 'அங்கே "Authorized domains" (அங்கீகரிக்கப்பட்ட களங்கள்) பகுதிக்குச் சென்று "Add domain" என்பதை அழுத்தவும்.'
                      : 'Scroll to "Authorized domains" and click "Add domain".'}
                  </li>
                  <li>
                    {lang === 'ta'
                      ? `நகலெடுத்த "${currentHostname}" முகவரியை ஒட்டி "Save" செய்யவும்.`
                      : `Paste "${currentHostname}" and click "Save".`}
                  </li>
                  <li>
                    {lang === 'ta'
                      ? 'சேமித்த பிறகு, மேலே உள்ள "கூகிள் கணக்குடன் இணைக்கவும்" பொத்தானை மீண்டும் அழுத்தவும்!'
                      : 'After saving, return here and click "Connect with Google Account" again!'}
                  </li>
                </ol>
              </div>

              {/* Manual Token Option & Local Backup Reminder */}
              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowManualToken(!showManualToken)}
                  className="text-[11px] text-amber-800 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>🔑</span>
                  <span>
                    {showManualToken
                      ? (lang === 'ta' ? 'கைமுறை டோக்கன் உள்ளீட்டை மறைக்கவும்' : 'Hide manual token input')
                      : (lang === 'ta' ? 'Google Access Token நேரடியாக உள்ளிட வேண்டுமா?' : 'Enter Google Access Token manually?')}
                  </span>
                </button>

                <span className="text-[10px] text-slate-500 font-medium">
                  {lang === 'ta'
                    ? '💡 குறிப்பு: கீழே உள்ள "கணினி உள்ளூர் காப்புப்பிரதி" (Local JSON) இணையம் அல்லது ஃபயர்பேஸ் அமைப்பு இன்றியும் 100% வேலை செய்யும்.'
                    : '💡 Note: Local JSON backup below works 100% offline with zero cloud configuration.'}
                </span>
              </div>

              {showManualToken && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {lang === 'ta' ? 'கூகிள் அணுகல் டோக்கன் (Bearer Access Token):' : 'OAuth Access Token:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="ya29.a0AfH6SM..."
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleApplyManualToken}
                      disabled={!manualTokenInput.trim() || isLoading}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded font-semibold text-xs"
                    >
                      {lang === 'ta' ? 'பயன்படுத்து' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cloud Drive Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              ></span>
              <span className="text-xs font-bold text-slate-800">
                {isConnected ? t.driveStatusConnected : t.driveStatusDisconnected}
              </span>
            </div>
            {googleUserEmail && (
              <span className="text-xs font-mono text-emerald-800 font-bold mt-1 block">
                📧 {googleUserEmail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCreateDriveBackup}
              disabled={!isConnected || isLoading}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
            >
              <span>💾</span>
              <span>{t.backupNow}</span>
            </button>
            <button
              onClick={fetchBackups}
              disabled={!isConnected || isLoading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              🔄 {t.refresh}
            </button>
          </div>
        </div>

        {/* Backups List */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.backupsList}
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              {driveBackups.length} {t.records}
            </span>
          </div>

          {!isConnected ? (
            <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-lg">
              <p>
                {lang === 'ta'
                  ? 'உங்கள் கூகிள் டிரைவில் உள்ள காப்புப்பிரதிகளைப் பார்க்க "கூகிள் கணக்குடன் இணைக்கவும்" பொத்தானை அழுத்தவும்.'
                  : 'Connect with Google to view and sync your cloud database backups.'}
              </p>
            </div>
          ) : driveBackups.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-slate-100 rounded-lg">
              {lang === 'ta'
                ? 'கூகிள் டிரைவில் காப்புப்பிரதிகள் எதுவும் இல்லை. மேலே உள்ள "இப்போதே காப்புப்பிரதி எடுக்கவும்" பொத்தானை அழுத்தவும்.'
                : 'No backups found on Google Drive. Click "Backup Snapshot to Google Drive Now" to create your first cloud archive.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {driveBackups.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📄</span>
                    <div>
                      <div className="font-mono font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {new Date(item.createdTime).toLocaleString()} · {item.size}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmModalItem(item)}
                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-xs font-semibold transition-colors"
                    >
                      ↩️ {t.restoreFromDrive}
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(item)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete from Drive"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Local File Backup & Recovery Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
          {lang === 'ta' ? 'கணினி உள்ளூர் காப்புப்பிரதி (Local Backup / JSON)' : 'Local Machine Backup & Recovery'}
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          {lang === 'ta'
            ? 'இணைய இணைப்பு இல்லாத போதும் संपूर्ण தரவுத்தளத்தை JSON கோப்பாக சேமித்து வைத்துக்கொள்ளலாம்.'
            : 'Download or upload complete JSON snapshots locally for disaster recovery without internet access.'}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownloadLocalBackup}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            💾 {t.localExport}
          </button>

          <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-medium transition-colors shadow-xs">
            <span>📥 {t.localImport}</span>
            <input
              type="file"
              accept=".json"
              onChange={handleUploadLocalBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Restore Operation */}
      {confirmModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-2 text-amber-600 pb-2 border-b border-slate-100">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'ta' ? 'தரவுத்தள மீட்டெடுப்பு உறுதிப்படுத்தல்' : 'Confirm Database Restore'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              {t.confirmRestore}
            </p>

            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
              <div><span className="font-semibold">File:</span> {confirmModalItem.name}</div>
              <div><span className="font-semibold">Time:</span> {new Date(confirmModalItem.createdTime).toLocaleString()}</div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmModalItem(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleRestoreBackup}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                {lang === 'ta' ? 'மீட்டெடுக்கவும் (Confirm Restore)' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
