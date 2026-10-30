import React, { useRef, useState, useEffect } from 'react';
import { Beneficiary, GNDivision, FamilyRelationship, ALL_WELFARE_SCHEMES_LIST, WelfareScheme } from '../types';
import { Language } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { calculateAge } from '../services/storage';
import { generateQrDataUrl } from '../utils/barcode';
import { getRelationshipTamilLabel } from '../services/csv';
import {
  Users,
  QrCode,
  Printer,
  X,
  Plus,
  ShieldCheck,
  Heart,
  Baby,
  Accessibility,
  HeartPulse,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FamilyGroupModalProps {
  familyCode: string;
  allBeneficiaries: Beneficiary[];
  divisions: GNDivision[];
  lang: Language;
  onClose: () => void;
  onSelectMember?: (member: Beneficiary) => void;
  onAddMemberToFamily?: (familyCode: string, divisionCode: string) => void;
}

export const FamilyGroupModal: React.FC<FamilyGroupModalProps> = ({
  familyCode,
  allBeneficiaries,
  divisions,
  lang,
  onClose,
  onSelectMember,
  onAddMemberToFamily,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // All members belonging to this specific family unit
  const members = React.useMemo(() => {
    return allBeneficiaries.filter(
      (b) => b.familyCode && b.familyCode.toUpperCase() === familyCode.toUpperCase()
    );
  }, [allBeneficiaries, familyCode]);

  const divisionCode = members[0]?.divisionCode || '211';
  const division = divisions.find((d) => d.code === divisionCode);
  const familyQrPayload = members[0]?.familyQrPayload || `VHR-FAMILY|FAM:${familyCode}|DIV:${divisionCode}`;

  useEffect(() => {
    if (familyQrPayload) {
      generateQrDataUrl(familyQrPayload).then(setQrDataUrl);
    }
  }, [familyQrPayload]);

  // Categorize members by role/generation
  const fathers = members.filter((m) => m.familyRelationship === 'FATHER' || (m.familyHead && m.gender === 'MALE' && m.familyRelationship !== 'SON'));
  const mothers = members.filter((m) => m.familyRelationship === 'MOTHER' || (m.familyRelationship === 'WIFE' || (m.familyHead && m.gender === 'FEMALE')));
  const sons = members.filter((m) => m.familyRelationship === 'SON');
  const daughters = members.filter((m) => m.familyRelationship === 'DAUGHTER');
  const children = members.filter((m) => m.familyRelationship === 'CHILD');
  const grandparents = members.filter(
    (m) => m.familyRelationship === 'GRANDFATHER' || m.familyRelationship === 'GRANDMOTHER' || calculateAge(m.dob) >= 65
  );
  const others = members.filter(
    (m) =>
      !fathers.includes(m) &&
      !mothers.includes(m) &&
      !sons.includes(m) &&
      !daughters.includes(m) &&
      !children.includes(m) &&
      !grandparents.includes(m)
  );

  // Statistics across the household
  const hasElderly = members.some((m) => m.isElderly || calculateAge(m.dob) >= 60 || m.welfareScheme === 'ELDERLY');
  const hasPregnant = members.some((m) => m.isPregnantMother || m.welfareScheme === 'PREGNANT_NUTRITION');
  const hasDisability = members.some((m) => m.isPersonWithDisability || m.chronicIllness === 'DISABILITY_PHYSICAL' || m.welfareScheme === 'DISABILITY');
  const hasAswesuma = members.some((m) => m.welfareScheme.startsWith('ASWESUMA') || m.welfareSchemes?.some(s => s.startsWith('ASWESUMA')));
  const hasYouth16 = members.some((m) => calculateAge(m.dob) === 16);

  const handlePrint = () => {
    window.print();
  };

  const getWelfareBadge = (code: WelfareScheme) => {
    const found = ALL_WELFARE_SCHEMES_LIST.find((s) => s.code === code);
    if (!found) return null;
    return (
      <span
        key={code}
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${found.badgeClass}`}
        title={lang === 'ta' ? found.labelTa : found.labelEn}
      >
        {lang === 'ta' ? found.labelTa.split('(')[0] : found.labelEn}
      </span>
    );
  };

  const renderMemberCard = (m: Beneficiary) => {
    const age = calculateAge(m.dob);
    const relLabel = getRelationshipTamilLabel(m.familyRelationship);
    const activeSchemes = m.welfareSchemes && m.welfareSchemes.length > 0 ? m.welfareSchemes : (m.welfareScheme && m.welfareScheme !== 'NONE' ? [m.welfareScheme] : []);

    return (
      <div
        key={m.id}
        onClick={() => onSelectMember && onSelectMember(m)}
        className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between"
      >
        <div>
          {/* Top Row: Relationship Badge & Age */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1">
              <span>
                {m.familyRelationship === 'FATHER' || m.gender === 'MALE' ? '👨' : '👩'}
              </span>
              <span>{relLabel}</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {age} {lang === 'ta' ? 'வயது' : 'yrs'}
            </span>
          </div>

          {/* Name & NIC */}
          <div className="space-y-0.5">
            <h5 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-emerald-700 transition-colors">
              {m.nameTa}
            </h5>
            <p className="text-[11px] text-slate-500 font-medium">{m.nameEn}</p>
          </div>

          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {m.nic}
            </span>
            {m.isProvisionalNic && (
              <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-200">
                {lang === 'ta' ? 'தற்காலிக NIC' : 'Temp NIC'}
              </span>
            )}
            {age === 16 && (
              <span className="text-[9px] bg-amber-300 text-slate-950 px-1.5 py-0.2 rounded font-bold animate-pulse">
                🎯 {lang === 'ta' ? '16 வயது - NIC தேவை' : 'Age 16 - Needs NIC'}
              </span>
            )}
          </div>

          {/* Special conditions */}
          <div className="mt-2 space-y-1">
            {m.isPregnantMother && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded border border-pink-200 mr-1.5">
                <Baby className="w-3 h-3" />
                <span>{lang === 'ta' ? 'கர்ப்பிணித் தாய்' : 'Pregnant Mother'}</span>
              </span>
            )}
            {m.isPersonWithDisability && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 mr-1.5">
                <Accessibility className="w-3 h-3" />
                <span>{m.disabilityNature || (lang === 'ta' ? 'மாற்றுத்திறனாளி' : 'Disabled')}</span>
              </span>
            )}
            {(m.isElderly || age >= 60) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 mr-1.5">
                <Heart className="w-3 h-3" />
                <span>{lang === 'ta' ? 'முதியோர்' : 'Senior Citizen'}</span>
              </span>
            )}
            {m.chronicIllness && m.chronicIllness !== 'NONE' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 mr-1.5">
                <HeartPulse className="w-3 h-3" />
                <span>{m.chronicIllness.replace('_', ' ')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Welfare Assistance Checklist Section for this person */}
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
            <span>{lang === 'ta' ? 'பெறும் நலன்புரி உதவிகள் (Checklist):' : 'Welfare Aids Checklist:'}</span>
            <span className="font-mono text-emerald-800 font-bold">{activeSchemes.length}</span>
          </div>

          {activeSchemes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {activeSchemes.map((code) => getWelfareBadge(code))}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 italic">
              {lang === 'ta' ? 'உதவிகள் ஏதுமில்லை (None)' : 'No active welfare aids'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 border border-slate-200 my-4 max-h-[94vh] overflow-y-auto">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {lang === 'ta' ? 'குடும்ப அலகு & உறவுமுறை காட்சி (Family Tree)' : 'Family Unit & Household Tree'}
                </h3>
                <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {familyCode}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {division ? `${division.code} - ${division.nameTa} (${division.nameEn})` : `பிரிவு: ${divisionCode}`} · {members.length} {lang === 'ta' ? 'உறுப்பினர்கள் இணைக்கப்பட்டுள்ளனர்' : 'members connected'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{lang === 'ta' ? 'அச்சிடு (Print)' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 rounded-lg hover:bg-slate-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Master QR Dossier Header */}
        <div className="my-4 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {qrDataUrl ? (
              <div className="p-2 bg-white rounded-xl shadow-xs border border-emerald-200 shrink-0">
                <img src={qrDataUrl} alt="Family QR" className="w-24 h-24 sm:w-28 sm:h-28" />
                <span className="block text-center font-mono text-[9px] font-bold text-emerald-900 mt-1">
                  FAMILY MASTER QR
                </span>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <VaharaiLogo size={28} className="w-7 h-7" />
                <span className="font-bold text-slate-900 text-sm">
                  கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம்
                </span>
              </div>
              <h4 className="text-base sm:text-xl font-black text-emerald-950 font-mono tracking-tight">
                {familyCode}
              </h4>
              <p className="text-xs text-slate-600">
                {lang === 'ta'
                  ? 'இக்குடும்பத்தின் அனைத்து உறுப்பினர்களுக்கும் பொதுவான பிரத்தியேக குடும்ப QR குறியீடு.'
                  : 'Universal Family QR identifier shared across all members of this household.'}
              </p>

              {/* Status Badges Summary */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {hasAswesuma && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded-md border border-amber-300">
                    🌾 {lang === 'ta' ? 'அஸ்வெசும' : 'Aswesuma'}
                  </span>
                )}
                {hasElderly && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-bold rounded-md border border-purple-300">
                    👵 {lang === 'ta' ? 'முதியோர் கொடுப்பனவு' : 'Elderly Aid'}
                  </span>
                )}
                {hasPregnant && (
                  <span className="px-2 py-0.5 bg-pink-100 text-pink-900 text-[10px] font-bold rounded-md border border-pink-300">
                    🤰 {lang === 'ta' ? 'கர்ப்பிணித் தாய் போசணை' : 'Pregnant Mother'}
                  </span>
                )}
                {hasDisability && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-bold rounded-md border border-blue-300">
                    ♿ {lang === 'ta' ? 'மாற்றுத்திறனாளி உதவி' : 'Disability'}
                  </span>
                )}
                {hasYouth16 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-900 text-[10px] font-bold rounded-md border border-red-300">
                    🎯 {lang === 'ta' ? '16 வயது இளைஞர்' : 'Youth 16'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0 no-print">
            {onAddMemberToFamily && (
              <button
                onClick={() => onAddMemberToFamily(familyCode, divisionCode)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'ta' ? 'புதிய உறுப்பினரை சேர்க்க' : 'Add Family Member'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Family Tree Generations / Role View */}
        <div className="space-y-5 my-4">
          {members.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl">
              {lang === 'ta'
                ? 'இக்குடும்ப குறியீட்டில் எந்த உறுப்பினர்களும் காணப்படவில்லை.'
                : 'No members currently registered under this family code.'}
            </div>
          ) : (
            <>
              {/* 1. பெற்றோர் / தலைமை நிலை (Parents / Family Heads) */}
              {(fathers.length > 0 || mothers.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                    <span className="text-base">👨‍👩‍👧‍👦</span>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {lang === 'ta' ? 'பெற்றோர் / குடும்பத் தலைமை (Parents & Heads)' : 'Parents & Family Heads'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {fathers.map(renderMemberCard)}
                    {mothers.map(renderMemberCard)}
                  </div>
                </div>
              )}

              {/* 2. பிள்ளைகள் / இளையோர் (Children: Sons, Daughters) */}
              {(sons.length > 0 || daughters.length > 0 || children.length > 0) && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                    <span className="text-base">🧒</span>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {lang === 'ta' ? 'பிள்ளைகள் / இளையோர் (Children: Sons & Daughters)' : 'Children (Sons & Daughters)'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {sons.map(renderMemberCard)}
                    {daughters.map(renderMemberCard)}
                    {children.map(renderMemberCard)}
                  </div>
                </div>
              )}

              {/* 3. மூத்தோர் / தாத்தா / பாட்டி (Grandparents & Senior Citizens) */}
              {grandparents.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                    <span className="text-base">👵</span>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {lang === 'ta' ? 'மூத்தோர் / தாத்தா / பாட்டி (Grandparents & Senior Citizens)' : 'Grandparents & Senior Citizens'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {grandparents.map(renderMemberCard)}
                  </div>
                </div>
              )}

              {/* 4. ஏனைய உறவினர்கள் (Other Relatives / Caregivers) */}
              {others.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                    <span className="text-base">👥</span>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {lang === 'ta' ? 'ஏனைய குடும்ப உறவினர்கள் (Other Family Members)' : 'Other Family Relatives'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {others.map(renderMemberCard)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 no-print text-xs">
          <div className="text-slate-500">
            {lang === 'ta'
              ? 'குறிப்பு: உறுப்பினரின் மீது கிளிக் செய்து அவரின் தனிப்பட்ட முழு விபரத்தை பார்வையிடலாம்.'
              : 'Click any member card to view complete citizen dossier and history.'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
          >
            {lang === 'ta' ? 'மூடுக (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
