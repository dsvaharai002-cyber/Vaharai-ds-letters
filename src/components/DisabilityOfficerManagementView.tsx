import React, { useState, useMemo } from 'react';
import {
  Beneficiary,
  GNDivision,
  User,
  DisabilityCause,
  FamilyRelationship,
  WelfareScheme,
  FAMILY_RELATIONSHIP_OPTIONS,
  ALL_WELFARE_SCHEMES_LIST,
} from '../types';
import { Language, translations } from '../translations/i18n';
import { parseSriLankanNic } from '../utils/nicParser';
import {
  calculateAge,
  generateSystemCitizenId,
  generateUniqueFamilyCode,
  generateUniqueFamilyQrPayload,
  deleteSingleBeneficiary,
  recordDeletedId,
  saveBeneficiaries,
} from '../services/storage';
import { downloadCsvFile, parseCsvContent, escapeCsv, getRelationshipTamilLabel } from '../services/csv';
import { Accessibility, Plus, Upload, Download, Search, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Printer, Trash2 } from 'lucide-react';
import { BeneficiaryIdCardModal } from './BeneficiaryIdCardModal';

interface DisabilityOfficerManagementViewProps {
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const DISABILITY_NATURE_OPTIONS = [
  { value: 'உடல் ஊனம் (Physical Disability)', labelTa: 'உடல் ஊனம் (Physical)', labelEn: 'Physical Disability' },
  { value: 'பார்வை குறைபாடு (Visual Impairment)', labelTa: 'பார்வை குறைபாடு (Visual)', labelEn: 'Visual Impairment' },
  { value: 'செவிப்புலன் / பேச்சு குறைபாடு (Hearing & Speech)', labelTa: 'செவிப்புலன் / பேச்சு குறைபாடு', labelEn: 'Hearing / Speech Impairment' },
  { value: 'உள நலம் / புத்திசாதுரிய குறைபாடு (Intellectual/Mental)', labelTa: 'உள நலம் / புத்திசாதுரிய குறைபாடு', labelEn: 'Intellectual / Mental Disability' },
  { value: 'பலதரப்பட்ட குறைபாடு (Multiple Disabilities)', labelTa: 'பலதரப்பட்ட குறைபாடு (Multiple)', labelEn: 'Multiple Disabilities' },
  { value: 'ஏனையவை (Other)', labelTa: 'ஏனையவை (Other)', labelEn: 'Other' },
];

export const DISABILITY_CAUSE_OPTIONS: { value: DisabilityCause; labelTa: string; labelEn: string }[] = [
  { value: 'BIRTH', labelTa: 'பிறப்பு (By Birth)', labelEn: 'By Birth' },
  { value: 'ACCIDENT', labelTa: 'விபத்து (Accident)', labelEn: 'Accident' },
  { value: 'WAR', labelTa: 'யுத்தம் (War / Conflict)', labelEn: 'War / Conflict' },
  { value: 'ILLNESS', labelTa: 'நோய் (Illness / Disease)', labelEn: 'Illness / Disease' },
  { value: 'OTHER', labelTa: 'ஏனையவை (Other)', labelEn: 'Other' },
];

export const DisabilityOfficerManagementView: React.FC<DisabilityOfficerManagementViewProps> = ({
  beneficiaries,
  divisions,
  currentUser,
  lang,
  onUpdateBeneficiaries,
  onAuditLog,
}) => {
  const t = translations[lang];

  // STRICT REQUIREMENT 05: Show ONLY disability-related records to DISABILITY_OFFICER
  const disabilityBeneficiaries = useMemo(() => {
    return beneficiaries.filter(
      (b) => b.isPersonWithDisability || b.chronicIllness === 'DISABILITY_PHYSICAL' || b.welfareScheme === 'DISABILITY' || b.disabilityNature
    );
  }, [beneficiaries]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('ALL');
  const [selectedNature, setSelectedNature] = useState('ALL');
  const [selectedCause, setSelectedCause] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [viewingCardCitizen, setViewingCardCitizen] = useState<Beneficiary | null>(null);

  // Form State for New Disability Registration
  const [formName, setFormName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formDivision, setFormDivision] = useState('211');
  const [formNature, setFormNature] = useState(DISABILITY_NATURE_OPTIONS[0].value);
  const [formCause, setFormCause] = useState<DisabilityCause>('BIRTH');
  const [formFamilyQr, setFormFamilyQr] = useState('');
  const [formFamilyRelationship, setFormFamilyRelationship] = useState<FamilyRelationship>('SON');
  const [formWelfareSchemes, setFormWelfareSchemes] = useState<WelfareScheme[]>(['DISABILITY']);
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Auto-calculated from NIC
  const nicParsed = useMemo(() => parseSriLankanNic(formNic), [formNic]);

  // When division changes in form, auto-suggest family QR if empty
  const handleDivisionChange = (div: string) => {
    setFormDivision(div);
    if (!formFamilyQr.trim()) {
      const famCode = generateUniqueFamilyCode(div, Math.floor(Math.random() * 800 + 100));
      setFormFamilyQr(generateUniqueFamilyQrPayload(famCode, div));
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

  const handleOpenAddModal = () => {
    const div = '211';
    const famCode = generateUniqueFamilyCode(div, Math.floor(Math.random() * 800 + 100));
    setFormDivision(div);
    setFormFamilyQr(generateUniqueFamilyQrPayload(famCode, div));
    setFormFamilyRelationship('SON');
    setFormWelfareSchemes(['DISABILITY']);
    setFormName('');
    setFormNic('');
    setFormNature(DISABILITY_NATURE_OPTIONS[0].value);
    setFormCause('BIRTH');
    setFormAddress('');
    setFormPhone('');
    setFormNotes('');
    setShowAddModal(true);
  };

  const isSuperAdmin = currentUser.role === 'SUPERADMIN';

  // Super Admin: Wipe all disability records permanently
  const handleClearAllDisability = () => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'அனைத்து மாற்றுத்திறனாளி விபரங்களையும் அழிக்க சுப்பர் அட்மின் அனுமதி தேவை.' : 'Super Admin permission required.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? 'எச்சரிக்கை: பதிவுசெய்யப்பட்ட அனைத்து மாற்றுத்திறனாளி விபரங்களையும் நிரந்தரமாக அழிக்க விரும்புகிறீர்களா? இந்நடவடிக்கையை மீளப்பெற முடியாது.'
        : 'WARNING: Are you sure you want to permanently delete all disability records?'
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

    const ids = new Set(disabilityBeneficiaries.map((b) => b.id));
    disabilityBeneficiaries.forEach((b) => recordDeletedId(b.id, b.nic));
    const remaining = beneficiaries.filter((b) => !ids.has(b.id));
    saveBeneficiaries(remaining);
    onUpdateBeneficiaries(remaining);
    onAuditLog('CLEAR_ALL_DISABILITY', `Super Admin ${currentUser.name} wiped ${ids.size} disability records.`);
    alert(lang === 'ta' ? 'அனைத்து மாற்றுத்திறனாளி விபரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன.' : 'All disability records have been wiped.');
  };

  // Delete single disability citizen
  const handleDeleteSingleDisability = (b: Beneficiary) => {
    const confirmed = window.confirm(
      lang === 'ta'
        ? `${b.nameTa} (${b.nic}) அவர்களின் விபரங்களை நிரந்தரமாக அழிக்க விரும்புகிறீர்களா?`
        : `Permanently delete disability record ${b.nameEn || b.nameTa} (${b.nic})?`
    );
    if (!confirmed) return;

    recordDeletedId(b.id, b.nic);
    deleteSingleBeneficiary(b.id);
    const remaining = beneficiaries.filter((item) => item.id !== b.id);
    saveBeneficiaries(remaining);
    onUpdateBeneficiaries(remaining);
    onAuditLog('DELETE_DISABILITY', `Deleted disability record ${b.nameTa} (${b.nic})`);
  };

  const handleSaveDisabilityCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert(lang === 'ta' ? 'பெயர் கட்டாயமாக உள்ளிடப்பட வேண்டும்!' : 'Name is required!');
      return;
    }

    const cleanNic = formNic.trim() || `TNIC-${formDivision}-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
    const effectiveFamCode = formFamilyQr.includes('FAM:')
      ? formFamilyQr.split('FAM:')[1].split('|')[0]
      : generateUniqueFamilyCode(formDivision, Math.floor(Math.random() * 800 + 100));

    const dob = nicParsed.isValid && nicParsed.dob ? nicParsed.dob : '1995-01-01';
    const gender = nicParsed.isValid && nicParsed.gender ? nicParsed.gender : 'MALE';
    const systemId = generateSystemCitizenId(formDivision, beneficiaries.length + 1);

    const activeSchemes = formWelfareSchemes.length > 0 ? formWelfareSchemes : ['DISABILITY' as WelfareScheme];
    const primaryScheme = activeSchemes[0] || 'DISABILITY';

    const newCitizen: Beneficiary = {
      id: systemId,
      nic: cleanNic,
      isProvisionalNic: cleanNic.startsWith('TNIC-'),
      nameTa: formName.trim(),
      nameEn: formName.trim(),
      gender,
      dob,
      phone: formPhone.trim(),
      address: formAddress.trim(),
      divisionCode: formDivision,
      familyHead: formFamilyRelationship === 'HEAD',
      householdNo: `HH-${formDivision}-${Math.floor(Math.random() * 900 + 100)}`,
      familyCode: effectiveFamCode,
      familyRelationship: formFamilyRelationship,
      isPersonWithDisability: true,
      disabilityType: formNature,
      disabilityNature: formNature,
      disabilityCause: formCause,
      disabilityRegistrationDate: new Date().toISOString().slice(0, 10),
      welfareScheme: primaryScheme,
      welfareSchemes: activeSchemes,
      welfareStatus: 'ACTIVE',
      chronicIllness: 'DISABILITY_PHYSICAL',
      barcode: cleanNic,
      qrPayload: `ID:${systemId}|NIC:${cleanNic}|DISABILITY|NATURE:${formNature}|CAUSE:${formCause}`,
      familyQrPayload: formFamilyQr.trim() || generateUniqueFamilyQrPayload(effectiveFamCode, formDivision),
      notes: formNotes.trim() ? `[அங்கவீனர் பதிவு] ${formNotes.trim()}` : `[அங்கவீனர் பதிவு: ${formNature} - ${formCause}]`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    const updated = [newCitizen, ...beneficiaries];
    onUpdateBeneficiaries(updated);
    onAuditLog('REGISTER_DISABILITY', `Registered disabled citizen ${newCitizen.nameTa} (NIC: ${newCitizen.nic}, Nature: ${formNature}, Cause: ${formCause}, Family: ${effectiveFamCode})`);

    setShowAddModal(false);
    alert(lang === 'ta' ? 'மாற்றுத்திறனாளி விபரம் வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Disability record registered successfully!');
  };

  // Dedicated CSV Upload for Disability Records (Requirement 05)
  const [csvContent, setCsvContent] = useState('');
  const [csvParseError, setCsvParseError] = useState('');

  const handleDownloadDisabilitySampleCsv = () => {
    const headers = ['QR_Code', 'Name_Ta', 'Name_En', 'NIC', 'Division_Code', 'Disability_Nature', 'Disability_Cause', 'Address', 'Phone', 'Notes'];
    const rows = [
      headers.join(','),
      'VHR-FAMILY|FAM:FAM-211-101|DIV:211|UID:FAM-211-101-9K2L,முருகேசு பிரபாகரன்,Murugesu Prabaharan,199214500321,211,"உடல் ஊனம் (Physical Disability)",ACCIDENT,"பிரதான வீதி, மாங்கேணி",0771234567,"மோட்டார் விபத்தினால் காலில் ஊனம்"',
      'VHR-FAMILY|FAM:FAM-212A-044|DIV:212A|UID:FAM-212A-044-3M7X,சிவகுமார் நளினி,Sivakumar Nalini,198664200819,212A,"பார்வை குறைபாடு (Visual Impairment)",BIRTH,"கடற்கரை வீதி, வாகரை வடக்கு",0777654321,"பிறப்பிலேயே பார்வை குறைபாடு"',
      'VHR-FAMILY|FAM:FAM-213-082|DIV:213|UID:FAM-213-082-8P4V,இராசதுரை யோகேஸ்வரன்,Rasathurai Yogeswaran,197821500412,213,"செவிப்புலன் / பேச்சு குறைபாடு (Hearing & Speech)",WAR,"பாடசாலை வீதி, கதிரவெளி",0768901234,"யுத்த கால எறிகணை சத்தத்தால் செவிப்புலன் பாதிப்பு"',
    ];
    downloadCsvFile(rows.join('\n'), 'vaharai_ds_disability_records_sample.csv');
  };

  const handleImportDisabilityCsv = () => {
    setCsvParseError('');
    if (!csvContent.trim()) {
      setCsvParseError('தயவுசெய்து CSV கோப்பினை தெரிவுசெய்யவும்.');
      return;
    }

    try {
      const rows = parseCsvContent(csvContent);
      if (rows.length < 2) {
        setCsvParseError('CSV கோப்பில் போதுமான தரவுகள் இல்லை.');
        return;
      }

      const newItems: Beneficiary[] = [];
      const startIndex = rows[0][0]?.toLowerCase().includes('qr') || rows[0][0]?.toLowerCase().includes('name') ? 1 : 0;

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 4) continue;

        const qrCode = row[0]?.trim() || '';
        const nameTa = row[1]?.trim() || '';
        const nameEn = row[2]?.trim() || nameTa;
        const nic = row[3]?.trim() || '';
        const divisionCode = row[4]?.trim() || '211';
        const disabilityNature = row[5]?.trim() || 'உடல் ஊனம் (Physical Disability)';
        const disabilityCauseRaw = (row[6] || 'BIRTH').trim().toUpperCase();
        const address = row[7]?.trim() || '';
        const phone = row[8]?.trim() || '';
        const notes = row[9]?.trim() || '';

        if (!nameTa && !nic) continue;

        let disabilityCause: DisabilityCause = 'OTHER';
        if (disabilityCauseRaw.includes('ACCIDENT') || disabilityCauseRaw.includes('விபத்து')) disabilityCause = 'ACCIDENT';
        else if (disabilityCauseRaw.includes('BIRTH') || disabilityCauseRaw.includes('பிறப்பு')) disabilityCause = 'BIRTH';
        else if (disabilityCauseRaw.includes('WAR') || disabilityCauseRaw.includes('யுத்தம்')) disabilityCause = 'WAR';
        else if (disabilityCauseRaw.includes('ILLNESS') || disabilityCauseRaw.includes('நோய்')) disabilityCause = 'ILLNESS';

        const parsed = parseSriLankanNic(nic);
        const dob = parsed.isValid && parsed.dob ? parsed.dob : '1990-01-01';
        const gender = parsed.isValid && parsed.gender ? parsed.gender : 'MALE';
        const systemId = generateSystemCitizenId(divisionCode, beneficiaries.length + newItems.length + 1);
        const famCode = qrCode.includes('FAM:') ? qrCode.split('FAM:')[1].split('|')[0] : generateUniqueFamilyCode(divisionCode, i + 1);

        newItems.push({
          id: systemId,
          nic: nic || `TNIC-${divisionCode}-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`,
          isProvisionalNic: !nic || nic.startsWith('TNIC-'),
          nameTa,
          nameEn,
          gender,
          dob,
          phone,
          address,
          divisionCode,
          familyHead: false,
          householdNo: `HH-${divisionCode}-${famCode}`,
          familyCode: famCode,
          isPersonWithDisability: true,
          disabilityType: disabilityNature,
          disabilityNature,
          disabilityCause,
          disabilityRegistrationDate: new Date().toISOString().slice(0, 10),
          welfareScheme: 'DISABILITY',
          welfareStatus: 'ACTIVE',
          chronicIllness: 'DISABILITY_PHYSICAL',
          barcode: nic || systemId,
          qrPayload: `ID:${systemId}|NIC:${nic}|DISABILITY|${disabilityNature}|${disabilityCause}`,
          familyQrPayload: qrCode || generateUniqueFamilyQrPayload(famCode, divisionCode),
          notes: notes ? `[CSV மாற்றுத்திறனாளி பதிவு] ${notes}` : `[CSV மாற்றுத்திறனாளி பதிவு: ${disabilityNature}]`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'ACTIVE',
        });
      }

      if (newItems.length === 0) {
        setCsvParseError('செல்லுபடியான மாற்றுத்திறனாளி வரிசைகள் எதுவும் காணப்படவில்லை.');
        return;
      }

      // Merge by NIC
      const map = new Map<string, Beneficiary>();
      beneficiaries.forEach((b) => map.set(b.nic.toLowerCase(), b));
      newItems.forEach((b) => map.set(b.nic.toLowerCase(), b));
      const merged = Array.from(map.values());

      onUpdateBeneficiaries(merged);
      onAuditLog('IMPORT_DISABILITY_CSV', `Imported ${newItems.length} disability records from dedicated CSV`);

      setShowCsvModal(false);
      setCsvContent('');
      alert(lang === 'ta' ? `${newItems.length} மாற்றுத்திறனாளி பதிவுகள் வெற்றிகரமாக பதிவேற்றப்பட்டன!` : `${newItems.length} disability records imported successfully!`);
    } catch (err: any) {
      setCsvParseError(err.message || 'CSV கோப்பினை வாசிப்பதில் பிழை ஏற்பட்டது.');
    }
  };

  // Filtered dataset
  const filteredList = useMemo(() => {
    return disabilityBeneficiaries.filter((b) => {
      if (selectedDivision !== 'ALL' && b.divisionCode !== selectedDivision) return false;
      if (selectedNature !== 'ALL' && b.disabilityNature !== selectedNature && b.disabilityType !== selectedNature) return false;
      if (selectedCause !== 'ALL' && b.disabilityCause !== selectedCause) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.nameTa?.toLowerCase().includes(q) || b.nameEn?.toLowerCase().includes(q);
        const matchNic = b.nic?.toLowerCase().includes(q);
        const matchQr = b.familyQrPayload?.toLowerCase().includes(q) || b.familyCode?.toLowerCase().includes(q);
        return matchName || matchNic || matchQr;
      }
      return true;
    });
  }, [disabilityBeneficiaries, selectedDivision, selectedNature, selectedCause, searchQuery]);

  // Cause counts
  const birthCount = disabilityBeneficiaries.filter((b) => b.disabilityCause === 'BIRTH').length;
  const accidentCount = disabilityBeneficiaries.filter((b) => b.disabilityCause === 'ACCIDENT').length;
  const warCount = disabilityBeneficiaries.filter((b) => b.disabilityCause === 'WAR').length;
  const illnessCount = disabilityBeneficiaries.filter((b) => b.disabilityCause === 'ILLNESS').length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-blue-500/20 rounded-lg text-blue-300">
                <Accessibility className="w-5 h-5" />
              </span>
              <span className="text-xs uppercase tracking-wider text-blue-300 font-bold font-mono">
                DISABILITY_OFFICER DEDICATED PORTAL
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {lang === 'ta' ? 'அங்கவீனர் / மாற்றுத்திறனாளிகள் பதிவு & முகாமைத்துவ பிரிவு' : 'Disability Welfare & Rights Management Portal'}
            </h1>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
              {lang === 'ta'
                ? 'பிரதேச செயலக எல்லைக்குட்பட்ட மாற்றுத்திறனாளிகள், அவர்களின் குடும்ப அலகு QR குறியீடு, ஊனத்தின் தன்மை மற்றும் உருவான காரணம் என்பவற்றை பதிவு செய்யும் பிரத்தியேக தளம்.'
                : 'Dedicated officer portal for registration of persons with disabilities, family unit QR code mapping, nature of disability, and cause tracking.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ta' ? '+ புதிய மாற்றுத்திறனாளி பதிவு' : '+ Register Disabled Person'}</span>
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 shadow-xs"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>{lang === 'ta' ? 'தனியான CSV பதிவேற்றம்' : 'Disability CSV Upload'}</span>
            </button>
            {isSuperAdmin && disabilityBeneficiaries.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllDisability}
                className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                title={lang === 'ta' ? 'அனைத்து மாற்றுத்திறனாளி விபரங்களையும் நிரந்தரமாக அழி (Super Admin)' : 'Wipe all disability records'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>{lang === 'ta' ? 'அனைத்து மாற்றுத்திறனாளியையும் அழி' : 'Clear All Disability'}</span>
              </button>
            )}
            <button
              onClick={handleDownloadDisabilitySampleCsv}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-700"
              title="Download Disability CSV Template"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">மாதிரி CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">மொத்த மாற்றுத்திறனாளிகள்</span>
          <strong className="text-xl font-bold font-mono text-slate-900 mt-1 block">{disabilityBeneficiaries.length}</strong>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">16 கிராம பிரிவுகள்</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">பிறப்பினால் (Birth)</span>
          <strong className="text-xl font-bold font-mono text-indigo-700 mt-1 block">{birthCount}</strong>
          <span className="text-[10px] text-slate-400 block">இயற்கை குறைபாடு</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">விபத்தினால் (Accident)</span>
          <strong className="text-xl font-bold font-mono text-amber-700 mt-1 block">{accidentCount}</strong>
          <span className="text-[10px] text-slate-400 block">வாகனம் / தொழில்</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">யுத்தத்தினால் (War)</span>
          <strong className="text-xl font-bold font-mono text-red-700 mt-1 block">{warCount}</strong>
          <span className="text-[10px] text-slate-400 block">மோதல் / ஷெல் பாதிப்பு</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">நோயினால் (Illness)</span>
          <strong className="text-xl font-bold font-mono text-purple-700 mt-1 block">{illnessCount}</strong>
          <span className="text-[10px] text-slate-400 block">பக்கவாதம் / ஏனையவை</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={lang === 'ta' ? 'பெயர், NIC, கிவ் ஆர் (QR) அல்லது குடும்ப குறியீடு மூலம் தேடவும்...' : 'Search by Name, NIC, QR code or Family ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Division dropdown */}
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
            >
              <option value="ALL">{lang === 'ta' ? 'அனைத்து கிராம பிரிவுகள்' : 'All Divisions'}</option>
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTa}
                </option>
              ))}
            </select>

            {/* Nature of Disability dropdown */}
            <select
              value={selectedNature}
              onChange={(e) => setSelectedNature(e.target.value)}
              className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
            >
              <option value="ALL">{lang === 'ta' ? 'அனைத்து ஊனத் தன்மைகள்' : 'All Disability Types'}</option>
              {DISABILITY_NATURE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelTa}
                </option>
              ))}
            </select>

            {/* Cause dropdown */}
            <select
              value={selectedCause}
              onChange={(e) => setSelectedCause(e.target.value)}
              className="px-2.5 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800"
            >
              <option value="ALL">{lang === 'ta' ? 'அனைத்து காரணங்கள்' : 'All Causes'}</option>
              {DISABILITY_CAUSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelTa}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Disability Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            {lang === 'ta' ? `காட்டப்படும் பதிவுகள்: ${filteredList.length}` : `Records Shown: ${filteredList.length}`}
          </span>
          <span className="text-slate-500 text-[11px]">
            {lang === 'ta' ? 'குறித்த அங்கவீனம் சார் விபரங்கள் மட்டுமே காட்டப்படுகின்றன' : 'Strictly disability-specific data'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">கிவ் ஆர் / குடும்ப குறியீடு</th>
                <th className="py-3 px-3">{t.nic}</th>
                <th className="py-3 px-3">{t.nameTamil}</th>
                <th className="py-3 px-2 text-center">{t.age} / {t.gender}</th>
                <th className="py-3 px-3">{t.division}</th>
                <th className="py-3 px-3">அங்கவீனத்தின் தன்மை</th>
                <th className="py-3 px-3">உருவான காரணம்</th>
                <th className="py-3 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Accessibility className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>{lang === 'ta' ? 'மாற்றுத்திறனாளி பதிவுகள் எதுவும் இல்லை. புதியவரை சேர்க்க மேலே உள்ள பொத்தானைப் பயன்படுத்தவும்.' : 'No disability records found. Click above to add.'}</span>
                  </td>
                </tr>
              ) : (
                filteredList.map((b) => {
                  const age = calculateAge(b.dob, b.nic);
                  return (
                    <tr key={b.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Family QR / Code */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-blue-900 block text-[11px]">
                          {b.familyCode || 'FAM-211'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 truncate max-w-[140px] block" title={b.familyQrPayload}>
                          {b.familyQrPayload ? 'QR: ' + b.familyQrPayload.slice(0, 24) + '...' : '-'}
                        </span>
                      </td>

                      {/* NIC */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">
                        {b.nic}
                      </td>

                      {/* Name & Family */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-slate-900 leading-tight">{b.nameTa}</strong>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            {getRelationshipTamilLabel(b.familyRelationship || 'SON')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{b.nameEn}</span>
                        {b.familyCode && (
                          <div className="text-[10px] text-blue-800 font-mono font-bold mt-0.5">
                            QR அலகு: {b.familyCode}
                          </div>
                        )}
                      </td>

                      {/* Age & Gender */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <span className="inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700">
                          {age} {t.yearsOld}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {b.gender === 'MALE' ? 'ஆண்' : b.gender === 'FEMALE' ? 'பெண்' : b.gender}
                        </span>
                      </td>

                      {/* Division */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        <strong className="text-slate-800">{b.divisionCode}</strong>
                      </td>

                      {/* Nature */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                          {b.disabilityNature || b.disabilityType || 'உடல் ஊனம்'}
                        </span>
                      </td>

                      {/* Cause */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.disabilityCause === 'BIRTH'
                              ? 'bg-indigo-100 text-indigo-900'
                              : b.disabilityCause === 'ACCIDENT'
                              ? 'bg-amber-100 text-amber-900'
                              : b.disabilityCause === 'WAR'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {b.disabilityCause === 'BIRTH'
                            ? 'பிறப்பு'
                            : b.disabilityCause === 'ACCIDENT'
                            ? 'விபத்து'
                            : b.disabilityCause === 'WAR'
                            ? 'யுத்தம்'
                            : b.disabilityCause === 'ILLNESS'
                            ? 'நோய்'
                            : b.disabilityCause || 'ஏனையவை'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => setViewingCardCitizen(b)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded font-bold text-[11px] transition-colors"
                        >
                          🪪 அடையாள அட்டை
                        </button>
                        <button
                          onClick={() => handleDeleteSingleDisability(b)}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold text-[11px] border border-rose-200 transition-colors"
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

      {/* Modal: New Disability Citizen Registration */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-4">
            <div className="bg-blue-950 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Accessibility className="w-5 h-5 text-blue-300" />
                <h3 className="text-sm font-bold">புதிய மாற்றுத்திறனாளி பதிவு (Disability Officer)</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveDisabilityCitizen} className="p-4 sm:p-5 space-y-3 max-h-[82vh] overflow-y-auto text-xs">
              {/* Family QR Code & Relationship (Requirement 03) */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                    <span>👨‍👩‍👧‍👦</span>
                    <span>கிவ் ஆர் குறியீடு / குடும்ப அலகு QR (Family QR Payload) *</span>
                  </label>
                  <span className="text-[10px] bg-blue-200 text-blue-900 font-mono font-bold px-2 py-0.5 rounded">
                    பொது அலகு
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    required
                    placeholder="VHR-FAMILY|FAM:FAM-211-042|DIV:211|..."
                    value={formFamilyQr}
                    onChange={(e) => setFormFamilyQr(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg font-mono bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const famCode = generateUniqueFamilyCode(formDivision, Math.floor(Math.random() * 800 + 100));
                      setFormFamilyQr(generateUniqueFamilyQrPayload(famCode, formDivision));
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg whitespace-nowrap shadow-xs"
                  >
                    🎲 புதிய QR
                  </button>
                </div>
                <span className="text-[10px] text-blue-700 block">
                  இப்பிரதேச செயலகத்தினால் குடும்ப அலகிற்கு உருவாக்கப்பட்ட பொதுவான குடும்ப QR குறியீடு.
                </span>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    குடும்ப உறவு நிலை (Family Relationship) *
                  </label>
                  <select
                    value={formFamilyRelationship}
                    onChange={(e) => setFormFamilyRelationship(e.target.value as FamilyRelationship)}
                    className="w-full px-3 py-2 text-xs border border-blue-300 rounded-lg bg-white font-bold text-slate-800"
                  >
                    {FAMILY_RELATIONSHIP_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {lang === 'ta' ? opt.labelTa : opt.labelEn}
                      </option>
                    ))}
                  </select>
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
                      மாற்றுத்திறனாளி கொடுப்பனவுடன் அஸ்வெசும, சமூர்த்தி, சிறுநீரக நிவாரணம் போன்ற உதவிகளையும் பெறலாம்.
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

              {/* Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  பெயர் (Name in Tamil) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="முழுப் பெயர் தமிழில்"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* NIC with Auto-Parser */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  தேசிய அடையாள அட்டை இலக்கம் (NIC)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. 198421500321 அல்லது 842150321V"
                  value={formNic}
                  onChange={(e) => setFormNic(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                {nicParsed.isValid && (
                  <div className="mt-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 font-medium">
                    ✨ NIC தானியங்கி கணிப்பு: {nicParsed.gender === 'MALE' ? 'ஆண்' : 'பெண்'} · பிறந்த திகதி: {nicParsed.dob} · வயது: {nicParsed.age}
                  </div>
                )}
              </div>

              {/* Division */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  கிராம உத்தியோகத்தர் பிரிவு (GN Division) *
                </label>
                <select
                  value={formDivision}
                  onChange={(e) => handleDivisionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {divisions.filter((d) => d.code !== 'GENERAL').map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {d.nameTa} ({d.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              {/* Nature of Disability Dropdown */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  அங்கவீனத்தின் தன்மை (Nature of Disability) *
                </label>
                <select
                  value={formNature}
                  onChange={(e) => setFormNature(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {DISABILITY_NATURE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.labelTa}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cause of Disability Dropdown */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  உருவானது (Cause of Disability) *
                </label>
                <select
                  value={formCause}
                  onChange={(e) => setFormCause(e.target.value as DisabilityCause)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                >
                  {DISABILITY_CAUSE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.labelTa}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">முகவரி</label>
                  <input
                    type="text"
                    placeholder="வீதி, கிராமம்"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">தொலைபேசி எண்</label>
                  <input
                    type="text"
                    placeholder="077xxxxxxx"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">மேலதிக விபரங்கள் / குறிப்பு</label>
                <textarea
                  rows={2}
                  placeholder="சிகிச்சை, சக்கர நாற்காலி தேவை, கொடுப்பனவு விபரம்..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-xs"
                >
                  பதிவு செய்க
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dedicated Disability CSV Upload */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">மாற்றுத்திறனாளிகள் தனியான CSV பதிவேற்றம்</h3>
              </div>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-300 hover:text-white text-sm">✕</button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                மாற்றுத்திறனாளிகள் CSV பதிவேற்றம் செய்யும்போது பின்வரும் தலைப்புகள் காணப்பட வேண்டும்:
                <code className="block mt-1 font-mono text-[10px] bg-white p-1 rounded border border-blue-200">
                  QR_Code,Name_Ta,Name_En,NIC,Division_Code,Disability_Nature,Disability_Cause,Address,Phone,Notes
                </code>
              </div>

              {csvParseError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg font-semibold">
                  ⚠️ {csvParseError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">CSV கோப்பினை தெரிவு செய்க:</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        setCsvContent((evt.target?.result as string) || '');
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-bold hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">அல்லது CSV உள்ளடக்கத்தை பேஸ்ட் செய்யவும்:</label>
                <textarea
                  rows={5}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="QR_Code,Name_Ta,Name_En,NIC,..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleDownloadDisabilitySampleCsv}
                  className="text-blue-700 hover:underline flex items-center gap-1 text-[11px] font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>மாதிரி CSV படிவத்தை பதிவிறக்குக</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCsvModal(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleImportDisabilityCsv}
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold"
                  >
                    இப்போது பதிவேற்றுக
                  </button>
                </div>
              </div>
            </div>
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
