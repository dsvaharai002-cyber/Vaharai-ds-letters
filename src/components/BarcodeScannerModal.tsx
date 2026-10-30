import React, { useState, useEffect, useRef } from 'react';
import { Beneficiary } from '../types';
import { Language, translations } from '../translations/i18n';

interface BarcodeScannerModalProps {
  beneficiaries: Beneficiary[];
  lang: Language;
  onSelectBeneficiary: (beneficiary: Beneficiary) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  beneficiaries,
  lang,
  onSelectBeneficiary,
  onClose,
}) => {
  const t = translations[lang];
  const [inputVal, setInputVal] = useState('');
  const [matched, setMatched] = useState<Beneficiary | null>(null);
  const [matchedFamily, setMatchedFamily] = useState<{ familyCode: string; members: Beneficiary[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScanSearch = (query: string) => {
    const rawQ = query.trim();
    const q = rawQ.toLowerCase();
    if (!q) {
      setMatched(null);
      setMatchedFamily(null);
      setErrorMsg('');
      return;
    }

    // 1. Check if input is a Family Master QR payload or Family Code
    let familyCodeTarget = '';
    if (rawQ.includes('VHR-FAMILY')) {
      const match = rawQ.match(/FAM:([^|]+)/);
      if (match && match[1]) {
        familyCodeTarget = match[1].trim();
      }
    } else if (rawQ.toUpperCase().startsWith('FAM-')) {
      familyCodeTarget = rawQ.toUpperCase();
    }

    if (familyCodeTarget) {
      const famMembers = beneficiaries.filter(
        (b) => (b.familyCode || '').toUpperCase() === familyCodeTarget.toUpperCase()
      );
      if (famMembers.length > 0) {
        setMatchedFamily({ familyCode: familyCodeTarget, members: famMembers });
        setMatched(famMembers[0]); // default primary
        setErrorMsg('');
        return;
      }
    }

    // 2. Individual Citizen Search (NIC, Barcode, ID, Name)
    const found = beneficiaries.find(
      (b) =>
        b.barcode.toLowerCase() === q ||
        b.nic.toLowerCase() === q ||
        b.id.toLowerCase() === q ||
        (b.familyCode && b.familyCode.toLowerCase() === q) ||
        b.nameEn.toLowerCase().includes(q) ||
        b.nameTa.toLowerCase().includes(q)
    );

    if (found) {
      setMatched(found);
      // Check if this citizen has other family members linked under same Family Code
      if (found.familyCode) {
        const related = beneficiaries.filter((b) => b.familyCode === found.familyCode);
        if (related.length > 1) {
          setMatchedFamily({ familyCode: found.familyCode, members: related });
        } else {
          setMatchedFamily(null);
        }
      } else {
        setMatchedFamily(null);
      }
      setErrorMsg('');
    } else {
      setMatched(null);
      setMatchedFamily(null);
      setErrorMsg(
        lang === 'ta'
          ? 'பயனாளி அல்லது குடும்ப QR குறியீடு கண்டுபிடிக்கப்படவில்லை!'
          : 'No citizen or family QR found matching this code.'
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScanSearch(inputVal);
    }
  };

  // Find 5-member demo family if available
  const sampleFamilyMember = beneficiaries.find((b) => b.familyCode === 'FAM-211-042');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📷</span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t.scanBarcode} / {lang === 'ta' ? 'குடும்ப QR ஸ்கேனர்' : 'Family Master QR Scanner'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'ta'
                  ? 'தனிநபர் பார்கோட் அல்லது 1 குடும்பத்திற்கான பிரதான QR குறியீடு'
                  : 'Individual citizen barcode or Single Family Master QR code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="my-4">
          <p className="text-xs text-slate-600 mb-2">
            {lang === 'ta'
              ? 'பார்கோட் / QR ஸ்கேனர் மூலம் ஸ்கேன் செய்யவும் அல்லது NIC / குடும்ப இலக்கத்தை தட்டச்சு செய்யவும்:'
              : 'Scan using optical scanner or type the NIC / Family Code below:'}
          </p>

          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                handleScanSearch(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 198421500321 or FAM-211-042"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono shadow-inner"
            />
            <button
              onClick={() => handleScanSearch(inputVal)}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
            >
              {lang === 'ta' ? 'தேடுக' : 'Search'}
            </button>
          </div>

          {/* Quick Demo Fill Buttons */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">Quick Test:</span>
            {sampleFamilyMember && (
              <button
                onClick={() => {
                  const payload = sampleFamilyMember.familyQrPayload || 'FAM-211-042';
                  setInputVal(payload);
                  handleScanSearch(payload);
                }}
                className="text-[10px] px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md font-mono font-bold flex items-center gap-1"
                title="Family of 5 members sharing 1 Master QR"
              >
                <span>👨‍👩‍👧‍👦 5-Member Family QR (FAM-211-042)</span>
              </button>
            )}
            {beneficiaries.slice(0, 2).map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setInputVal(b.nic);
                  handleScanSearch(b.nic);
                }}
                className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono"
              >
                {b.nic}
              </button>
            ))}
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Matched Family Master QR Result (Single QR for entire household) */}
          {matchedFamily && (
            <div className="mt-4 p-4 bg-gradient-to-br from-amber-50/80 via-emerald-50/50 to-blue-50/60 border border-amber-300 rounded-xl shadow-xs">
              <div className="flex items-start justify-between border-b border-amber-200/80 pb-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👨‍👩‍👧‍👦</span>
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      {lang === 'ta' ? 'குடும்ப பிரதான QR குறியீடு அங்கீகரிக்கப்பட்டது' : 'Family Master QR Code Verified'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {lang === 'ta'
                      ? `ஒரே QR குறியீட்டின் கீழ் இணைக்கப்பட்ட குடும்ப உறுப்பினர்கள் (${matchedFamily.members.length} நபர்கள்):`
                      : `Family Members linked under this 1 Single QR (${matchedFamily.members.length} persons):`}
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-200 text-amber-950 rounded border border-amber-400">
                  {matchedFamily.familyCode}
                </span>
              </div>

              {/* Members List with specialized badges: Pregnant mother, Disability, WHH, Samurdhi */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {matchedFamily.members.map((member) => {
                  const isCurrent = matched?.id === member.id;
                  return (
                    <div
                      key={member.id}
                      onClick={() => setMatched(member)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                          : 'bg-white/70 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{member.nameTa}</span>
                            <span className="text-slate-500 text-[11px]">({member.nameEn})</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                              {member.familyRelationship || (member.familyHead ? 'குடும்பத் தலைவர்' : 'உறுப்பினர்')}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                            NIC: {member.nic} · ID: {member.id}
                          </div>
                        </div>

                        {/* Badges for Specialized Officers (ECDO, Disability, WHH, Samurdhi) */}
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {member.isPregnantMother && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-rose-100 text-rose-800 rounded font-bold border border-rose-300">
                              🤰 ECDO கர்ப்பிணி ({member.pregnancyStageMonths || 6}m)
                            </span>
                          )}
                          {member.isPersonWithDisability && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-purple-100 text-purple-800 rounded font-bold border border-purple-300">
                              ♿ மாற்றுத்திறனாளி
                            </span>
                          )}
                          {member.isWomanHeadedHousehold && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-pink-100 text-pink-800 rounded font-bold border border-pink-300">
                              👩‍👧‍👦 பெண்தலைமை
                            </span>
                          )}
                          {member.isSamurdhiBeneficiary && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-900 rounded font-bold border border-amber-300">
                              🌾 சமுர்த்தி
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Citizen Detailed Action Card */}
          {matched && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-xl shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                    {lang === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட பிரஜை' : 'Selected Citizen Profile'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">{matched.nameTa}</h4>
                  <div className="text-xs text-slate-600">{matched.nameEn}</div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white rounded border border-emerald-200 text-emerald-900 shadow-2xs">
                  {matched.nic}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-emerald-200/60 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">பிரிவு / Division:</span>
                  <span className="font-semibold text-slate-800">{matched.divisionCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">நலன்புரி / Welfare:</span>
                  <span className="font-semibold text-emerald-800">{matched.welfareScheme}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">குடும்ப இலக்கம் / Family:</span>
                  <span className="font-mono font-bold text-amber-900">{matched.familyCode || 'FAM-211-001'}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    onSelectBeneficiary(matched);
                    onClose();
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>📋</span>
                  <span>{lang === 'ta' ? 'பிரஜை விபரங்களை பார்வையிடுக' : 'Open Full Citizen Profile'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
