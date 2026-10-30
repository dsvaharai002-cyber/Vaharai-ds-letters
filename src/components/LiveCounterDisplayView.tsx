import React, { useState, useEffect } from 'react';
import { QueueToken, Beneficiary, GNDivision } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { CitizenProfileModal } from './CitizenProfileModal';
import { BeneficiaryIdCardModal } from './BeneficiaryIdCardModal';
import { ThermalPrintReceipt } from './ThermalPrintReceipt';

interface LiveCounterDisplayViewProps {
  tokens: QueueToken[];
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  lang: Language;
  onUpdateTokens?: (tokens: QueueToken[]) => void;
  onAuditLog?: (action: string, details: string) => void;
  isNormalUser?: boolean;
}

export const LiveCounterDisplayView: React.FC<LiveCounterDisplayViewProps> = ({
  tokens,
  beneficiaries,
  divisions,
  lang,
  onUpdateTokens,
  onAuditLog,
  isNormalUser = false,
}) => {
  const t = translations[lang];

  // Fullscreen state for TV Monitor
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Selected Token for Citizen Profile Dossier Modal ("அனைத்து தரவுகளையும் பார்க்க - my logo")
  const [selectedTokenForDetails, setSelectedTokenForDetails] = useState<QueueToken | null>(null);
  const [selectedBeneficiaryForCard, setSelectedBeneficiaryForCard] = useState<Beneficiary | null>(null);
  const [activeReceiptToken, setActiveReceiptToken] = useState<QueueToken | null>(null);

  // Digital clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio chime
  const playCallingChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch {
      // AudioContext fallback
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Find corresponding beneficiary for a token
  const getBeneficiaryForToken = (token: QueueToken): Beneficiary | undefined => {
    if (token.citizenNic) {
      const byNic = beneficiaries.find(
        (b) => b.nic.toLowerCase().trim() === token.citizenNic.toLowerCase().trim()
      );
      if (byNic) return byNic;
    }
    if (token.citizenName) {
      const byName = beneficiaries.find(
        (b) =>
          b.nameTa.toLowerCase().includes(token.citizenName.toLowerCase()) ||
          b.nameEn.toLowerCase().includes(token.citizenName.toLowerCase())
      );
      if (byName) return byName;
    }
    return undefined;
  };

  const handleOpenCitizenDetails = (token: QueueToken) => {
    setSelectedTokenForDetails(token);
    if (onAuditLog) {
      onAuditLog('VIEW_CITIZEN_DOSSIER', `Viewed details for token ${token.tokenNumber} (${token.citizenName || token.citizenNic})`);
    }
  };

  const handleCompleteService = (tokenId: string) => {
    if (!onUpdateTokens) return;
    const updated = tokens.map((tok) => {
      if (tok.id === tokenId) {
        return { ...tok, status: 'COMPLETED' as const, completedAt: new Date().toISOString() };
      }
      return tok;
    });
    onUpdateTokens(updated);
  };

  const handleRecallToken = (tokenId: string) => {
    playCallingChime();
    if (!onUpdateTokens) return;
    const updated = tokens.map((tok) => {
      if (tok.id === tokenId) {
        return { ...tok, status: 'CALLING' as const, calledAt: new Date().toISOString() };
      }
      return tok;
    });
    onUpdateTokens(updated);
  };

  // Filtering active calling vs waiting
  const callingTokens = tokens.filter((tok) => tok.status === 'CALLING' || tok.status === 'SERVING');
  const waitingTokens = tokens.filter((tok) => tok.status === 'WAITING');
  const completedTokens = tokens.filter((tok) => tok.status === 'COMPLETED');

  // Currently serving per Counter (1 to 6)
  const countersList = [1, 2, 3, 4, 5, 6];

  const matchedBeneficiary = selectedTokenForDetails
    ? getBeneficiaryForToken(selectedTokenForDetails)
    : null;

  const matchedDivision = matchedBeneficiary
    ? divisions.find((d) => d.code === matchedBeneficiary.divisionCode)
    : undefined;

  return (
    <div className={`space-y-6 w-full max-w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 overflow-y-auto text-white' : ''}`}>
      {/* Live Counter Display Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-emerald-800/60 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 relative z-10">
          {/* Logo and Titles */}
          <div className="flex items-center gap-4 text-center lg:text-left">
            <div className="p-1 bg-white rounded-full shadow-lg shrink-0">
              <VaharaiLogo size={68} className="w-16 h-16 sm:w-20 sm:h-20" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest flex items-center justify-center lg:justify-start gap-2">
                <span>🏛️ {t.republicSriLanka}</span>
                <span>·</span>
                <span>{t.batticaloaDistrict}</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-0.5">
                {t.appTitle}
              </h1>
              <div className="text-xs sm:text-sm text-emerald-200 font-semibold flex items-center justify-center lg:justify-start gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{lang === 'ta' ? 'நேரலை கவுண்டர் காட்சிப் பலகை (Live Counter Display)' : 'Public Waiting Hall Live Counter Display'}</span>
                {isNormalUser && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                    நோமல் திரை (Normal Screen Mode)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Clock and TV Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {/* Live Clock Display */}
            <div className="bg-black/40 border border-emerald-500/30 px-4 py-2 rounded-xl text-center font-mono">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-wider">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="text-[10px] text-slate-300 uppercase tracking-wider">
                {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>

            {/* TV Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={playCallingChime}
                className="px-3 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm border border-emerald-500/40"
                title="Play Calling Bell Chime"
              >
                <span>🔔</span>
                <span className="hidden sm:inline">{lang === 'ta' ? 'அழைப்பு ஒலி' : 'Chime'}</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md"
                title="Toggle Fullscreen TV Monitor"
              >
                <span>📺</span>
                <span>{isFullscreen ? (lang === 'ta' ? 'வெளியேறு' : 'Exit TV') : (lang === 'ta' ? 'டிவி முழுத்திரை' : 'TV Fullscreen')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 6 Active Counters Big Screen Display */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">📢</span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {t.nowServing} · {lang === 'ta' ? 'கவுண்டர்கள் நேரலை அழைப்பு பலகை' : 'Active Calling Counters'}
            </h2>
          </div>
          <div className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
            {callingTokens.length} {lang === 'ta' ? 'கவுண்டர்கள் இயங்குகின்றன' : 'Serving Now'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {countersList.map((counterNum) => {
            const currentToken = callingTokens.find((tItem) => tItem.counterNo === counterNum);

            let serviceNameTa = 'பொது சேவை';
            let serviceNameEn = 'General Service';
            if (counterNum === 1) { serviceNameTa = 'பிறப்பு/இறப்பு பதிவு'; serviceNameEn = 'Civil Registrar'; }
            if (counterNum === 2) { serviceNameTa = 'காணி அனுமதிப்பத்திரம்'; serviceNameEn = 'Land Permits'; }
            if (counterNum === 3) { serviceNameTa = 'கிராம அலுவலர் சான்றிதழ்'; serviceNameEn = 'Grama Niladhari'; }
            if (counterNum === 4) { serviceNameTa = 'அஸ்வெசும / சமூர்த்தி'; serviceNameEn = 'Welfare Schemes'; }
            if (counterNum === 5) { serviceNameTa = 'பொதுமக்கள் உதவி நிவாரணம்'; serviceNameEn = 'Public Assistance'; }
            if (counterNum === 6) { serviceNameTa = 'வழிகாட்டல் & தகவல்கள்'; serviceNameEn = 'General Guidance'; }

            return (
              <div
                key={counterNum}
                className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-sm flex flex-col justify-between ${
                  currentToken
                    ? 'bg-slate-900 text-white border-amber-400 shadow-md ring-2 ring-amber-400/20'
                    : 'bg-white text-slate-800 border-slate-200 opacity-80'
                }`}
              >
                {/* Counter Header Strip */}
                <div className={`px-4 py-2 flex items-center justify-between text-xs font-bold border-b ${
                  currentToken ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-black">COUNTER {counterNum}</span>
                    <span className="text-[10px] opacity-80">({serviceNameTa})</span>
                  </div>
                  {currentToken && (
                    <span className="text-[10px] uppercase tracking-wider font-extrabold bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                      SERVING
                    </span>
                  )}
                </div>

                {/* Token Display Area */}
                <div className="p-4 sm:p-5 text-center flex-1 flex flex-col justify-center">
                  {currentToken ? (
                    <>
                      <div className="text-[11px] text-amber-300 uppercase tracking-widest font-mono">
                        வரிசை இலக்கம் / Token
                      </div>
                      <div className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-white my-1 drop-shadow-sm">
                        {currentToken.tokenNumber}
                      </div>

                      {/* Citizen Name & Whom to Meet */}
                      <div className="mt-2 text-xs font-bold text-emerald-200 truncate">
                        {currentToken.citizenName || 'Public Citizen (பிரஜை)'}
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                        NIC: {currentToken.citizenNic || 'Not Registered'} · Div: {currentToken.divisionCode}
                      </div>

                      {/* Whom to Meet Badge (யாரை பார்க்க வேண்டும்) */}
                      <div className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-400/50 rounded-lg text-amber-300 text-xs font-semibold mx-auto">
                        <span>👔 {lang === 'ta' ? 'அலுவலர்:' : 'To Meet:'}</span>
                        <span className="font-bold text-white">{currentToken.officerToMeet || 'அட்மின் 1 (Admin 1)'}</span>
                      </div>

                      {/* Action Button: View Full Citizen Dossier with my logo! */}
                      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenCitizenDetails(currentToken)}
                          className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md group"
                          title="View complete citizen details and dossier"
                        >
                          <div className="p-0.5 bg-white rounded-full shrink-0">
                            <VaharaiLogo size={20} className="w-5 h-5" />
                          </div>
                          <span>{lang === 'ta' ? 'அனைத்து தரவுகளையும் பார்க்க' : 'View All Citizen Data'}</span>
                        </button>

                        {!isNormalUser && onUpdateTokens && (
                          <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <button
                              onClick={() => handleRecallToken(currentToken.id)}
                              className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold"
                              title="Re-call"
                            >
                              🔔
                            </button>
                            <button
                              onClick={() => handleCompleteService(currentToken.id)}
                              className="flex-1 py-2 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
                            >
                              ✓ {t.completeService}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center text-slate-400">
                      <div className="text-2xl mb-1 opacity-50">💤</div>
                      <div className="text-xs font-medium">
                        {lang === 'ta' ? 'கவுண்டர் தயார் நிலையில் உள்ளது' : 'Counter Standby / Available'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {serviceNameEn}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Waiting Queue List with "அனைத்து தரவுகளையும் பார்க்க - my logo" buttons */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              {t.waitingQueue} ({waitingTokens.length} {lang === 'ta' ? 'பேர் காத்திருக்கின்றனர்' : 'waiting'})
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {lang === 'ta' ? 'அழைப்பு முன்னுரிமை: வருகை வரிசைப்படி' : 'Ordered by arrival timestamp'}
          </span>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {waitingTokens.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <span className="text-3xl block mb-2">🎉</span>
              {lang === 'ta' ? 'காத்திருப்பு வரிசையில் எவரும் இல்லை! அனைத்து சேவைகளும் வழங்கப்பட்டுவிட்டன.' : 'Queue is empty! All citizens have been served.'}
            </div>
          ) : (
            waitingTokens.map((tok, idx) => (
              <div
                key={tok.id}
                className="p-3 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left Token info */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-mono font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-black text-slate-900">
                        {tok.tokenNumber}
                      </span>
                      <span className="bg-emerald-50 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                        {t.counter} {tok.counterNo}
                      </span>
                      {/* Whom to Meet Badge */}
                      <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-200">
                        👔 {tok.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">
                        {tok.citizenName || 'Public Citizen'}
                      </span>
                      {tok.citizenNic && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{tok.citizenNic}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className="text-slate-500">பிரிவு: {tok.divisionCode}</span>
                    </div>
                  </div>
                </div>

                {/* Right Actions: View Dossier with my logo! */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleOpenCitizenDetails(tok)}
                    className="py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 hover:border-emerald-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                    title="View complete citizen data"
                  >
                    <div className="p-0.5 bg-white rounded-full shrink-0">
                      <VaharaiLogo size={18} className="w-4 h-4" />
                    </div>
                    <span>{lang === 'ta' ? 'அனைத்து தரவுகளையும் பார்க்க' : 'View Citizen Details'}</span>
                  </button>

                  {!isNormalUser && (
                    <>
                      <button
                        onClick={() => setActiveReceiptToken(tok)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                        title={t.printThermalReceipt}
                      >
                        🖨️
                      </button>
                      {onUpdateTokens && (
                        <button
                          onClick={() => handleRecallToken(tok.id)}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1"
                        >
                          <span>🔔</span>
                          <span>{t.callNext}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completed Tokens Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            {t.servedList} ({completedTokens.length})
          </span>
          <span className="text-[11px] text-slate-500">
            {lang === 'ta' ? 'இன்றைய நிறைவடைந்த சேவைகள்' : 'Completed today'}
          </span>
        </div>
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th className="pb-2">{t.tokenNumber}</th>
                <th className="pb-2">கவுண்டர்</th>
                <th className="pb-2">யாரை பார்த்தார் (Whom to Meet)</th>
                <th className="pb-2">பிரஜை / Citizen</th>
                <th className="pb-2">முடிவடைந்த நேரம்</th>
                <th className="pb-2 text-right">விபரம்</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {completedTokens.slice(0, 8).map((ct) => (
                <tr key={ct.id} className="hover:bg-slate-50">
                  <td className="py-2.5 font-mono font-bold text-slate-900">{ct.tokenNumber}</td>
                  <td className="py-2.5 font-mono font-semibold">Counter {ct.counterNo}</td>
                  <td className="py-2.5 font-medium text-slate-800">
                    {ct.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                  </td>
                  <td className="py-2.5 text-slate-800">{ct.citizenName || ct.citizenNic || 'Citizen'}</td>
                  <td className="py-2.5 font-mono text-slate-500">
                    {ct.completedAt ? new Date(ct.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleOpenCitizenDetails(ct)}
                      className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-emerald-900 rounded text-[11px] font-bold inline-flex items-center gap-1 border border-slate-200"
                    >
                      <VaharaiLogo size={14} className="w-3.5 h-3.5" />
                      <span>{lang === 'ta' ? 'தரவுகள்' : 'Details'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Citizen Profile & Dossier Modal triggered by "அனைத்து தரவுகளையும் பார்க்க (my logo)" */}
      {selectedTokenForDetails && (
        <CitizenProfileModal
          token={selectedTokenForDetails}
          beneficiary={matchedBeneficiary}
          division={matchedDivision}
          lang={lang}
          onClose={() => setSelectedTokenForDetails(null)}
          onPrintCard={matchedBeneficiary ? () => setSelectedBeneficiaryForCard(matchedBeneficiary) : undefined}
          onPrintThermal={() => setActiveReceiptToken(selectedTokenForDetails)}
        />
      )}

      {/* Citizen ID Pass / Barcode Modal */}
      {selectedBeneficiaryForCard && (
        <BeneficiaryIdCardModal
          beneficiary={selectedBeneficiaryForCard}
          division={divisions.find((d) => d.code === selectedBeneficiaryForCard.divisionCode)}
          lang={lang}
          onClose={() => setSelectedBeneficiaryForCard(null)}
        />
      )}

      {/* Thermal Print Receipt Preview */}
      {activeReceiptToken && (
        <ThermalPrintReceipt
          token={activeReceiptToken}
          waitingCount={waitingTokens.filter((w) => w.id !== activeReceiptToken.id).length}
          serviceLabelTa="வாகரை பிரதேச செயலக சேவை"
          serviceLabelEn="Divisional Secretariat Public Service"
          onClose={() => setActiveReceiptToken(null)}
        />
      )}
    </div>
  );
};
