import React, { useState, useMemo } from 'react';
import {
  Beneficiary,
  GNDivision,
  User,
  ChronicIllness,
  WelfareScheme,
  FamilyRelationship,
  FAMILY_RELATIONSHIP_OPTIONS,
  ALL_WELFARE_SCHEMES_LIST,
} from '../types';
import { Language, translations } from '../translations/i18n';
import { parseSriLankanNic } from '../utils/nicParser';
import { calculateAge, generateSystemCitizenId, deleteSingleBeneficiary, recordDeletedId, saveBeneficiaries } from '../services/storage';
import { downloadCsvFile, escapeCsv, getRelationshipTamilLabel } from '../services/csv';
import {
  HeartHandshake,
  Plus,
  Download,
  Search,
  Filter,
  Printer,
  ShieldCheck,
  UserCheck,
  Activity,
  Heart,
  Home,
  QrCode,
  X,
  Phone,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { BeneficiaryIdCardModal } from './BeneficiaryIdCardModal';

interface ElderlyOfficerManagementViewProps {
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const ElderlyOfficerManagementView: React.FC<ElderlyOfficerManagementViewProps> = ({
  beneficiaries,
  divisions,
  currentUser,
  lang,
  onUpdateBeneficiaries,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Role separation
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isGramaNiladhari = currentUser.role === 'GRAMANIILATHARI';
  const officerDivision = isGramaNiladhari ? currentUser.division || '211' : '';

  // Filter ONLY senior citizens (Age >= 60, or isElderly, or ELDERLY welfare scheme)
  const elderlyCitizens = useMemo(() => {
    return beneficiaries.filter((b) => {
      const age = calculateAge(b.dob, b.nic);
      return b.isElderly || age >= 60 || b.welfareScheme === 'ELDERLY' || b.elderlyAllowanceStatus;
    });
  }, [beneficiaries]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>(isGramaNiladhari ? officerDivision : 'ALL');
  const [selectedAgeBracket, setSelectedAgeBracket] = useState<'ALL' | '60_69' | '70_PLUS'>('ALL');
  const [selectedAllowanceFilter, setSelectedAllowanceFilter] = useState<'ALL' | 'RECEIVING' | 'WAITLIST' | 'NOT_APPLIED'>('ALL');
  const [selectedMobilityFilter, setSelectedMobilityFilter] = useState<'ALL' | 'NORMAL' | 'WALKER_CANE' | 'WHEELCHAIR' | 'BEDRIDDEN'>('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingElderly, setEditingElderly] = useState<Beneficiary | null>(null);
  const [viewingCardCitizen, setViewingCardCitizen] = useState<Beneficiary | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formDivision, setFormDivision] = useState(isGramaNiladhari ? officerDivision : '211');
  const [formFamilyCode, setFormFamilyCode] = useState('FAM-211-101');
  const [formFamilyRelationship, setFormFamilyRelationship] = useState<FamilyRelationship>('GRANDFATHER');
  const [formWelfareSchemes, setFormWelfareSchemes] = useState<WelfareScheme[]>(['ELDERLY']);
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDob, setFormDob] = useState('1950-01-01');
  const [formGender, setFormGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('FEMALE');
  const [formAllowanceStatus, setFormAllowanceStatus] = useState<'RECEIVING' | 'WAITLIST' | 'NOT_APPLIED'>('RECEIVING');
  const [formLivingStatus, setFormLivingStatus] = useState<'WITH_FAMILY' | 'ALONE' | 'ELDER_CARE_HOME'>('WITH_FAMILY');
  const [formCaretakerName, setFormCaretakerName] = useState('');
  const [formCaretakerPhone, setFormCaretakerPhone] = useState('');
  const [formMobilityStatus, setFormMobilityStatus] = useState<'NORMAL' | 'WALKER_CANE' | 'WHEELCHAIR' | 'BEDRIDDEN'>('NORMAL');
  const [formChronicIllness, setFormChronicIllness] = useState<ChronicIllness>('NONE');
  const [formManualQr, setFormManualQr] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Auto-calculated age from NIC
  const nicParsed = useMemo(() => parseSriLankanNic(formNic), [formNic]);

  // When NIC updates, sync DOB and gender
  const handleNicChange = (nicVal: string) => {
    setFormNic(nicVal);
    const parsed = parseSriLankanNic(nicVal);
    if (parsed.isValid && parsed.dob) {
      setFormDob(parsed.dob);
      if (parsed.gender) {
        setFormGender(parsed.gender);
        setFormFamilyRelationship(parsed.gender === 'FEMALE' ? 'GRANDMOTHER' : 'GRANDFATHER');
      }
    }
  };

  const handleToggleWelfareScheme = (scheme: WelfareScheme) => {
    const current = new Set(formWelfareSchemes);
    if (current.has(scheme)) {
      current.delete(scheme);
    } else {
      current.add(scheme);
    }
    setFormWelfareSchemes(Array.from(current));
  };

  // Super Admin: Wipe all elderly records permanently
  const handleClearAllElderly = () => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'அனைத்து முதியோர் விபரங்களையும் அழிக்க சுப்பர் அட்மின் அனுமதி தேவை.' : 'Super Admin permission required to wipe elderly records.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? 'எச்சரிக்கை: பதிவுசெய்யப்பட்ட அனைத்து முதியோர் விபரங்களையும் நிரந்தரமாக அழிக்க விரும்புகிறீர்களா? இந்நடவடிக்கையை மீளப்பெற முடியாது.'
        : 'WARNING: Are you sure you want to permanently delete all senior citizen records?'
    );
    if (!confirmed) return;

    const code = window.prompt(
      lang === 'ta'
        ? 'நிரந்தரமாக அழிக்க "DELETE" அல்லது "அழி" என தட்டச்சு செய்க:'
        : 'Type "DELETE" to confirm permanent deletion:'
    );
    if (code !== 'DELETE' && code !== 'அழி') {
      alert(lang === 'ta' ? 'உறுதிப்படுத்தல் சொல் பொருந்தவில்லை. நடவடிக்கை ரத்து செய்யப்பட்டது.' : 'Confirmation text did not match. Aborted.');
      return;
    }

    const elderlyIds = new Set(elderlyCitizens.map((b) => b.id));
    elderlyCitizens.forEach((b) => recordDeletedId(b.id, b.nic));

    const remaining = beneficiaries.filter((b) => !elderlyIds.has(b.id));
    saveBeneficiaries(remaining);
    onUpdateBeneficiaries(remaining);
    onAuditLog('CLEAR_ALL_ELDERLY', `Super Admin ${currentUser.name} wiped ${elderlyIds.size} senior citizen records.`);
    alert(lang === 'ta' ? 'அனைத்து முதியோர் விபரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன.' : 'All senior citizen records have been wiped.');
  };

  // Delete a single senior citizen
  const handleDeleteSingleElderly = (b: Beneficiary) => {
    const confirmed = window.confirm(
      lang === 'ta'
        ? `${b.nameTa} (${b.nic}) அவர்களின் விபரங்களை நிரந்தரமாக அழிக்க விரும்புகிறீர்களா?`
        : `Permanently delete senior citizen record ${b.nameEn || b.nameTa} (${b.nic})?`
    );
    if (!confirmed) return;

    recordDeletedId(b.id, b.nic);
    deleteSingleBeneficiary(b.id);
    const remaining = beneficiaries.filter((item) => item.id !== b.id);
    saveBeneficiaries(remaining);
    onUpdateBeneficiaries(remaining);
    onAuditLog('DELETE_ELDERLY', `Deleted elderly citizen ${b.nameTa} (${b.nic})`);
  };

  const handleOpenAddModal = () => {
    const div = isGramaNiladhari ? officerDivision : '211';
    setEditingElderly(null);
    setFormName('');
    setFormNic('');
    setFormDivision(div);
    setFormFamilyCode(`FAM-${div}-${Math.floor(Math.random() * 800 + 100)}`);
    setFormFamilyRelationship('GRANDMOTHER');
    setFormWelfareSchemes(['ELDERLY']);
    setFormPhone('');
    setFormAddress('');
    setFormDob('1950-01-01');
    setFormGender('FEMALE');
    setFormAllowanceStatus('RECEIVING');
    setFormLivingStatus('WITH_FAMILY');
    setFormCaretakerName('');
    setFormCaretakerPhone('');
    setFormMobilityStatus('NORMAL');
    setFormChronicIllness('NONE');
    setFormManualQr('');
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (b: Beneficiary) => {
    setEditingElderly(b);
    setFormName(b.nameTa);
    setFormNic(b.nic);
    setFormDivision(b.divisionCode);
    setFormFamilyCode(b.familyCode || `FAM-${b.divisionCode}-001`);
    setFormFamilyRelationship(b.familyRelationship || (b.gender === 'FEMALE' ? 'GRANDMOTHER' : 'GRANDFATHER'));
    setFormWelfareSchemes(b.welfareSchemes && b.welfareSchemes.length > 0 ? b.welfareSchemes : (b.welfareScheme && b.welfareScheme !== 'NONE' ? [b.welfareScheme] : ['ELDERLY']));
    setFormPhone(b.phone || '');
    setFormAddress(b.address || '');
    setFormDob(b.dob || '1950-01-01');
    setFormGender(b.gender || 'FEMALE');
    setFormAllowanceStatus(b.elderlyAllowanceStatus || (b.welfareScheme === 'ELDERLY' ? 'RECEIVING' : 'NOT_APPLIED'));
    setFormLivingStatus(b.elderlyLivingStatus || 'WITH_FAMILY');
    setFormCaretakerName(b.elderlyCaretakerName || '');
    setFormCaretakerPhone(b.elderlyCaretakerPhone || '');
    setFormMobilityStatus(b.elderlyMobilityStatus || 'NORMAL');
    setFormChronicIllness(b.chronicIllness || 'NONE');
    setFormManualQr(b.manualQrCode || '');
    setFormNotes(b.notes || '');
    setShowAddModal(true);
  };

  const handleSaveElderly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert(lang === 'ta' ? 'முதியோரின் பெயர் கட்டாயம் தேவை!' : 'Elderly citizen name is required!');
      return;
    }

    const cleanNic = formNic.trim() || `TNIC-${formDivision}-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const systemId = editingElderly ? editingElderly.id : generateSystemCitizenId(formDivision, beneficiaries.length + 1);
    const famCode = formFamilyCode.trim() || `FAM-${formDivision}-001`;

    const activeSchemes = formWelfareSchemes.length > 0 ? formWelfareSchemes : (formAllowanceStatus === 'RECEIVING' ? ['ELDERLY' as WelfareScheme] : []);
    const primaryScheme = activeSchemes.length > 0 ? activeSchemes[0] : 'NONE';

    const recordToSave: Beneficiary = {
      ...(editingElderly || {}),
      id: systemId,
      nic: cleanNic,
      isProvisionalNic: !formNic.trim(),
      nameTa: formName.trim(),
      nameEn: formName.trim(),
      gender: formGender,
      dob: formDob,
      phone: formPhone.trim(),
      address: formAddress.trim(),
      divisionCode: formDivision,
      familyHead: editingElderly ? editingElderly.familyHead : (formFamilyRelationship === 'HEAD'),
      householdNo: editingElderly?.householdNo || `HH-${formDivision}-001`,
      familyCode: famCode,
      familyRelationship: formFamilyRelationship,
      isElderly: true,
      elderlyAllowanceStatus: formAllowanceStatus,
      elderlyLivingStatus: formLivingStatus,
      elderlyCaretakerName: formCaretakerName.trim(),
      elderlyCaretakerPhone: formCaretakerPhone.trim(),
      elderlyMobilityStatus: formMobilityStatus,
      chronicIllness: formChronicIllness,
      welfareScheme: primaryScheme,
      welfareSchemes: activeSchemes,
      welfareStatus: 'ACTIVE',
      manualQrCode: formManualQr.trim() || undefined,
      barcode: cleanNic || systemId,
      qrPayload: formManualQr.trim() || editingElderly?.qrPayload || `VHR-DS|ID:${systemId}|NIC:${cleanNic}|DIV:${formDivision}|ELDERLY:YES`,
      notes: formNotes.trim(),
      createdAt: editingElderly ? editingElderly.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedList: Beneficiary[];
    if (editingElderly) {
      updatedList = beneficiaries.map((b) => (b.id === editingElderly.id ? recordToSave : b));
      onAuditLog('UPDATE_ELDERLY', `Updated elderly record for ${recordToSave.nameTa} (${recordToSave.nic})`);
    } else {
      updatedList = [recordToSave, ...beneficiaries];
      onAuditLog('REGISTER_ELDERLY', `Registered senior citizen ${recordToSave.nameTa} (${recordToSave.nic})`);
    }

    onUpdateBeneficiaries(updatedList);
    setShowAddModal(false);
  };

  // Filtered dataset
  const filteredList = useMemo(() => {
    return elderlyCitizens.filter((b) => {
      // 1. Division restriction
      if (isGramaNiladhari && b.divisionCode !== officerDivision) return false;
      if (!isGramaNiladhari && selectedDivision !== 'ALL' && b.divisionCode !== selectedDivision) return false;

      // 2. Age Bracket
      const age = calculateAge(b.dob);
      if (selectedAgeBracket === '60_69' && (age < 60 || age >= 70)) return false;
      if (selectedAgeBracket === '70_PLUS' && age < 70) return false;

      // 3. Allowance Status
      if (selectedAllowanceFilter !== 'ALL' && b.elderlyAllowanceStatus !== selectedAllowanceFilter) {
        if (selectedAllowanceFilter === 'RECEIVING' && b.welfareScheme !== 'ELDERLY' && b.elderlyAllowanceStatus !== 'RECEIVING') {
          return false;
        }
      }

      // 4. Mobility
      if (selectedMobilityFilter !== 'ALL' && b.elderlyMobilityStatus !== selectedMobilityFilter) return false;

      // 5. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNic = (b.nic || '').toLowerCase().includes(q);
        const matchesName = (b.nameTa || '').toLowerCase().includes(q);
        const matchesPhone = (b.phone || '').toLowerCase().includes(q);
        const matchesId = (b.id || '').toLowerCase().includes(q);
        return matchesNic || matchesName || matchesPhone || matchesId;
      }

      return true;
    });
  }, [
    elderlyCitizens,
    isGramaNiladhari,
    officerDivision,
    selectedDivision,
    selectedAgeBracket,
    selectedAllowanceFilter,
    selectedMobilityFilter,
    searchQuery,
  ]);

  // Key Statistics
  const stats = useMemo(() => {
    let age70Plus = 0;
    let allowanceCount = 0;
    let bedriddenCount = 0;
    let livingAloneCount = 0;

    elderlyCitizens.forEach((b) => {
      const age = calculateAge(b.dob);
      if (age >= 70) age70Plus++;
      if (b.elderlyAllowanceStatus === 'RECEIVING' || b.welfareScheme === 'ELDERLY') allowanceCount++;
      if (b.elderlyMobilityStatus === 'BEDRIDDEN' || b.elderlyMobilityStatus === 'WHEELCHAIR') bedriddenCount++;
      if (b.elderlyLivingStatus === 'ALONE') livingAloneCount++;
    });

    return {
      total: elderlyCitizens.length,
      age70Plus,
      allowanceCount,
      bedriddenCount,
      livingAloneCount,
    };
  }, [elderlyCitizens]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Registration ID',
      'NIC',
      'Name',
      'Gender',
      'DOB',
      'Age',
      'GN Division',
      'Phone',
      'Address',
      'Allowance Status',
      'Living Status',
      'Caretaker Name',
      'Caretaker Phone',
      'Mobility Status',
      'Chronic Illness',
      'Manual QR / Card Code',
      'Notes',
    ];

    const rows = filteredList.map((b) => [
      escapeCsv(b.id),
      escapeCsv(b.nic),
      escapeCsv(b.nameTa),
      escapeCsv(b.gender),
      escapeCsv(b.dob),
      escapeCsv(String(calculateAge(b.dob))),
      escapeCsv(b.divisionCode),
      escapeCsv(b.phone || ''),
      escapeCsv(b.address || ''),
      escapeCsv(b.elderlyAllowanceStatus || ''),
      escapeCsv(b.elderlyLivingStatus || ''),
      escapeCsv(b.elderlyCaretakerName || ''),
      escapeCsv(b.elderlyCaretakerPhone || ''),
      escapeCsv(b.elderlyMobilityStatus || ''),
      escapeCsv(b.chronicIllness || ''),
      escapeCsv(b.manualQrCode || ''),
      escapeCsv(b.notes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCsvFile(csvContent, `Vaharai_Elderly_Officers_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Official Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                {lang === 'ta' ? 'அதிகாரபூர்வ நலன்புரி கிளை' : 'Welfare Branch'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentUser.role}
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-900 mt-1">
              {lang === 'ta'
                ? 'முதியோர் நலன்புரி உத்தியோகத்தர் பகுதி (Elderly Welfare Officer Portal)'
                : 'Senior Citizens Welfare Officer Management'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'ta'
                ? 'வாகரையின் 16 கிராம அலுவலர் பிரிவுகளுக்குமான சிரேஷ்ட பிரஜைகள், 70+ கொடுப்பனவு & மருத்துவ கண்காணிப்பு'
                : 'Senior citizen welfare, 70+ allowances, mobility care, and living assistance'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{lang === 'ta' ? 'அறிக்கை அச்சிடுக' : 'Print Report'}</span>
          </button>
          {isSuperAdmin && elderlyCitizens.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllElderly}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={lang === 'ta' ? 'அனைத்து முதியோர் விபரங்களையும் நிரந்தரமாக அழி (Super Admin)' : 'Wipe all senior citizen records'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'ta' ? 'அனைத்து முதியோரையும் அழி' : 'Clear All Elderly'}</span>
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-700 hover:bg-amber-800 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? 'புதிய முதியோர் பதிவு' : 'Register Senior Citizen'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <HeartHandshake className="w-3.5 h-3.5 text-amber-700" />
            <span>{lang === 'ta' ? 'மொத்த முதியோர்' : 'Total Elderly'}</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">வயது 60+ பிரஜைகள்</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>{lang === 'ta' ? '70+ வயது கொடுப்பனவு' : '70+ Allowance'}</span>
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-1 font-mono">{stats.age70Plus}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">விசேட மாதாந்த உதவி</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>{lang === 'ta' ? 'கொடுப்பனவு பெறுவோர்' : 'Receiving Aid'}</span>
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1 font-mono">{stats.allowanceCount}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">முதியோர் உதவி திட்டம்</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-purple-700" />
            <span>{lang === 'ta' ? 'தீவிர இயலாமை / படுக்கை' : 'Bedridden / Walker'}</span>
          </div>
          <div className="text-2xl font-black text-purple-950 mt-1 font-mono">{stats.bedriddenCount}</div>
          <div className="text-[10px] text-purple-700 mt-0.5">நடமாட்டக் குறைபாடு</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <Home className="w-3.5 h-3.5 text-rose-700" />
            <span>{lang === 'ta' ? 'தனியாக வசிப்போர்' : 'Living Alone'}</span>
          </div>
          <div className="text-2xl font-black text-rose-950 mt-1 font-mono">{stats.livingAloneCount}</div>
          <div className="text-[10px] text-rose-700 mt-0.5">நேரடி பாதுகாப்பு தேவை</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={lang === 'ta' ? 'தேசிய அடையாள அட்டை, பெயர் அல்லது தொலைபேசி கொண்டு தேடுக...' : 'Search by NIC, name or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isGramaNiladhari && (
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">{t.allDivisions} (16 Divisions)</option>
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTa}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedAgeBracket}
            onChange={(e) => setSelectedAgeBracket(e.target.value as any)}
            className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">{lang === 'ta' ? 'அனைத்து வயதுகளும் (60+)' : 'All Ages (60+)'}</option>
            <option value="60_69">{lang === 'ta' ? '60 - 69 வயது' : 'Age 60-69'}</option>
            <option value="70_PLUS">{lang === 'ta' ? '70 வயதுக்கு மேற்பட்டோர்' : 'Age 70+'}</option>
          </select>

          <select
            value={selectedAllowanceFilter}
            onChange={(e) => setSelectedAllowanceFilter(e.target.value as any)}
            className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">{lang === 'ta' ? 'அனைத்து கொடுப்பனவு நிலைகளும்' : 'All Allowance Status'}</option>
            <option value="RECEIVING">{lang === 'ta' ? 'கொடுப்பனவு பெறுவோர்' : 'Receiving'}</option>
            <option value="WAITLIST">{lang === 'ta' ? 'காத்திருப்பு பட்டியல்' : 'Waitlist'}</option>
            <option value="NOT_APPLIED">{lang === 'ta' ? 'விண்ணப்பிக்காதோர்' : 'Not Applied'}</option>
          </select>

          <select
            value={selectedMobilityFilter}
            onChange={(e) => setSelectedMobilityFilter(e.target.value as any)}
            className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="ALL">{lang === 'ta' ? 'இயங்குதிறன் (அனைத்தும்)' : 'All Mobility'}</option>
            <option value="NORMAL">{lang === 'ta' ? 'சாதாரண நடை' : 'Normal Walking'}</option>
            <option value="WALKER_CANE">{lang === 'ta' ? 'கைத்தடி / வாக்கர்' : 'Walker / Cane'}</option>
            <option value="WHEELCHAIR">{lang === 'ta' ? 'சக்கர நாற்காலி' : 'Wheelchair'}</option>
            <option value="BEDRIDDEN">{lang === 'ta' ? 'படுத்த படுக்கை' : 'Bedridden'}</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4">பதிவு இலக்கம் / NIC</th>
                <th className="py-3 px-4">முதியவர் பெயர் & வயது</th>
                <th className="py-3 px-4">கிராம அலுவலர் பிரிவு</th>
                <th className="py-3 px-4">கொடுப்பனவு நிலை</th>
                <th className="py-3 px-4">வசிக்கும் நிலை & பராமரிப்பாளர்</th>
                <th className="py-3 px-4">இயங்குதிறன் / மருத்துவம்</th>
                <th className="py-3 px-4">அட்டை / QR</th>
                <th className="py-3 px-4 text-right">செயல்கள்</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <HeartHandshake className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">முதியோர் பதிவுகள் எதுவும் காணப்படவில்லை</p>
                    <p className="text-[11px] mt-1">புதிய சிரேஷ்ட பிரஜையை பதிவு செய்ய மேல் உள்ள பொத்தானை அழுத்தவும்.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((b) => {
                  const age = calculateAge(b.dob, b.nic);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium">
                        <div className="font-bold text-slate-900">{b.nic}</div>
                        <div className="text-[10px] text-slate-500">{b.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900">{b.nameTa}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            {getRelationshipTamilLabel(b.familyRelationship || (b.gender === 'FEMALE' ? 'GRANDMOTHER' : 'GRANDFATHER'))}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded font-bold ${age >= 70 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
                            {age} வயது
                          </span>
                          <span>·</span>
                          <span>{b.gender === 'MALE' ? 'ஆண்' : 'பெண்'}</span>
                        </div>
                        {b.familyCode && (
                          <div className="text-[10px] text-blue-800 font-mono font-bold mt-0.5">
                            QR அலகு: {b.familyCode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-900">
                          {b.divisionCode}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {divisions.find((d) => d.code === b.divisionCode)?.nameTa || b.divisionCode}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {b.elderlyAllowanceStatus === 'RECEIVING' || b.welfareScheme === 'ELDERLY' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            பெறுகிறார் (Receiving)
                          </span>
                        ) : b.elderlyAllowanceStatus === 'WAITLIST' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            காத்திருப்போர் (Waitlist)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            விண்ணப்பிக்கவில்லை
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {b.elderlyLivingStatus === 'ALONE' ? (
                            <span className="text-rose-700 font-bold">தனியாக வசிப்பவர்</span>
                          ) : b.elderlyLivingStatus === 'ELDER_CARE_HOME' ? (
                            <span className="text-purple-700 font-bold">முதியோர் இல்லம்</span>
                          ) : (
                            <span>குடும்பத்துடன்</span>
                          )}
                        </div>
                        {b.elderlyCaretakerName && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            பராமரிப்பாளர்: {b.elderlyCaretakerName} {b.elderlyCaretakerPhone && `(${b.elderlyCaretakerPhone})`}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">
                          {b.elderlyMobilityStatus === 'BEDRIDDEN' ? (
                            <span className="text-rose-800 font-bold">படுத்த படுக்கை</span>
                          ) : b.elderlyMobilityStatus === 'WHEELCHAIR' ? (
                            <span className="text-purple-800 font-bold">சக்கர நாற்காலி</span>
                          ) : b.elderlyMobilityStatus === 'WALKER_CANE' ? (
                            <span className="text-amber-800 font-medium">கைத்தடி/வாக்கர்</span>
                          ) : (
                            <span className="text-slate-600">சாதாரண நடை</span>
                          )}
                        </div>
                        {b.chronicIllness && b.chronicIllness !== 'NONE' && (
                          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            ⚠️ {b.chronicIllness}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {b.manualQrCode ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            {b.manualQrCode}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">வழங்கப்படவில்லை</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => setViewingCardCitizen(b)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          அட்டை
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded text-[11px] font-bold border border-amber-200 cursor-pointer"
                        >
                          திருத்துக
                        </button>
                        <button
                          onClick={() => handleDeleteSingleElderly(b)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-bold border border-rose-200 cursor-pointer"
                          title={lang === 'ta' ? 'இப்பதிவை நிரந்தரமாக அழி' : 'Delete permanently'}
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Senior Citizen */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-amber-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingElderly ? 'முதியோர் விபரங்களை புதுப்பிக்க' : 'புதிய சிரேஷ்ட பிரஜை பதிவு (Senior Citizen Registration)'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveElderly} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    முதியவர் பெயர் (Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. கந்தையா சிவபாக்கியம்"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    தேசிய அடையாள அட்டை (NIC)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 505123456V அல்லது 195012345678"
                    value={formNic}
                    onChange={(e) => handleNicChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-600 focus:outline-none"
                  />
                  {nicParsed.isValid && (
                    <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
                      ✓ NIC மூலம் கணிக்கப்பட்டது: வயது {nicParsed.age} · பிறந்த திகதி {nicParsed.dob}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    கிராம அலுவலர் பிரிவு *
                  </label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    disabled={isGramaNiladhari}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    பிறந்த திகதி (DOB)
                  </label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    பாலினம் (Gender)
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="FEMALE">பெண் (Female)</option>
                    <option value="MALE">ஆண் (Male)</option>
                    <option value="OTHER">ஏனையவை</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    தொலைபேசி இலக்கம்
                  </label>
                  <input
                    type="text"
                    placeholder="077xxxxxxx"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    முகவரி
                  </label>
                  <input
                    type="text"
                    placeholder="வீட்டு முகவரி"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Requirement 03: Family QR Code & Relationship in Elderly Registration */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <span>👨‍👩‍👧‍👦</span>
                    <span>குடும்ப அலகு & பொதுவான கிவ் ஆர் (Family Unit & Common QR Code)</span>
                  </div>
                  <span className="text-[10px] bg-blue-200 text-blue-900 font-mono font-bold px-2 py-0.5 rounded">
                    பொது அலகு
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">
                      குடும்ப QR எண் (Family Master Code) *
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        value={formFamilyCode}
                        onChange={(e) => setFormFamilyCode(e.target.value.trim().toUpperCase())}
                        placeholder="e.g. FAM-211-102"
                        className="w-full px-3 py-1.5 border border-blue-300 rounded-lg font-mono font-bold text-blue-950 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setFormFamilyCode(`FAM-${formDivision}-${Math.floor(Math.random() * 800 + 100)}`)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg whitespace-nowrap shadow-xs"
                      >
                        🎲 புதிய எண்
                      </button>
                    </div>
                    <span className="text-[10px] text-blue-800 mt-1 block">
                      ℹ️ குடும்பத்தின் பொதுவான கிவ் ஆர் இலக்கம். தாய், தந்தை, முதியோர், பிள்ளைகள் அனைவரும் இந்த ஒரே எண்ணையே பகிர்வர்.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-blue-950 mb-1">
                      குடும்ப உறவு நிலை (Family Relationship) *
                    </label>
                    <select
                      value={formFamilyRelationship}
                      onChange={(e) => setFormFamilyRelationship(e.target.value as FamilyRelationship)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white font-bold text-slate-800"
                    >
                      {FAMILY_RELATIONSHIP_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.icon} {lang === 'ta' ? opt.labelTa : opt.labelEn}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      இயல்புநிலை: தாத்தா / பாட்டி (Grandparent / Elder)
                    </span>
                  </div>
                </div>
              </div>

              {/* Requirement 02: Multi-Welfare Assistance Checklist (செக் லிஸ்ட்) */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>நலன்புரி உதவிகள் செக் லிஸ்ட் (Multi-Welfare Checklist):</span>
                    </label>
                    <span className="text-[10px] text-emerald-800 block">
                      முதியோர் கொடுப்பனவுடன் அஸ்வெசும, நாள்பட்ட சிறுநீரக உதவி, நிவாரணம் போன்ற உதவிகளையும் பெறலாம்.
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    {formWelfareSchemes.length} உதவிகள்
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1.5 bg-white rounded-lg border border-emerald-200">
                  {ALL_WELFARE_SCHEMES_LIST.map((scheme) => {
                    const isChecked = formWelfareSchemes.includes(scheme.id);
                    return (
                      <label
                        key={scheme.id}
                        className={`flex items-start gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-400 font-bold text-emerald-950'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleWelfareScheme(scheme.id)}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <span className="text-[11px] truncate">
                          {lang === 'ta' ? scheme.labelTa : scheme.labelEn}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>நலன்புரி கொடுப்பனவு மற்றும் வாழ்வாதார நிலை</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      முதியோர் கொடுப்பனவு நிலை
                    </label>
                    <select
                      value={formAllowanceStatus}
                      onChange={(e) => setFormAllowanceStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                    >
                      <option value="RECEIVING">கொடுப்பனவு பெறுகிறார் (Receiving)</option>
                      <option value="WAITLIST">காத்திருப்பு பட்டியலில் உள்ளார்</option>
                      <option value="NOT_APPLIED">விண்ணப்பிக்கவில்லை</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      வசிக்கும் நிலை
                    </label>
                    <select
                      value={formLivingStatus}
                      onChange={(e) => setFormLivingStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="WITH_FAMILY">குடும்பத்தினருடன் வசிக்கிறார்</option>
                      <option value="ALONE">தனியாக வசிக்கிறார் (Alone)</option>
                      <option value="ELDER_CARE_HOME">முதியோர் இல்லத்தில் வசிக்கிறார்</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      இயங்குதிறன் (Mobility)
                    </label>
                    <select
                      value={formMobilityStatus}
                      onChange={(e) => setFormMobilityStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="NORMAL">சாதாரண நடை (Normal)</option>
                      <option value="WALKER_CANE">கைத்தடி / வாக்கர் உதவி</option>
                      <option value="WHEELCHAIR">சக்கர நாற்காலி (Wheelchair)</option>
                      <option value="BEDRIDDEN">படுத்த படுக்கை (Bedridden)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      பராமரிப்பாளர் பெயர் (Caretaker)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. மகன் / மகள் / உறவினர்"
                      value={formCaretakerName}
                      onChange={(e) => setFormCaretakerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      பராமரிப்பாளர் தொடர்பு எண்
                    </label>
                    <input
                      type="text"
                      placeholder="07xxxxxxxx"
                      value={formCaretakerPhone}
                      onChange={(e) => setFormCaretakerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Requirement 02: Manual QR Code input provided by officers */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-slate-600" />
                  <span>உத்தியோகபூர்வ அட்டை QR / அடையாளக்குறி (Manual QR / Card Code)</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  அலுவலகத்தால் வழங்கப்படும் அட்டை அல்லது பார்கோட் குறியீட்டை இங்கு உள்ளிடலாம் / ஸ்கேன் செய்யலாம்.
                </p>
                <input
                  type="text"
                  placeholder="e.g. VHR-ELD-2026-904"
                  value={formManualQr}
                  onChange={(e) => setFormManualQr(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  மேலதிக குறிப்புகள் / அவதானிப்புகள்
                </label>
                <textarea
                  rows={2}
                  placeholder="மருத்துவ சிகிச்சை, விசேட ஊட்டச்சத்து அல்லது அவசர உதவிகள் குறித்த விபரங்கள்..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {editingElderly ? 'புதுப்பிக்க' : 'பதிவு செய்க'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID Card Modal */}
      {viewingCardCitizen && (
        <BeneficiaryIdCardModal
          beneficiary={viewingCardCitizen}
          division={divisions.find((d) => d.code === viewingCardCitizen.divisionCode)}
          lang={lang}
          onClose={() => setViewingCardCitizen(null)}
        />
      )}
    </div>
  );
};
