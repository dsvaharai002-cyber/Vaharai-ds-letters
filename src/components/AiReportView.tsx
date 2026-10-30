import React, { useState } from 'react';
import { Beneficiary, QueueToken, GNDivision, User } from '../types';
import { Language, translations } from '../translations/i18n';
import { calculateAge } from '../services/storage';

interface AiReportViewProps {
  beneficiaries: Beneficiary[];
  tokens: QueueToken[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onAuditLog: (action: string, details: string) => void;
}

export const AiReportView: React.FC<AiReportViewProps> = ({
  beneficiaries,
  tokens,
  divisions,
  currentUser,
  lang,
  onAuditLog,
}) => {
  const t = translations[lang];

  const [customPrompt, setCustomPrompt] = useState('');
  const [reportText, setReportText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Compute aggregated stats to supply to the server-side Gemini API
  const generateStatsSummary = () => {
    const totalCitizens = beneficiaries.length;
    const totalHouseholds = new Set(beneficiaries.map((b) => b.householdNo)).size;
    
    // Chronic illnesses
    const ckdCount = beneficiaries.filter((b) => b.chronicIllness === 'CKD_KIDNEY').length;
    const cancerCount = beneficiaries.filter((b) => b.chronicIllness === 'CANCER').length;
    const totalChronic = beneficiaries.filter((b) => b.chronicIllness !== 'NONE').length;

    // 16-year-olds needing NIC
    const youth16List = beneficiaries.filter((b) => calculateAge(b.dob) === 16);
    const youth16Count = youth16List.length;

    // Welfare schemes
    const aswesumaCount = beneficiaries.filter((b) => b.welfareScheme.startsWith('ASWESUMA')).length;
    const samurdhiCount = beneficiaries.filter((b) => b.welfareScheme === 'SAMURDHI').length;
    const elderlyCount = beneficiaries.filter((b) => b.welfareScheme === 'ELDERLY' || calculateAge(b.dob) >= 70).length;
    const fisheryCount = beneficiaries.filter((b) => b.welfareScheme === 'FISHERY_AID').length;
    const farmerCount = beneficiaries.filter((b) => b.welfareScheme === 'FARMER_SUBSIDY').length;

    // Divisional breakdown
    const divisionDistribution: Record<string, number> = {};
    for (const b of beneficiaries) {
      divisionDistribution[b.divisionCode] = (divisionDistribution[b.divisionCode] || 0) + 1;
    }

    return {
      totalCitizens,
      totalHouseholds,
      chronicIllnessCount: totalChronic,
      ckdCount,
      cancerCount,
      youth16Count,
      aswesumaCount,
      samurdhiCount,
      elderlyCount,
      fisheryCount,
      farmerCount,
      divisionDistribution,
      waitingTokensToday: tokens.filter((tok) => tok.status === 'WAITING').length,
    };
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const stats = generateStatsSummary();
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lang,
          stats,
          prompt: customPrompt.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.report) {
        setReportText(data.report);
        onAuditLog('AI_REPORT_GENERATED', 'Generated AI Citizen Needs Assessment & Strategic Policy Report');
      } else {
        throw new Error('No report content received');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate AI report');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {t.aiReportTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.aiReportSubtitle}
          </p>
        </div>

        {reportText && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
          >
            <span>🖨️</span>
            <span>{t.printReport}</span>
          </button>
        )}
      </div>

      {/* AI Controls Box (Hidden on print) */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white rounded-xl p-5 shadow-sm no-print space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              Powered by Google Gemini 3.8 Flash
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              {lang === 'ta' ? 'தேவைகள் கண்டறிதல் & உத்திசார் முடிவுகள்' : 'Divisional Needs Diagnosis & Strategic Decisions'}
            </h3>
            <p className="text-xs text-emerald-100 mt-1 max-w-2xl leading-relaxed">
              {lang === 'ta'
                ? 'பிரதேச செயலகத்தின் தற்போதைய பிரஜைகள் தரவுகள், 16 கிராம அலுவலர் பிரிவுகளின் வறுமை, நாள்பட்ட நோயாளர்கள், 16 வயது இளைஞர்கள் மற்றும் வாழ்வாதாரத் தேவைகளை பகுப்பாய்வு செய்து உத்தியோகபூர்வ அறிக்கையை உருவாக்குகிறது.'
                : 'Analyzes live citizen database, chronic illnesses, youth turning 16, Aswesuma poverty clusters, and fisheries/agrarian needs across all 16 GN divisions.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={t.customPromptPlaceholder}
            className="flex-1 px-3.5 py-2 text-xs bg-slate-800/80 border border-emerald-700/60 text-white placeholder:text-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm shrink-0"
          >
            {isLoading ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>{t.generatingReport}</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>{t.generateAiReport}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium no-print">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Generated Report Display */}
      {reportText ? (
        <div id="ai-report-paper" className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
          {/* Printable Official Letterhead */}
          <div className="text-center pb-4 mb-6 border-b-2 border-emerald-900">
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
              Democratic Socialist Republic of Sri Lanka · இலங்கை சோசலிசக் குடியரசு
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
              கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம்
            </h1>
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              Divisional Secretariat - Koralaipattu North, Vaharai
            </h2>
            <div className="text-[11px] text-emerald-900 font-medium mt-1">
              பிரஜைகள் தேவைகள் பகுப்பாய்வு & உத்திசார் கொள்கை அறிக்கை / AI Needs Assessment Report
            </div>
          </div>

          {/* Formatted Report Prose */}
          <div className="prose prose-sm max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {reportText}
          </div>

          {/* Signatures for Official Approval */}
          <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-600">
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-300 mx-8 pt-1 font-semibold">
                உதவித் திட்டமிடல் பணிப்பாளர்
              </div>
              <div className="text-[11px] text-slate-400">Assistant Director of Planning (ADP)</div>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-300 mx-8 pt-1 font-semibold">
                பிரதேச செயலாளர் (முத்திரை & ஒப்பம்)
              </div>
              <div className="text-[11px] text-slate-400">Divisional Secretary - Vaharai</div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center">
            {t.aiReportNotice} · திகதி: {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs space-y-2 no-print">
            <span className="text-3xl block">📊</span>
            <div className="font-semibold text-slate-700">
              {lang === 'ta' ? 'அறிக்கை இன்னும் உருவாக்கப்படவில்லை' : 'No report generated yet'}
            </div>
            <p className="max-w-md mx-auto text-[11px]">
              {lang === 'ta'
                ? 'மேலே உள்ள "ஏஐ அறிக்கை உருவாக்குக" பொத்தானை அழுத்தவும். ஜெமினி ஏஐ முழு தரவுகளையும் தொகுத்து துல்லியமான தேவைகள் அறிக்கையை வழங்கும்.'
                : 'Click "Generate AI Executive Report" above to trigger Gemini AI synthesis across all 16 Grama Niladhari divisions.'}
            </p>
          </div>
        )
      )}
    </div>
  );
};
