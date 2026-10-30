import React, { useState, useMemo } from 'react';
import {
  Beneficiary,
  QueueToken,
  AssistanceRecord,
  PregnantMotherRecord,
  GNDivision,
  User,
} from '../types';
import { Language, translations } from '../translations/i18n';
import { calculateAge } from '../services/storage';
import {
  Search,
  QrCode,
  UserCheck,
  Ticket,
  Gift,
  Baby,
  HeartHandshake,
  Accessibility,
  Printer,
  Calendar,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface UniversalCitizenSearchViewProps {
  beneficiaries: Beneficiary[];
  tokens: QueueToken[];
  assistanceRecords: AssistanceRecord[];
  pregnantMothers: PregnantMotherRecord[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
}

export const UniversalCitizenSearchView: React.FC<UniversalCitizenSearchViewProps> = ({
  beneficiaries,
  tokens,
  assistanceRecords,
  pregnantMothers,
  divisions,
  currentUser,
  lang,
}) => {
  const t = translations[lang];

  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput.trim());
  };

  // Matched records across all sub-databases
  const matchedData = useMemo(() => {
    if (!activeSearchTerm) return null;

    const term = activeSearchTerm.toLowerCase().trim();

    // 1. Citizen Demographic Match
    const citizen = beneficiaries.find((b) => {
      const matchNic = (b.nic || '').toLowerCase() === term || (b.nic || '').toLowerCase().includes(term);
      const matchId = (b.id || '').toLowerCase() === term;
      const matchQr = (b.qrPayload || '').toLowerCase().includes(term) || (b.manualQrCode || '').toLowerCase() === term;
      const matchFamQr = (b.familyQrPayload || '').toLowerCase().includes(term);
      const matchFamCode = (b.familyCode || '').toLowerCase() === term;
      return matchNic || matchId || matchQr || matchFamQr || matchFamCode;
    });

    const citizenNic = citizen?.nic?.toLowerCase() || term;

    // 2. Queue Tokens History
    const citizenTokens = tokens.filter((tok) => {
      const matchNic = (tok.citizenNic || '').toLowerCase() === citizenNic || (tok.citizenNic || '').toLowerCase().includes(term);
      const matchTokenId = tok.id.toLowerCase() === term;
      return matchNic || matchTokenId;
    });

    // 3. Assistance / Relief Distribution History
    const citizenAssistance = assistanceRecords.filter((aid) => {
      const matchNic = (aid.beneficiaryNic || '').toLowerCase() === citizenNic;
      const matchFam = citizen?.familyCode && aid.familyCode === citizen?.familyCode;
      return matchNic || matchFam;
    });

    // 4. Maternity & Nutrition Stamp Records
    const citizenMaternity = pregnantMothers.filter((m) => {
      const matchNic = (m.nic || '').toLowerCase() === citizenNic;
      const matchStamp = (m.stampNumber || '').toLowerCase() === term;
      return matchNic || matchStamp;
    });

    // 5. Senior Citizen Welfare info
    const isElderlyCitizen = citizen ? (citizen.isElderly || calculateAge(citizen.dob) >= 60 || citizen.welfareScheme === 'ELDERLY') : false;

    // 6. Disability Welfare info
    const isDisabilityCitizen = citizen ? (citizen.isPersonWithDisability || citizen.welfareScheme === 'DISABILITY' || citizen.chronicIllness === 'DISABILITY_PHYSICAL') : false;

    const hasAnyRecord = !!citizen || citizenTokens.length > 0 || citizenAssistance.length > 0 || citizenMaternity.length > 0;

    return {
      citizen,
      tokens: citizenTokens,
      assistance: citizenAssistance,
      maternity: citizenMaternity,
      isElderlyCitizen,
      isDisabilityCitizen,
      hasAnyRecord,
    };
  }, [activeSearchTerm, beneficiaries, tokens, assistanceRecords, pregnantMothers]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                {lang === 'ta' ? 'அனைத்து அலுவலர்களுக்கான பொது தளம்' : 'Universal Access for All Officers'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentUser.name} ({currentUser.role})
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-900 mt-1">
              {lang === 'ta'
                ? 'பொதுவான ஒருங்கிணைந்த தேடல் (Universal Citizen Search)'
                : 'Universal Citizen 360° Integrated Search'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'ta'
                ? 'தேசிய அடையாள அட்டை (NIC) அல்லது QR குறியீட்டை உள்ளிட்டவுடன் இத்தளத்தில் உள்ள சகல தரவுகளும் ஒரே பார்வையில்'
                : 'Lookup complete citizen dossier: profile, queue tokens, maternity stamps, elderly aid, disability, and relief history'}
            </p>
          </div>
        </div>

        {matchedData && matchedData.hasAnyRecord && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ta' ? 'முழு விபரம் அச்சிடுக' : 'Print Complete Dossier'}</span>
          </button>
        )}
      </div>

      {/* Main Search Input Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-700" />
            <span>
              {lang === 'ta'
                ? 'தேசிய அடையாள அட்டை (NIC) அல்லது அட்டை QR / பார்கோட் உள்ளிடவும்:'
                : 'Enter National Identity Card (NIC) Number or Scan/Type Card QR Code:'}
            </span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder={lang === 'ta' ? 'உ-ம்: 965123456V, 199612345678, அல்லது QR Code...' : 'e.g. 965123456V, 199612345678, or QR Code...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-11 pr-4 py-3 text-sm border-2 border-emerald-600/40 focus:border-emerald-700 rounded-xl font-mono focus:outline-none bg-slate-50/50 focus:bg-white transition-all uppercase"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{lang === 'ta' ? 'முழு விபரங்களை தேடுக' : 'Search Dossier'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            💡 குறிப்பு: பிரஜையின் NIC இலக்கத்தை தட்டச்சு செய்யவும் அல்லது பார்கோட்/QR ஸ்கேனர் கொண்டு நேரடியாக வாசிக்கவும்.
          </p>
        </form>
      </div>

      {/* Results Area */}
      {activeSearchTerm && !matchedData?.hasAnyRecord && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">
            "{activeSearchTerm}" இலக்கத்திற்கு எந்தவொரு தரவும் கிடைக்கவில்லை
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            தேசிய அடையாள அட்டை இலக்கம் அல்லது QR குறியீடு சரியாக உள்ளதா என சரிபார்க்கவும். அல்லது புதிய பிரஜையாக பதிவு செய்யவும்.
          </p>
        </div>
      )}

      {matchedData && matchedData.hasAnyRecord && (
        <div id="printable-citizen-dossier" className="space-y-6">
          {/* Section 1: Demographic & Family Profile */}
          {matchedData.citizen && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm">01. பிரஜை விபரம் & குடும்ப தகவல் (Citizen Profile)</span>
                </div>
                <span className="font-mono text-xs bg-slate-800 px-2.5 py-1 rounded text-emerald-300 font-bold">
                  NIC: {matchedData.citizen.nic}
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">முழுப் பெயர்:</span>
                  <strong className="text-slate-900 text-sm block">{matchedData.citizen.nameTa}</strong>
                  <span className="text-slate-600 block mt-0.5">{matchedData.citizen.nameEn}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">வயது & பாலினம்:</span>
                  <strong className="text-slate-900 block font-mono">
                    {calculateAge(matchedData.citizen.dob, matchedData.citizen.nic)} வயது ({matchedData.citizen.gender === 'MALE' ? 'ஆண்' : 'பெண்'})
                  </strong>
                  <span className="text-slate-500 block font-mono">பிறந்த திகதி: {matchedData.citizen.dob}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">கிராம அலுவலர் பிரிவு:</span>
                  <strong className="text-emerald-900 block font-mono text-sm">
                    {matchedData.citizen.divisionCode} - {divisions.find((d) => d.code === matchedData.citizen?.divisionCode)?.nameTa || matchedData.citizen.divisionCode}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">தொடர்பு & முகவரி:</span>
                  <strong className="text-slate-900 block font-mono">{matchedData.citizen.phone || 'இல்லை'}</strong>
                  <span className="text-slate-600 block mt-0.5">{matchedData.citizen.address}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">குடும்ப இலக்கம் & QR:</span>
                  <strong className="text-slate-900 block font-mono">{matchedData.citizen.familyCode || 'FAM-NONE'}</strong>
                  <span className="text-slate-600 block">வீட்டு இலக்கம்: {matchedData.citizen.householdNo}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">அட்டை / Manual QR குறியீடு:</span>
                  <strong className="text-emerald-800 block font-mono">
                    {matchedData.citizen.manualQrCode || matchedData.citizen.barcode || 'வழங்கப்படவில்லை'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Special Officer Welfare Portals Status (Maternity, Elderly, Disability) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Maternity Status Card */}
            <div className={`p-4 rounded-2xl border ${
              matchedData.maternity.length > 0 ? 'bg-pink-50/60 border-pink-200' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-2 font-bold text-xs text-pink-900">
                <Baby className="w-4 h-4 text-pink-700" />
                <span>கர்ப்பிணித் தாய் & போசணை முத்திரை</span>
              </div>
              {matchedData.maternity.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {matchedData.maternity.map((m) => {
                    const collected = m.monthlyCollections.filter((c) => c.collected).length;
                    return (
                      <div key={m.id} className="p-2.5 bg-white rounded-xl border border-pink-200 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>முத்திரை இலக்கம்:</span>
                          <strong className="font-mono text-pink-700">#{m.stampNumber || 'Pending'}</strong>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>பிரசவ முறை:</span>
                          <span>{m.pregnancyNumber} வது குழந்தை</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>10 மாத முன்னேற்றம்:</span>
                          <strong className="font-mono text-emerald-800">{collected}/10 மாதங்கள்</strong>
                        </div>
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                          முடிவடையும் திகதி: <span className="font-mono">{m.expectedCompletionDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">கர்ப்பிணித் தாய் பதிவுகள் எதுவும் இல்லை.</p>
              )}
            </div>

            {/* Senior Citizen / Elderly Welfare Card */}
            <div className={`p-4 rounded-2xl border ${
              matchedData.isElderlyCitizen ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-2 font-bold text-xs text-amber-900">
                <HeartHandshake className="w-4 h-4 text-amber-700" />
                <span>முதியோர் நலன்புரி விபரம்</span>
              </div>
              {matchedData.isElderlyCitizen && matchedData.citizen ? (
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">கொடுப்பனவு நிலை:</span>
                    <strong className="text-amber-900 font-bold">
                      {matchedData.citizen.elderlyAllowanceStatus === 'RECEIVING' ? 'கொடுப்பனவு பெறுகிறார்' : 'விண்ணப்பிக்கவில்லை'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">வசிக்கும் நிலை:</span>
                    <span>{matchedData.citizen.elderlyLivingStatus === 'ALONE' ? 'தனியாக வசிப்பவர்' : 'குடும்பத்துடன்'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">இயங்குதிறன்:</span>
                    <span>{matchedData.citizen.elderlyMobilityStatus || 'சாதாரண நடை'}</span>
                  </div>
                  {matchedData.citizen.elderlyCaretakerName && (
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      பராமரிப்பாளர்: {matchedData.citizen.elderlyCaretakerName} ({matchedData.citizen.elderlyCaretakerPhone || 'இல்லை'})
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">சிரேஷ்ட பிரஜை விபரங்கள் இல்லை (வயது 60 க்குட்பட்டவர்).</p>
              )}
            </div>

            {/* Disability Welfare Card */}
            <div className={`p-4 rounded-2xl border ${
              matchedData.isDisabilityCitizen ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-2 font-bold text-xs text-blue-900">
                <Accessibility className="w-4 h-4 text-blue-700" />
                <span>மாற்றுத்திறனாளிகள் நலன்புரி</span>
              </div>
              {matchedData.isDisabilityCitizen && matchedData.citizen ? (
                <div className="p-2.5 bg-white rounded-xl border border-blue-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">குறைபாட்டின் வகை:</span>
                    <strong className="text-blue-950">{matchedData.citizen.disabilityNature || matchedData.citizen.disabilityType || 'உடல் ஊனம்'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">காரணம்:</span>
                    <span>{matchedData.citizen.disabilityCause || 'பிறப்பு / விபத்து'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">கொடுப்பனவு:</span>
                    <span className="font-semibold text-emerald-800">
                      {matchedData.citizen.welfareScheme === 'DISABILITY' ? 'உதவித்தொகை பெறுகிறார்' : 'பரிசீலனையில்'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">மாற்றுத்திறனாளி விபரங்கள் எதுவும் இல்லை.</p>
              )}
            </div>
          </div>

          {/* Section 3: Secretariat Service & Queue History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Ticket className="w-4 h-4 text-emerald-700" />
                <span>02. பிரதேச செயலக டோக்கன்கள் & சேவைகள் வரலாறு ({matchedData.tokens.length})</span>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              {matchedData.tokens.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">டோக்கன் வரலாறு எதுவும் இல்லை.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2 px-3">டோக்கன் இலக்கம்</th>
                      <th className="py-2 px-3">சேவை கருமபீடம்</th>
                      <th className="py-2 px-3">சந்திக்க வேண்டிய அலுவலர்</th>
                      <th className="py-2 px-3">திகதி & நேரம்</th>
                      <th className="py-2 px-3">நிலை</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {matchedData.tokens.map((tok) => (
                      <tr key={tok.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-emerald-800">{tok.tokenNumber}</td>
                        <td className="py-2.5 px-3 font-sans">{tok.counterName || tok.serviceType}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600">{tok.officerToMeet}</td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(tok.issuedAt).toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tok.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            tok.status === 'CALLING' || tok.status === 'SERVING' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tok.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Section 4: Assistance and Relief Distribution History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                <Gift className="w-4 h-4 text-purple-700" />
                <span>03. பெற்றுக் கொண்ட நிவாரணங்கள் & உதவிகள் வரலாறு ({matchedData.assistance.length})</span>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              {matchedData.assistance.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">நிவாரண விநியோக வரலாறு எதுவும் இல்லை.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2 px-3">உதவி வகை</th>
                      <th className="py-2 px-3">விபரம் & அளவு</th>
                      <th className="py-2 px-3">வழங்கிய அமைப்பு</th>
                      <th className="py-2 px-3">வழங்கிய திகதி</th>
                      <th className="py-2 px-3">அலுவலர்</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matchedData.assistance.map((aid) => (
                      <tr key={aid.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-purple-900">{aid.aidCategory}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{aid.aidDescription}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{aid.amountOrValue}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{aid.donorOrOrganization}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{aid.distributedDate}</td>
                        <td className="py-2.5 px-3 text-slate-600">{aid.officerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
