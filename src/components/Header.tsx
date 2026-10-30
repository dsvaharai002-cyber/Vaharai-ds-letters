import React from 'react';
import { User } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import {
  Menu,
  ScanLine,
  LogOut,
  Cloud,
  RefreshCw,
  Tv,
  CheckCircle2,
} from 'lucide-react';
import { DriveSyncStatus } from '../services/googleDrive';

interface HeaderProps {
  currentUser: User | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  onLogout: () => void;
  onOpenScanner: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  isDriveConnected: boolean;
  driveSyncStatus: DriveSyncStatus;
  isSyncing: boolean;
  onSaveToDriveNow: () => void;
  onOpenStorageTransparency?: () => void;
  onOpenOfficeLayout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  onLogout,
  onOpenScanner,
  sidebarOpen,
  onToggleSidebar,
  isDriveConnected,
  driveSyncStatus,
  isSyncing,
  onSaveToDriveNow,
  onOpenStorageTransparency,
  onOpenOfficeLayout,
}) => {
  const t = translations[lang];
  const isNormal = currentUser?.role === 'NORMAL';

  // Get active tab display name
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return t.navDashboard;
      case 'beneficiaries':
        return t.navBeneficiaries;
      case 'reception':
        return t.navReception;
      case 'live-display':
        return t.navLiveDisplay;
      case 'assistance':
        return lang === 'ta' ? 'உதவி வழங்கல் & இரட்டை உதவி தடுப்பு' : 'Relief Desk';
      case 'csv':
        return t.navCsv;
      case 'staff':
        return t.navStaff;
      case 'drive':
        return lang === 'ta' ? 'கூகிள் டிரைவ் & சீட் ஒத்திசைவு' : 'Google Drive & Sheets';
      case 'ai-report':
        return t.navAiReport;
      case 'service-audit':
        return lang === 'ta' ? 'சேவை தணிக்கை' : 'Service Audit';
      default:
        return tab;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print w-full max-w-full overflow-x-hidden">
      {/* 1. Official Government Top Strip */}
      <div className="bg-emerald-950 text-emerald-100 text-[11px] px-3 sm:px-6 py-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="font-semibold truncate">{t.republicSriLanka}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{t.batticaloaDistrict}</span>
          {currentUser && (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded font-mono text-[10px] whitespace-nowrap font-bold">
                {currentUser.role} {currentUser.division && currentUser.division !== 'ALL' ? `(${currentUser.division})` : ''}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-emerald-900 transition-colors text-white font-bold text-xs"
            title="Switch Language"
          >
            <span>🌐</span>
            <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main App Bar */}
      <div className="px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Sidebar Toggle & Office Logo / Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          {currentUser && !isNormal && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 hover:bg-slate-100 text-slate-700 hover:text-slate-950 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
              aria-label="Toggle Navigation Sidebar"
              title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              <Menu className="w-4 h-4 text-emerald-800" />
              <span className="text-xs font-bold hidden sm:inline text-slate-800">
                {lang === 'ta' ? 'மெனு' : 'Menu'}
              </span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="p-0.5 bg-white rounded-full shadow-xs shrink-0">
              <VaharaiLogo size={28} className="w-7 h-7" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-[220px] md:max-w-none">
                  {lang === 'ta' ? 'வாகரை பிரதேச செயலகம்' : 'Koralaipattu North DS'}
                </span>
                <span className="text-slate-300 hidden md:inline">/</span>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 hidden md:inline-flex items-center gap-1">
                  {getTabLabel(currentTab)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Live Google Drive & Central Database Status Pill */}
        {currentUser && !isNormal && (
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Cloud className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-emerald-600' : 'text-amber-500'}`} />
              <span className="text-[11px]">
                {isDriveConnected
                  ? (lang === 'ta' ? 'கூகிள் டிரைவ் நேரலை' : 'Google Drive Connected')
                  : (lang === 'ta' ? 'உள்ளூர் & சர்வர் சேமிப்பு' : 'Local & Central Storage')}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${isDriveConnected ? 'bg-emerald-500' : 'bg-amber-400'} animate-pulse`} />
            </div>

            <button
              onClick={onSaveToDriveNow}
              disabled={isSyncing}
              className="ml-1 px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
              title="Save changes to Google Drive and Server"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{lang === 'ta' ? 'டிரைவில் சேமி' : 'Save Drive'}</span>
            </button>
          </div>
        )}

        {/* Dedicated Live Counter view role badge */}
        {currentUser && isNormal && (
          <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-950 px-3 py-1 rounded-lg text-xs font-bold">
            <Tv className="w-4 h-4 text-amber-600" />
            <span>Dedicated Live TV Screen Mode</span>
          </div>
        )}

        {/* Right Zone: Quick Barcode Action, Profile & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {currentUser ? (
            <>
              {/* Office Layout Blueprint trigger */}
              {onOpenOfficeLayout && !isNormal && (
                <button
                  onClick={onOpenOfficeLayout}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
                  title={lang === 'ta' ? 'அலுவலக 33 கவுண்டர் / பிரிவுகள் வரைபடம்' : '33 Office Counters Map'}
                >
                  <span>🏢</span>
                  <span className="hidden lg:inline">{lang === 'ta' ? 'வரைபடம்' : 'Layout'}</span>
                </button>
              )}

              {/* Storage Transparency trigger (Requirement 08: தரவுகள் எங்கு சேமிக்கப்படுகிறது?) */}
              {onOpenStorageTransparency && !isNormal && (
                <button
                  onClick={onOpenStorageTransparency}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                  title={lang === 'ta' ? 'தரவுகள் எங்கு சேமிக்கப்படுகின்றன என்ற விபரம்' : 'Where data is stored transparency'}
                >
                  <span>💾</span>
                  <span className="hidden lg:inline">{lang === 'ta' ? 'சேமிப்பு' : 'Storage'}</span>
                </button>
              )}

              {/* Quick Scanner Action button */}
              {!isNormal && (
                <button
                  onClick={onOpenScanner}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition-colors"
                  title="Barcode / NIC Scanner"
                >
                  <ScanLine className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline font-semibold">
                    {lang === 'ta' ? 'பார்கோட்' : 'Scanner'}
                  </span>
                </button>
              )}

              {/* User Session Info & Logout */}
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                    {currentUser.name.split('(')[0]}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ID: {currentUser.id}
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  title={t.logout}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.logout}</span>
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-slate-500 font-medium">
              {lang === 'ta' ? 'உள்நுழைக' : 'Please Sign In'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
