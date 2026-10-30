import React, { useEffect, useRef, useState } from 'react';
import { Beneficiary, GNDivision, QueueToken, AssistanceRecord, ALL_WELFARE_SCHEMES_LIST } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { renderBarcodeSvg, generateQrDataUrl } from '../utils/barcode';
import { calculateAge } from '../services/storage';
import { getRelationshipTamilLabel } from '../services/csv';
import { Users, History, Gift, MapPin, Phone, ShieldCheck, HeartPulse, Accessibility, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface CitizenProfileModalProps {
  beneficiary?: Beneficiary | null;
  token?: QueueToken | null;
  division?: GNDivision;
  allBeneficiaries?: Beneficiary[];
  allTokens?: QueueToken[];
  allAssistance?: AssistanceRecord[];
  lang: Language;
  onClose: () => void;
  onPrintCard?: () => void;
  onPrintThermal?: () => void;
}

export const CitizenProfileModal: React.FC<CitizenProfileModalProps> = ({
  beneficiary,
  token,
  division,
  allBeneficiaries = [],
  allTokens = [],
  allAssistance = [],
  lang,
  onClose,
  onPrintCard,
  onPrintThermal,
}) => {
  const t = translations[lang];
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const [qrSrc, setQrSrc] = useState<string>('');

  const barcodeVal = beneficiary?.barcode || beneficiary?.nic || token?.citizenNic || token?.tokenNumber || '';
  const age = beneficiary ? calculateAge(beneficiary.dob) : null;

  // Active family unit members matching the same family code (Requirement 02 & 03)
  const familyCode = beneficiary?.familyCode || token?.familyCode;
  const familyMembers = React.useMemo(() => {
    if (!familyCode) return [];
    return allBeneficiaries.filter((b) => b.familyCode === familyCode);
  }, [familyCode, allBeneficiaries]);

  // Complete DS past tokens history for this citizen's NIC
  const citizenNic = beneficiary?.nic || token?.citizenNic;
  const pastCitizenTokens = React.useMemo(() => {
    if (!citizenNic) return [];
    return allTokens.filter(
      (tok) => tok.citizenNic.toLowerCase().trim() === citizenNic.toLowerCase().trim()
    );
  }, [citizenNic, allTokens]);

  // Complete relief assistance history for this citizen or family
  const pastCitizenAid = React.useMemo(() => {
    if (!citizenNic && !familyCode) return [];
    return allAssistance.filter((aid) => {
      const matchNic = citizenNic && aid.beneficiaryNic.toLowerCase().trim() === citizenNic.toLowerCase().trim();
      const matchFam = familyCode && aid.familyCode && aid.familyCode.toLowerCase().trim() === familyCode.toLowerCase().trim();
      return matchNic || matchFam;
    });
  }, [citizenNic, familyCode, allAssistance]);

  useEffect(() => {
    if (barcodeRef.current && barcodeVal) {
      renderBarcodeSvg(barcodeRef.current, barcodeVal, {
        height: 38,
        displayValue: true,
        fontSize: 10,
      });
    }

    const payload = beneficiary
      ? `VHR-DS|ID:${beneficiary.id}|NIC:${beneficiary.nic}|DIV:${beneficiary.divisionCode}|FAM:${beneficiary.familyCode || 'NONE'}|MED:${beneficiary.chronicIllness}|SCHEME:${beneficiary.welfareScheme}`
      : `TOKEN:${token?.tokenNumber}|NIC:${token?.citizenNic}|NAME:${token?.citizenName}`;

    generateQrDataUrl(payload).then((url) => setQrSrc(url));
  }, [barcodeVal, beneficiary, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 border border-slate-200 my-4 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <VaharaiLogo size={36} className="w-9 h-9" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {t.citizenProfileModalTitle}
              </h3>
              <p className="text-[11px] text-slate-500">
                {token ? `டோக்கன்: ${token.tokenNumber} · கவுண்டர்: ${token.counterNo}` : 'பிரஜை உத்தியோகபூர்வ முழு விபரம்'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Citizen Card Dossier */}
        <div className="my-4 space-y-4">
          {/* Identity Header Strip */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-slate-50 to-amber-50/40 border border-emerald-200 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-2xl shadow-inner shrink-0">
                {beneficiary?.gender === 'FEMALE' ? '👩' : '👨'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-slate-900 leading-tight">
                    {beneficiary?.nameTa || token?.citizenName || 'பிரஜை'}
                  </h4>
                  {beneficiary?.status === 'DECEASED' && (
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded text-[10px] font-bold">
                      ⚰️ மரணப்பதிவு ({beneficiary.deceasedDate || 'Deceased'})
                    </span>
                  )}
                  {beneficiary?.status === 'TRANSFERRED' && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold">
                      ✈️ பதிவுமாற்றம் ({beneficiary.transferDestination || 'Transferred'})
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  {beneficiary?.nameEn || token?.citizenName}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {beneficiary?.nic || token?.citizenNic || 'No NIC'}
                  </span>
                  {beneficiary?.isProvisionalNic && (
                    <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                      {t.provisionalNicBadge}
                    </span>
                  )}
                  {familyCode && (
                    <span className="text-[10px] bg-blue-100 text-blue-900 font-bold font-mono px-2 py-0.5 rounded border border-blue-200">
                      குடும்ப அலகு: {familyCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-mono">System ID:</div>
              <div className="text-xs font-mono font-bold text-slate-800">
                {beneficiary?.id || 'UNREGISTERED'}
              </div>
              {age !== null && (
                <div className="mt-1">
                  <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${age === 16 ? 'bg-amber-300 text-slate-950' : 'bg-slate-100 text-slate-700'}`}>
                    {age} {t.yearsOld} {age === 16 ? '(NIC தேவை)' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Token Visit Info (யாரை பார்க்க வேண்டும்) */}
          {token && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 flex items-center gap-1">
                  <span>📌</span>
                  <span>{t.officerToMeet}:</span>
                </span>
                <span className="font-bold font-mono text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                  {token.officerToMeet || 'அட்மின் 1 (Admin 1)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600">
                <div>
                  <span>வரிசை எண்:</span> <strong className="font-mono text-slate-900">{token.tokenNumber}</strong>
                </div>
                <div>
                  <span>கவுண்டர்:</span> <strong className="font-mono text-slate-900">Counter {token.counterNo}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Citizen Details Grid */}
          {beneficiary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  இருப்பிட & பிரிவு விபரங்கள் / Residential
                </div>
                <div>
                  <span className="text-slate-500">பிரிவு:</span>{' '}
                  <strong className="text-slate-900 font-mono">{beneficiary.divisionCode}</strong> - {division?.nameTa || beneficiary.divisionCode}
                </div>
                <div>
                  <span className="text-slate-500">குடும்ப எண்:</span>{' '}
                  <strong className="text-slate-900 font-mono">{beneficiary.householdNo}</strong>{' '}
                  {beneficiary.familyHead && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">(தலைவர்)</span>}
                </div>
                <div>
                  <span className="text-slate-500">முகவரி:</span>{' '}
                  <span className="text-slate-800">{beneficiary.address || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500">தொலைபேசி:</span>{' '}
                  <span className="text-slate-800 font-mono">{beneficiary.phone || '-'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  நலன்புரி & விசேட தகைமைகள் / Welfare & Schemes
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">நலன்புரி உதவிகள் (Welfare Checklist):</span>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      const active = (beneficiary.welfareSchemes && beneficiary.welfareSchemes.length > 0)
                        ? beneficiary.welfareSchemes
                        : (beneficiary.welfareScheme && beneficiary.welfareScheme !== 'NONE' ? [beneficiary.welfareScheme] : []);
                      if (active.length === 0) {
                        return <span className="text-slate-400 text-xs font-semibold">நலத்திட்டம் எதுவும் இல்லை</span>;
                      }
                      return active.map((sch) => {
                        const def = ALL_WELFARE_SCHEMES_LIST.find((s) => s.id === sch);
                        return (
                          <span
                            key={sch}
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              def?.badgeColor || 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {def ? (lang === 'ta' ? def.labelTa.split('(')[0] : def.labelEn) : sch}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">உதவி நிலை:</span>{' '}
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                    {beneficiary.welfareStatus}
                  </span>
                </div>
                <div className="pt-1 border-t border-slate-200 space-y-1">
                  {beneficiary.isPregnantMother && (
                    <div className="text-pink-700 font-bold text-[11px]">
                      🤰 கர்ப்பிணித் தாய் ({beneficiary.pregnancyStageMonths || 6}வது மாதம்)
                    </div>
                  )}
                  {beneficiary.isPersonWithDisability && (
                    <div className="text-blue-700 font-bold text-[11px]">
                      ♿ மாற்றுத்திறனாளி: {beneficiary.disabilityNature || beneficiary.disabilityType || 'உடல் ஊனம்'}
                      {beneficiary.disabilityCause && ` (${beneficiary.disabilityCause})`}
                    </div>
                  )}
                  {beneficiary.isWomanHeadedHousehold && (
                    <div className="text-purple-700 font-bold text-[11px]">
                      👩‍👧 பெண் தலைமைத்துவ குடும்பம்
                    </div>
                  )}
                  {beneficiary.chronicIllness && beneficiary.chronicIllness !== 'NONE' && (
                    <div className="text-red-700 font-bold text-[11px]">
                      🏥 நாள்பட்ட நோய்: {beneficiary.chronicIllness.replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 text-center">
              இந்த டோக்கன் பிரஜை இன்னும் முழுமையான பிரஜைகள் அட்டவணையில் இணைக்கப்படவில்லை.
            </div>
          )}

          {/* Requirement 03: Family QR Unit & All Linked Family Members */}
          {familyCode && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 text-xs">
                  <Users className="w-4 h-4 text-blue-700" />
                  <span>இணைக்கப்பட்ட குடும்ப விபரம் (Family Unit: {familyCode})</span>
                </div>
                <span className="text-[10px] font-mono text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 font-bold">
                  {familyMembers.length} குடும்ப உறுப்பினர்கள்
                </span>
              </div>

              {beneficiary?.familyQrPayload && (
                <div className="p-2 bg-white rounded-lg border border-blue-200 font-mono text-[10px] text-blue-900 break-all">
                  <span className="font-bold text-slate-500 block text-[9px]">குடும்ப அலகு பிரத்தியேக கிவ் ஆர் (Family Master QR):</span>
                  {beneficiary.familyQrPayload}
                </div>
              )}

              {familyMembers.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {familyMembers.map((fm) => {
                    const memberSchemes = (fm.welfareSchemes && fm.welfareSchemes.length > 0)
                      ? fm.welfareSchemes
                      : (fm.welfareScheme && fm.welfareScheme !== 'NONE' ? [fm.welfareScheme] : []);

                    return (
                      <div key={fm.id} className="p-2 bg-white rounded-lg border border-blue-100 flex items-center justify-between text-xs gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-slate-900">{fm.nameTa}</strong>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                              {getRelationshipTamilLabel(fm.familyRelationship || (fm.familyHead ? 'HEAD' : 'OTHER'))}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            NIC: {fm.nic} · {calculateAge(fm.dob)} வயது
                          </div>
                        </div>
                        <div className="text-right flex flex-wrap gap-1 justify-end max-w-[180px]">
                          {memberSchemes.map((sch) => {
                            const def = ALL_WELFARE_SCHEMES_LIST.find((s) => s.id === sch);
                            return (
                              <span key={sch} className="text-[9px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                {def ? def.labelTa.split('(')[0] : sch}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic">
                  குடும்பத்தின் ஏனைய உறுப்பினர்கள் இன்னும் தனியாக பதிவு செய்யப்படவில்லை.
                </div>
              )}
            </div>
          )}

          {/* Requirement 03: Complete DS Previous Tokens History */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-700" />
                <span>பிரதேச செயலக வருகை வரலாறு (Past DS Office Visits: {pastCitizenTokens.length})</span>
              </div>
            </div>

            {pastCitizenTokens.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {pastCitizenTokens.map((tok) => (
                  <div key={tok.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-mono font-bold text-slate-900">{tok.tokenNumber}</span> ·{' '}
                      <span className="font-semibold text-slate-800">{tok.officerToMeet}</span>{' '}
                      <span className="text-slate-500">(Counter {tok.counterNo})</span>
                      <div className="text-[10px] text-slate-400">
                        {new Date(tok.issuedAt).toLocaleDateString()} {new Date(tok.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {tok.notes || 'வழக்கமான சேவை'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${tok.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                      {tok.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                இதுவே இந்த பிரஜையின் முதலாவது உத்தியோகபூர்வ வருகை.
              </div>
            )}
          </div>

          {/* Requirement 03: Complete Relief Assistance History */}
          <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-purple-950">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-purple-700" />
                <span>பெறப்பட்ட நிவாரண உதவிகள் (Relief & Assistance History: {pastCitizenAid.length})</span>
              </div>
            </div>

            {pastCitizenAid.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {pastCitizenAid.map((aid) => (
                  <div key={aid.id} className="p-2 bg-white rounded-lg border border-purple-100 flex items-center justify-between text-[11px]">
                    <div>
                      <strong className="text-purple-950 block">{aid.aidDescription}</strong>
                      <span className="text-[10px] text-slate-500">
                        {aid.distributedDate} · {aid.donorOrOrganization}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-purple-900 block">{aid.amountOrValue}</span>
                      <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded">{aid.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic">
                இப்பிரஜைக்கு / குடும்பத்திற்கு இதுவரை எந்த நிவாரண உதவிகளும் வழங்கப்படவில்லை.
              </div>
            )}
          </div>

          {/* Barcode and QR display */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex flex-col items-center flex-1">
              <svg ref={barcodeRef} className="max-w-[220px] h-[40px]"></svg>
            </div>
            {qrSrc && (
              <img
                src={qrSrc}
                alt="Citizen QR"
                className="w-14 h-14 border border-slate-200 p-0.5 rounded bg-white shrink-0"
              />
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 flex-wrap">
          {onPrintCard && beneficiary && (
            <button
              onClick={onPrintCard}
              className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              🪪 {t.printIdCard}
            </button>
          )}
          {onPrintThermal && token && (
            <button
              onClick={onPrintThermal}
              className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              🖨️ {t.printThermalReceipt}
            </button>
          )}
          <button
            onClick={onClose}
            className="py-1.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
