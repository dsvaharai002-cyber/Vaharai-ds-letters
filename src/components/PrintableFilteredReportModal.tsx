import React from 'react';
import { Beneficiary, GNDivision } from '../types';
import { Language, translations } from '../translations/i18n';
import { calculateAge } from '../services/storage';

interface PrintableFilteredReportModalProps {
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  activeDivision: string;
  activeWelfare: string;
  activeIllness: string;
  activeYouth16: boolean;
  searchQuery: string;
  lang: Language;
  onClose: () => void;
}

export const PrintableFilteredReportModal: React.FC<PrintableFilteredReportModalProps> = ({
  beneficiaries,
  divisions,
  activeDivision,
  activeWelfare,
  activeIllness,
  activeYouth16,
  searchQuery,
  lang,
  onClose,
}) => {
  const t = translations[lang];

  const handlePrint = () => {
    window.print();
  };

  const getDivisionName = (code: string) => {
    const found = divisions.find((d) => d.code === code);
    return found ? `${found.code} - ${found.nameTa} (${found.nameEn})` : code;
  };

  const formattedDate = new Date().toLocaleDateString('en-GB');
  const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full p-4 sm:p-6 border border-slate-200 my-4 max-h-[95vh] flex flex-col">
        {/* Modal Top Bar (Screen Controls - hidden on print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📄</span>
              <span>{t.printPdfReport}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ta'
                ? 'அனைத்து வடிகட்டிய தரவுகளும் உத்தியோகபூர்வ அரச ஆவண வடிவில் PDF ஆக அச்சிட தயாராக உள்ளது.'
                : 'All filtered records prepared in official Government Report format ready for PDF export / printing.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>🖨️ PDF ஆக அச்சிடுக (Print / Save as PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors"
            >
              ✕ {t.close}
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div id="printable-report-area" className="flex-1 overflow-y-auto p-4 sm:p-6 text-black bg-white font-sans text-xs my-2">
          {/* Official Letterhead Header */}
          <div className="text-center pb-4 border-b-2 border-emerald-900">
            <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-widest">
              இலங்கை ஜனநாயக சோசலிசக் குடியரசு · Democratic Socialist Republic of Sri Lanka
            </div>
            <h1 className="text-lg font-extrabold text-slate-900 mt-1 leading-snug">
              கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம்
            </h1>
            <h2 className="text-sm font-bold text-slate-800">
              Divisional Secretariat - Koralaipattu North, Vaharai
            </h2>
            <div className="text-[11px] text-emerald-900 font-medium mt-1">
              மட்டக்களப்பு மாவட்டம் · Batticaloa District · Eastern Province
            </div>
          </div>

          {/* Active Filter Criteria Metadata Box */}
          <div className="my-3 p-3 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-1">
            <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wide mb-1">
              அறிக்கை வடிகட்டி விபரங்கள் / Report Parameters & Filter Criteria:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="font-semibold text-slate-600">பிரிவு / Division:</span>{' '}
                <span className="font-mono">{activeDivision === 'ALL' ? 'அனைத்தும் (All 16 Divs)' : activeDivision}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600">நலன்புரி / Scheme:</span>{' '}
                <span>{activeWelfare === 'ALL' ? 'அனைத்தும் (All)' : activeWelfare}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600">நோய் / Illness:</span>{' '}
                <span>{activeIllness === 'ALL' ? 'அனைத்தும் (All)' : activeIllness}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-600">16 வயது NIC:</span>{' '}
                <span className="font-bold">{activeYouth16 ? 'ஆம் (Yes - 16 Yrs Only)' : 'இல்லை (All)'}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[10px] text-slate-500">
              <div>
                பதிவுகள் எண்ணிக்கை: <strong className="font-mono text-slate-800">{beneficiaries.length}</strong> {t.records}
              </div>
              <div>
                திகதி / நேரம்: <span className="font-mono">{formattedDate} {formattedTime}</span>
              </div>
            </div>
          </div>

          {/* Filtered Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-slate-300 divide-y divide-slate-200">
              <thead className="bg-slate-100 font-bold uppercase text-[9px] text-slate-700">
                <tr>
                  <th className="p-2 border-r border-slate-200">#</th>
                  <th className="p-2 border-r border-slate-200">System ID</th>
                  <th className="p-2 border-r border-slate-200">NIC / இலக்கம்</th>
                  <th className="p-2 border-r border-slate-200">பெயர் / Full Name</th>
                  <th className="p-2 border-r border-slate-200">வயது</th>
                  <th className="p-2 border-r border-slate-200">பிரிவு</th>
                  <th className="p-2 border-r border-slate-200">குடும்ப எண்</th>
                  <th className="p-2 border-r border-slate-200">நோய் நிலை</th>
                  <th className="p-2">நலன்புரி</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {beneficiaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  beneficiaries.map((b, idx) => {
                    const age = calculateAge(b.dob);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-mono text-[10px]">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-mono font-semibold text-slate-900 text-[10px]">
                          {b.id}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-900 text-[10px]">
                          {b.nic}
                          {b.isProvisionalNic && (
                            <span className="block text-[8px] text-amber-700 uppercase font-sans font-semibold">
                              (தற்காலிக எண்)
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="font-bold text-slate-900 leading-tight">{b.nameTa}</div>
                          <div className="text-[10px] text-slate-600">{b.nameEn}</div>
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-center">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${age === 16 ? 'bg-amber-100 text-amber-900' : ''}`}>
                            {age}
                          </span>
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-center">
                          {b.divisionCode}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono">
                          {b.householdNo}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {b.chronicIllness !== 'NONE' ? (
                            <span className="font-semibold text-red-800">
                              {b.chronicIllness.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-2">
                          <span className="font-semibold text-emerald-900">
                            {b.welfareScheme !== 'NONE' ? b.welfareScheme : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signature Footnote for Government Certification */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-600">
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-400 mx-6 pt-1 font-semibold">
                தயாரித்த உத்தியோகத்தர்
              </div>
              <div className="text-slate-400">Data Entry / Subject Clerk</div>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-400 mx-6 pt-1 font-semibold">
                கிராம அலுவலர் / நிருவாக உத்தியோகத்தர்
              </div>
              <div className="text-slate-400">Grama Niladhari / Administrative Officer</div>
            </div>
            <div>
              <div className="h-10"></div>
              <div className="border-t border-slate-400 mx-6 pt-1 font-semibold">
                பிரதேச செயலாளர் (முத்திரை & ஒப்பம்)
              </div>
              <div className="text-slate-400">Divisional Secretary - Vaharai</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
