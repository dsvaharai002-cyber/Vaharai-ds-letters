import React, { useState } from 'react';
import { User } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Tv,
  Sparkles,
  FileSpreadsheet,
  HardDrive,
  ShieldCheck,
  ScanLine,
  LogOut,
  FolderKanban,
  Settings2,
  CheckCircle2,
  ClipboardList,
  Gift,
  Cloud,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Search,
  HeartHandshake,
  Baby,
  Compass,
  Home,
} from 'lucide-react';
import { DriveSyncStatus } from '../services/googleDrive';

interface SidebarProps {
  currentUser: User | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  onLogout: () => void;
  onOpenScanner: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isDriveConnected: boolean;
  driveSyncStatus: DriveSyncStatus;
  isSyncing: boolean;
  onQuickSync: () => void;
  onSaveToDriveNow: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentTab,
  setCurrentTab,
  lang,
  onLogout,
  onOpenScanner,
  isOpen,
  onToggle,
  isDriveConnected,
  driveSyncStatus,
  isSyncing,
  onQuickSync,
  onSaveToDriveNow,
}) => {
  const t = translations[lang];

  // RBAC permissions
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin = currentUser?.role === 'ADMIN 1' || currentUser?.role === 'ADMIN 2' || isSuperAdmin;
  const isReception = currentUser?.role === 'Reception Registrar';
  const isNormal = currentUser?.role === 'NORMAL';
  const isGramaNiladhari = currentUser?.role === 'GRAMANIILATHARI';
  const isElderlyOfficer = currentUser?.role === 'ELDERLY_OFFICER';
  const isMaternityOfficer = currentUser?.role === 'MATERNITY_OFFICER' || currentUser?.role === 'ECDO';
  const isDisabilityOfficer = currentUser?.role === 'DISABILITY_OFFICER';
  const isLandOfficer = currentUser?.role === 'LAND_OFFICER';

  const canAccessStaff = isSuperAdmin;
  const canAccessDrive = isAdmin;
  const canAccessAi = isAdmin;
  const canAccessLand = isAdmin || isLandOfficer;
  const canAccessFamilyCenter = !isReception && !isNormal && !isLandOfficer;
  const canAccessBeneficiaries = !isReception && !isNormal && !isElderlyOfficer && !isMaternityOfficer && !isLandOfficer;
  const canAccessElderly = (isAdmin || isElderlyOfficer || isGramaNiladhari) && !isLandOfficer;
  const canAccessMaternity = (isAdmin || isMaternityOfficer || isGramaNiladhari) && !isLandOfficer;
  const canAccessCsv = (isAdmin || currentUser?.role === 'DATAENRY OFFCER') && !isNormal && !isLandOfficer;
  const canAccessDashboard = !isNormal && !isElderlyOfficer && !isMaternityOfficer && !isLandOfficer;
  const canAccessReception = !isNormal && !isElderlyOfficer && !isMaternityOfficer && !isLandOfficer;
  const canAccessUniversalSearch = !isNormal;

  const publicServiceItems = [
    ...(canAccessUniversalSearch
      ? [
          {
            id: 'universal-search',
            title: lang === 'ta' ? 'பொதுவான தேடல்' : 'Universal Search',
            subtitle: lang === 'ta' ? 'NIC / QR சகல தரவுகள்' : '360° Citizen Dossier',
            icon: Search,
            badge: lang === 'ta' ? 'தேடல்' : 'Search',
          },
        ]
      : []),
    ...(canAccessReception
      ? [
          {
            id: 'reception',
            title: t.navReception,
            subtitle: lang === 'ta' ? 'டோக்கன் வழங்கல்' : 'Issue token',
            icon: Ticket,
          },
        ]
      : []),
    ...(!isLandOfficer
      ? [
          {
            id: 'live-display',
            title: t.navLiveDisplay,
            subtitle: lang === 'ta' ? 'அழைப்பு ஒலி & டிவி' : 'Live Counter TV',
            icon: Tv,
            badge: lang === 'ta' ? 'நேரலை' : 'Live',
          },
        ]
      : []),
    ...(!isNormal
      ? [
          {
            id: 'scanner-action',
            title: t.quickScanner,
            subtitle: lang === 'ta' ? 'பார்கோட் ஸ்கேனர்' : 'Scan barcode',
            icon: ScanLine,
            isAction: true,
          },
        ]
      : []),
  ];

  const registryItems = [
    ...(canAccessFamilyCenter
      ? [
          {
            id: 'family-center',
            title: lang === 'ta' ? 'குடும்ப தரவு மையம்' : 'Family Data Center',
            subtitle: lang === 'ta' ? '100 புள்ளி வறுமை மதிப்பீடு' : '100-Point Scoring & Dossier',
            icon: Home,
            badge: '100 Pts',
          },
        ]
      : []),
    ...(canAccessLand
      ? [
          {
            id: 'land',
            title: lang === 'ta' ? 'காணிப் பிரிவு' : 'Land Records',
            subtitle: lang === 'ta' ? 'காணி உறுதி, அனுமதிப்பத்திரம்' : 'Permits, LDO & Grants',
            icon: Compass,
            badge: lang === 'ta' ? 'காணி' : 'Land',
          },
        ]
      : []),
    ...(canAccessElderly
      ? [
          {
            id: 'elderly',
            title: lang === 'ta' ? 'முதியோர் உத்தியோகத்தர்' : 'Elderly Welfare',
            subtitle: lang === 'ta' ? '70+ கொடுப்பனவு & உதவி' : 'Senior Citizens Care',
            icon: HeartHandshake,
            badge: lang === 'ta' ? 'முதியோர்' : 'Elderly',
          },
        ]
      : []),
    ...(canAccessMaternity
      ? [
          {
            id: 'maternity',
            title: lang === 'ta' ? 'கர்ப்பிணித் தாய்மார்' : 'Pregnant Mothers',
            subtitle: lang === 'ta' ? '10 மாத போசணை முத்திரை' : 'Nutrition Food Stamps',
            icon: Baby,
            badge: lang === 'ta' ? 'முத்திரை' : 'Maternity',
          },
        ]
      : []),
    ...(canAccessBeneficiaries
      ? [
          {
            id: 'beneficiaries',
            title: currentUser?.role === 'DISABILITY_OFFICER'
              ? (lang === 'ta' ? 'அங்கவீனர் பதிவேடு' : 'Disability Registry')
              : t.navBeneficiaries,
            subtitle: currentUser?.role === 'DISABILITY_OFFICER'
              ? (lang === 'ta' ? 'மாற்றுத்திறனாளிகள் தளம்' : 'Disability Welfare Portal')
              : (lang === 'ta' ? 'பிரஜை விபரம் & அட்டை' : 'Citizens registry'),
            icon: Users,
          },
        ]
      : []),
    ...(!isReception && !isNormal && !isElderlyOfficer && !isMaternityOfficer && !isLandOfficer
      ? [
          {
            id: 'assistance',
            title: lang === 'ta' ? 'உதவி & இரட்டை தடுப்பு' : 'Relief Desk',
            subtitle: lang === 'ta' ? 'நிவாரண பதிவு & QR' : 'Anti-Duplication',
            icon: Gift,
            badge: lang === 'ta' ? 'நிவாரணம்' : 'Relief',
          },
        ]
      : []),
    ...(canAccessCsv
      ? [
          {
            id: 'csv',
            title: t.navCsv,
            subtitle: lang === 'ta' ? 'CSV பதிவேற்றம்/இறக்கம்' : 'CSV Import/Export',
            icon: FileSpreadsheet,
          },
        ]
      : []),
    ...(canAccessAi && !isLandOfficer
      ? [
          {
            id: 'ai-report',
            title: t.navAiReport,
            subtitle: lang === 'ta' ? 'தேவைகள் பகுப்பாய்வு' : 'AI Needs Assessment',
            icon: Sparkles,
            badge: 'AI',
          },
        ]
      : []),
  ];

  const adminItems = [
    ...(isSuperAdmin
      ? [
          {
            id: 'services',
            title: lang === 'ta' ? 'சேவைகள் கட்டமைப்பு' : 'Service Management',
            subtitle: lang === 'ta' ? 'புதிய சேவை சேர்த்தல் & மாற்றல்' : 'Custom Services & Counters',
            icon: Settings2,
            badge: lang === 'ta' ? 'சுப்பர் அட்மின்' : 'Super Admin',
          },
        ]
      : []),
    ...(canAccessStaff
      ? [
          {
            id: 'staff',
            title: t.navStaff,
            subtitle: lang === 'ta' ? 'அலுவலர் கணக்குகள்' : 'Staff Accounts & Roles',
            icon: ShieldCheck,
            badge: lang === 'ta' ? 'நிர்வாகம்' : 'Admin',
          },
        ]
      : []),
    ...(canAccessDrive
      ? [
          {
            id: 'drive',
            title: lang === 'ta' ? 'கூகிள் டிரைவ் காப்புப்பதிவு' : 'Google Drive Backup',
            subtitle: lang === 'ta' ? 'தானியங்கி கிளவுட் ஒத்திசைவு' : 'Cloud Auto Sync',
            icon: HardDrive,
            badge: isDriveConnected ? (lang === 'ta' ? 'இணைப்பு' : 'Connected') : (lang === 'ta' ? 'கிளவுட்' : 'Cloud'),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            id: 'service-audit',
            title: lang === 'ta' ? 'சேவை தணிக்கை' : 'Service Audit',
            subtitle: lang === 'ta' ? 'நிறைவடையாதோர் விபரம்' : 'Pending & Ratings',
            icon: ClipboardList,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[41px] left-0 h-screen lg:h-[calc(100vh-41px)] bg-slate-900 text-slate-100 border-r border-slate-800 z-50 transition-all duration-300 flex flex-col shrink-0 overflow-hidden shadow-2xl lg:shadow-none ${
          isOpen ? 'w-64 sm:w-72 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 bg-white rounded-full shrink-0 shadow-xs">
              <VaharaiLogo size={28} className="w-7 h-7" />
            </div>
            {isOpen && (
              <div className="min-w-0 leading-tight">
                <h1 className="text-xs font-bold text-white tracking-tight truncate">
                  {lang === 'ta' ? 'வாகரை பிரதேச செயலகம்' : 'DS Vaharai Office'}
                </h1>
                <p className="text-[10px] text-emerald-400 font-medium truncate">
                  {lang === 'ta' ? 'ஒருங்கிணைந்த நிர்வாக தளம்' : 'Integrated Admin Portal'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menus List (Scrollable) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-2.5 space-y-4">
          {/* Section 1: Dashboard */}
          {canAccessDashboard && (
            <div>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all group ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={t.navDashboard}
              >
                <div className={`p-1 rounded-lg shrink-0 ${currentTab === 'dashboard' ? 'bg-emerald-700' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                {isOpen && (
                  <div className="min-w-0 flex-1 truncate">
                    <div className="text-xs leading-none">{t.navDashboard}</div>
                    <div className="text-[10px] opacity-75 truncate mt-0.5">
                      {lang === 'ta' ? 'முதன்மை நிலைப்பலகை' : 'Overview & Analytics'}
                    </div>
                  </div>
                )}
                {isOpen && currentTab === 'dashboard' && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-ping" />
                )}
              </button>
            </div>
          )}

          {/* Section 2: Public Services */}
          <div>
            {isOpen && (
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Ticket className="w-3 h-3 text-emerald-400" />
                <span>{t.menuPublicServices}</span>
              </div>
            )}
            <div className="space-y-1">
              {publicServiceItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isAction) {
                        onOpenScanner();
                      } else {
                        setCurrentTab(item.id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all group ${
                      isCurrent
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={item.title}
                  >
                    <div className={`p-1 rounded-lg shrink-0 ${isCurrent ? 'bg-emerald-700' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isOpen && (
                      <div className="min-w-0 flex-1 truncate">
                        <div className="text-xs leading-none truncate">{item.title}</div>
                        <div className="text-[10px] opacity-70 truncate mt-0.5">{item.subtitle}</div>
                      </div>
                    )}
                    {isOpen && item.badge && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-400 text-slate-950 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Registry & Analytics */}
          <div>
            {isOpen && (
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FolderKanban className="w-3 h-3 text-emerald-400" />
                <span>{t.menuRegistryAnalytics}</span>
              </div>
            )}
            <div className="space-y-1">
              {registryItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all group ${
                      isCurrent
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={item.title}
                  >
                    <div className={`p-1 rounded-lg shrink-0 ${isCurrent ? 'bg-emerald-700' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isOpen && (
                      <div className="min-w-0 flex-1 truncate">
                        <div className="text-xs leading-none truncate">{item.title}</div>
                        <div className="text-[10px] opacity-70 truncate mt-0.5">{item.subtitle}</div>
                      </div>
                    )}
                    {isOpen && item.badge && (
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded shrink-0 ${
                        item.badge === 'AI' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-800 text-emerald-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Administration & Cloud */}
          <div>
            {isOpen && (
              <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Settings2 className="w-3 h-3 text-emerald-400" />
                <span>{t.menuAdministration}</span>
              </div>
            )}
            <div className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all group ${
                      isCurrent
                        ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={item.title}
                  >
                    <div className={`p-1 rounded-lg shrink-0 ${isCurrent ? 'bg-emerald-700' : 'bg-slate-800 group-hover:bg-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isOpen && (
                      <div className="min-w-0 flex-1 truncate">
                        <div className="text-xs leading-none truncate">{item.title}</div>
                        <div className="text-[10px] opacity-70 truncate mt-0.5">{item.subtitle}</div>
                      </div>
                    )}
                    {isOpen && item.badge && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-slate-800 text-slate-300 font-mono shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Google Drive & Cloud Live Sync Status Box */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 shrink-0 space-y-2">
          {isOpen ? (
            <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold">
                  <Cloud className={`w-3.5 h-3.5 ${isDriveConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-slate-200">
                    {isDriveConnected
                      ? (lang === 'ta' ? 'கூகிள் டிரைவ் நேரலை' : 'Google Drive Active')
                      : (lang === 'ta' ? 'மத்திய சேமிப்பகம்' : 'Central Storage')}
                  </span>
                </div>
                <span className={`w-2 h-2 rounded-full ${isDriveConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                {driveSyncStatus.lastSyncedAt
                  ? (lang === 'ta'
                      ? `கடைசியாக சேமிக்கப்பட்டது: ${new Date(driveSyncStatus.lastSyncedAt).toLocaleTimeString()}`
                      : `Last synced: ${new Date(driveSyncStatus.lastSyncedAt).toLocaleTimeString()}`)
                  : (lang === 'ta' ? 'கோப்பு இணைக்கப்பட்டு தயாராக உள்ளது' : 'Sync ready')}
              </p>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={onSaveToDriveNow}
                  disabled={isSyncing}
                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                  title="Save current database directly to Google Drive"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ta' ? 'டிரைவில் சேமி' : 'Save Drive'}</span>
                </button>
                <button
                  onClick={onQuickSync}
                  disabled={isSyncing}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Pull latest data from Drive / Server"
                >
                  <HardDrive className="w-3 h-3 text-slate-400" />
                  <span>{lang === 'ta' ? 'டிரைவிலிருந்து' : 'Pull Drive'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <button
                onClick={onSaveToDriveNow}
                disabled={isSyncing}
                className="p-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                title={lang === 'ta' ? 'டிரைவில் உடனே சேமி' : 'Save to Drive'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}

          {/* User Session Quick Card */}
          {currentUser && (
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                {isOpen && (
                  <div className="min-w-0 truncate">
                    <div className="text-[11px] font-bold text-slate-200 truncate leading-tight">
                      {currentUser.name.split('(')[0]}
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono truncate">
                      {currentUser.role}
                    </div>
                  </div>
                )}
              </div>

              {isOpen && (
                <button
                  onClick={onLogout}
                  className="p-1 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
                  title={t.logout}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
