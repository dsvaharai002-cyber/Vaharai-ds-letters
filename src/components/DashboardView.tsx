import React from 'react';
import { Beneficiary, QueueToken, GNDivision, User, SystemAuditLog } from '../types';
import { Language, translations } from '../translations/i18n';
import { calculateAge } from '../services/storage';

interface DashboardViewProps {
  beneficiaries: Beneficiary[];
  tokens: QueueToken[];
  divisions: GNDivision[];
  users: User[];
  auditLogs: SystemAuditLog[];
  currentUser: User;
  lang: Language;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  beneficiaries,
  tokens,
  divisions,
  users,
  auditLogs,
  currentUser,
  lang,
  onNavigate,
}) => {
  const t = translations[lang];

  // If GN Officer, filter data relevant to their division
  const isGN = currentUser.role === 'GRAMANIILATHARI';
  const divisionCode = currentUser.division || '211';

  const relevantBeneficiaries = isGN
    ? beneficiaries.filter((b) => b.divisionCode === divisionCode)
    : beneficiaries;

  const relevantTokens = isGN
    ? tokens.filter((tok) => tok.divisionCode === divisionCode)
    : tokens;

  // Key Counts
  const totalCitizens = relevantBeneficiaries.length;
  const totalFamilies = new Set(relevantBeneficiaries.map((b) => b.householdNo)).size;
  const waitingTokensCount = relevantTokens.filter((tItem) => tItem.status === 'WAITING').length;
  const aswesumaCount = relevantBeneficiaries.filter((b) => b.welfareScheme.startsWith('ASWESUMA')).length;
  const samurdhiCount = relevantBeneficiaries.filter((b) => b.welfareScheme === 'SAMURDHI').length;
  const chronicIllnessCount = relevantBeneficiaries.filter((b) => b.chronicIllness && b.chronicIllness !== 'NONE').length;
  const youth16Count = relevantBeneficiaries.filter((b) => calculateAge(b.dob) === 16).length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 rounded-xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-amber-300 font-bold mb-1">
            {lang === 'ta' ? 'அதிகாரப்பூர்வ நிர்வாக தளம்' : 'Official Administration Portal'}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {t.appTitle}
          </h1>
          <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
            {t.appSubTitle}
          </p>

          <div className="flex items-center gap-2.5 mt-4 flex-wrap text-xs">
            <span className="bg-emerald-950/70 border border-emerald-700/60 px-3 py-1 rounded-lg">
              👤 {t.loggedAs}: <strong className="font-semibold text-white">{currentUser.name}</strong>
            </span>
            <span className="bg-emerald-950/70 border border-emerald-700/60 px-3 py-1 rounded-lg">
              🛡️ {t.role}: <strong className="font-mono text-amber-300">{currentUser.role}</strong>
            </span>
            {isGN && (
              <span className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg font-bold font-mono">
                GN {divisionCode}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid (Responsive 2x3 or 3x2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Citizens */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">{t.totalBeneficiaries}</span>
            <span>👥</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalCitizens}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {isGN ? `GN Div ${divisionCode}` : 'All 16 Divs'}
          </div>
        </div>

        {/* Total Households */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">{t.totalFamilies}</span>
            <span>🏡</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {totalFamilies}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {lang === 'ta' ? 'பதிவான குடும்பங்கள்' : 'Households'}
          </div>
        </div>

        {/* Waiting Queue Today */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">{t.waitingQueue}</span>
            <span>⏱️</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-amber-600 tabular-nums">
            {waitingTokensCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {lang === 'ta' ? 'வரிசையில்' : 'Waiting in Queue'}
          </div>
        </div>

        {/* Welfare Beneficiaries */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="truncate">அஸ்வெசும / சமுர்த்தி</span>
            <span>🌾</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-emerald-800 tabular-nums">
            {aswesumaCount + samurdhiCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {aswesumaCount} Asw · {samurdhiCount} Sam
          </div>
        </div>

        {/* Chronic Illness Cases (NEW) */}
        <div className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-red-700 text-xs font-semibold">
            <span className="truncate">நாள்பட்ட நோய்கள்</span>
            <span>🏥</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-red-700 tabular-nums">
            {chronicIllnessCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {lang === 'ta' ? 'CKD, புற்றுநோய், ஊனம்' : 'CKD, Cancer, Disability'}
          </div>
        </div>

        {/* 16-Year-Old Youth (NIC Applications) (NEW) */}
        <div className="bg-white border border-amber-300 bg-amber-50/30 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-amber-900 text-xs font-semibold">
            <span className="truncate">16 வயது (NIC)</span>
            <span>🎯</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-slate-900 tabular-nums">
            {youth16Count}
          </div>
          <div className="mt-0.5 text-[10px] text-amber-800 font-medium">
            {lang === 'ta' ? 'அடையாள அட்டை தேவை' : 'NIC Required'}
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
          {lang === 'ta' ? 'விரைவுச் செயல்பாடுகள்' : 'Quick Actions'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('beneficiaries')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">➕</div>
            <div className="text-xs font-bold">{t.addBeneficiary}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'தானியங்கி ID & பார்கோட்' : 'System ID & Barcode'}</div>
          </button>

          <button
            onClick={() => onNavigate('reception')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">🖨️</div>
            <div className="text-xs font-bold">{t.issueNewToken}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'தர்மல் ரசீது அச்சிடல்' : 'Thermal Print 58/80mm'}</div>
          </button>

          <button
            onClick={() => onNavigate('assistance')}
            className="p-3 bg-rose-50/70 hover:bg-rose-100/80 text-rose-950 border border-rose-200 hover:border-rose-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">🎁</div>
            <div className="text-xs font-bold">{lang === 'ta' ? 'உதவி வழங்கல் & இரட்டை உதவி தடுப்பு' : 'Relief & Anti-Duplication'}</div>
            <div className="text-[10px] text-rose-800 mt-0.5">{lang === 'ta' ? 'சிஎஸ்வி மாதிரி & குடும்ப QR' : 'CSV Model & Family QR'}</div>
          </button>

          <button
            onClick={() => onNavigate('ai-report')}
            className="p-3 bg-amber-50/70 hover:bg-amber-100/80 text-amber-950 border border-amber-200 hover:border-amber-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">✨</div>
            <div className="text-xs font-bold">{t.navAiReport}</div>
            <div className="text-[10px] text-amber-800 mt-0.5">{lang === 'ta' ? 'தேவைகள் பகுப்பாய்வு' : 'AI Needs Assessment'}</div>
          </button>

          <button
            onClick={() => onNavigate('drive')}
            className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors"
          >
            <div className="text-xl mb-1">☁️</div>
            <div className="text-xs font-bold">{t.navDrive}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'ta' ? 'மேமிப்பகம் & மீட்டல்' : 'Cloud Sync'}</div>
          </button>
        </div>
      </div>

      {/* Two Column Section: 16 GN Divisions & Live Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 16 GN Divisions of Vaharai */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {lang === 'ta' ? 'வாகரை 16 கிராம அலுவலர் பிரிவுகள்' : '16 GN Divisions of Vaharai'}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">16 Divisions</span>
          </div>

          <div className="w-full overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full min-w-[500px] text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">குறியீடு / Code</th>
                  <th className="py-2.5 px-3">பிரிவுப் பெயர் / Name</th>
                  <th className="py-2.5 px-3">கிராம அலுவலர் / Officer</th>
                  <th className="py-2.5 px-3 text-right">பிரஜைகள் / Citizens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {divisions.map((d) => {
                  const divCitizens = beneficiaries.filter((b) => b.divisionCode === d.code).length;
                  const isCurrentOfficerDiv = isGN && divisionCode === d.code;
                  return (
                    <tr
                      key={d.code}
                      className={`hover:bg-slate-50 ${isCurrentOfficerDiv ? 'bg-emerald-50/70 font-semibold' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">
                        {d.code}
                        {isCurrentOfficerDiv && (
                          <span className="ml-1.5 text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded font-sans">
                            {lang === 'ta' ? 'உங்கள் பிரிவு' : 'Your Div'}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900">{d.nameTa}</span>
                        <span className="text-[11px] text-slate-500 ml-1.5">({d.nameEn})</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{d.gnOfficerName || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-emerald-800">
                        {divCitizens}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Audit Log / System Activity */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {t.navAudit}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Live</span>
          </div>

          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80 text-xs">
            {auditLogs.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                {lang === 'ta' ? 'தணிக்கைப் பதிவுகள் எதுவும் இல்லை' : 'No recent system events.'}
              </div>
            ) : (
              auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="pb-2.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-semibold text-slate-600">{log.userName}</span>
                  </div>
                  <div className="text-slate-800 font-medium mt-0.5 leading-snug">
                    {log.details}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
