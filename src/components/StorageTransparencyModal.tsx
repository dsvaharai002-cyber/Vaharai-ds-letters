import React from 'react';
import { Language, translations } from '../translations/i18n';
import { getStorageLocationsInfo, createDatabaseSnapshot } from '../services/storage';
import { HardDrive, Server, Cloud, Download, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { downloadCsvFile } from '../services/csv';

interface StorageTransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const StorageTransparencyModal: React.FC<StorageTransparencyModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];
  const info = getStorageLocationsInfo();

  const handleDownloadFullBackup = () => {
    const snapshot = createDatabaseSnapshot();
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaharai_ds_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-amber-300">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {lang === 'ta' ? 'தரவுகள் எங்கு சேமிக்கப்படுகின்றன? (Data Storage)' : 'Where is Your Data Stored?'}
              </h3>
              <p className="text-xs text-emerald-200">
                {lang === 'ta'
                  ? 'பிரதேச செயலக 3-அடுக்கு பாதுகாப்பு தரவு களஞ்சிய கட்டமைப்பு'
                  : 'Divisional Secretariat 3-Tier Secure Data Storage Architecture'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Summary Alert */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <strong className="block font-bold mb-0.5">
                {lang === 'ta' ? 'அனைத்து தரவுகளும் 3 இடங்களில் பாதுகாப்பாக சேமிக்கப்படுகின்றன:' : 'All data is secured across 3 integrated storage locations:'}
              </strong>
              {lang === 'ta'
                ? 'உங்கள் கணினியில் நீங்கள் பதிவு செய்யும் பிரஜைகள், டோக்கன்கள், உதவிகள் அனைத்தும் தானியங்கியாக உள்ளக சேமிப்பகத்திலும், மத்திய சர்வரிலும் மற்றும் கூகிள் டிரைவிலும் ஒரே நேரத்தில் பாதுகாக்கப்படுகின்றன.'
                : 'Every citizen registration, token, and relief assistance record is instantly persisted in your browser, synced with the central office server, and backed up to Google Drive.'}
            </div>
          </div>

          {/* 3 Storage Tiers */}
          <div className="space-y-3">
            {/* Tier 1: Local Computer Browser Storage */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    1. {lang === 'ta' ? 'இந்த கணினியின் உள்ளக களஞ்சியம் (Browser LocalStorage)' : 'Local Computer Browser Storage'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {lang === 'ta' ? 'செயலில் உள்ளது' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                {info.browserStorage.descriptionTa}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white p-2 rounded-lg border border-slate-200 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">{lang === 'ta' ? 'பதிவான பிரஜைகள்' : 'Citizens'}</span>
                  <strong className="text-slate-900 text-sm">{info.browserStorage.beneficiariesCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{lang === 'ta' ? 'டோக்கன்கள்' : 'Tokens'}</span>
                  <strong className="text-slate-900 text-sm">{info.browserStorage.tokensCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{lang === 'ta' ? 'நிவாரண உதவிகள்' : 'Relief Aid'}</span>
                  <strong className="text-slate-900 text-sm">{info.browserStorage.assistanceCount}</strong>
                </div>
              </div>
            </div>

            {/* Tier 2: Central Divisional Secretariat Server */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                    <Server className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    2. {lang === 'ta' ? 'பிரதேச செயலக மத்திய சேவையகம் (Central Server /api/database)' : 'Central Office Database Server'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                  {info.serverDatabase.status === 'ONLINE' ? (lang === 'ta' ? 'இணைக்கப்பட்டுள்ளது' : 'Online Sync') : 'Standalone'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {info.serverDatabase.descriptionTa}
              </p>
            </div>

            {/* Tier 3: Google Drive Cloud Backup */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    3. {lang === 'ta' ? 'கூகிள் டிரைவ் கிளவுட் சேமிப்பு (Google Drive Master Backup)' : 'Google Drive Cloud Storage'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                  {lang === 'ta' ? 'பாதுகாப்பானது' : 'Cloud Backed'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-1">
                {info.cloudGoogleDrive.descriptionTa}
              </p>
              <div className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded border border-slate-200">
                {lang === 'ta' ? 'கோப்பு பெயர்:' : 'File:'} <strong className="text-slate-800">{info.cloudGoogleDrive.fileName}</strong>
              </div>
            </div>

            {/* Central Server & Capacity Q&A Explanatory Box (Requirement 06) */}
            <div className="p-4 bg-emerald-950 text-emerald-100 rounded-xl space-y-2.5 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                <Server className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ta' ? 'மத்திய சர்வர் (Central Server) வழிகாட்டி & கொள்ளளவு விபரம்' : 'Central Server Guide & Capacity Information'}</span>
              </div>
              <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-200">
                <p>
                  <strong className="text-amber-200">1. மத்திய சர்வர் எனப்படுவது எது?</strong><br />
                  இது செயலகத்தின் அனைத்து கணினிகளையும் இணைக்கும் மைய இயங்குதளம் (`/api/database`). வரவேற்பகத்தில் டோக்கன் வழங்குவது முதல், கிராம அலுவலர் பதிவுகள் வரை அனைத்தும் இந்த மத்திய சர்வர் ஊடாக பகிரப்படுகின்றன.
                </p>
                <p>
                  <strong className="text-amber-200">2. அதனை எவ்வாறு மாற்ற முடியும்?</strong><br />
                  மேல் வலது மூலையில் உள்ள 'Google Drive / மத்திய தரவுத்தளம்' மெனுவுக்குச் சென்று உங்கள் சொந்த உத்தியோகபூர்வ Google கணக்கை இணைத்து Drive File ID-ஐ மாற்றலாம்; அல்லது JSON கோப்பை தரவிறக்கம்/பதிவேற்றம் செய்து தரவுத்தளத்தை விரும்பியவாறு மாற்றியமைக்கலாம்.
                </p>
                <p>
                  <strong className="text-amber-200">3. அதன் கொள்ளளவு எவ்வளவு (Capacity)?</strong><br />
                  - <span className="text-white font-mono">Browser Storage:</span> ~10 MB (சுமார் 15,000+ பிரஜைகள்)<br />
                  - <span className="text-white font-mono">மத்திய Server Disk:</span> வரம்பற்றது (Unlimited JSON records)<br />
                  - <span className="text-white font-mono">Google Drive Cloud:</span> 15 GB இலவச இடம் (பல இலட்சம் குடும்பங்களின் விபரங்களை சேமிக்க போதுமானது).
                </p>
              </div>
            </div>
          </div>

          {/* Quick Manual Download Button */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 text-center sm:text-left">
              {lang === 'ta'
                ? 'உங்கள் கணினியில் முழு காப்புப்பிரதி கோப்பை நேரடியாக பதிவிறக்கிக் கொள்ளலாம்.'
                : 'You can download the full database backup JSON directly to your PC anytime.'}
            </span>
            <button
              onClick={handleDownloadFullBackup}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'ta' ? 'முழு காப்புப்பிரதியை பதிவிறக்குக (JSON)' : 'Download Full Backup (JSON)'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
