import React, { useState, useMemo } from 'react';
import { AssistanceRecord, Beneficiary, User, GNDivision, AidCategory, DuplicateAidCheckResult } from '../types';
import { Language, translations } from '../translations/i18n';
import {
  downloadCsvFile,
  generateAssistanceSampleCsv,
  generateFamiliesSampleCsv,
  parseAssistanceFromCsv,
  parseFamiliesFromCsv,
  exportAssistanceToCsv,
} from '../services/csv';
import {
  checkDuplicateAssistance,
  generateUniqueFamilyQrPayload,
  clearAllAssistanceRecords,
  clearAllAssistanceRecordsPermanently,
  recordDeletedId,
  saveAssistanceRecords,
} from '../services/storage';
import {
  Gift,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  ShieldAlert,
  Calendar,
  Users,
  Building,
  QrCode,
  FileText,
  Clock,
  ExternalLink,
  Trash2,
  Edit2,
} from 'lucide-react';

interface AssistanceDistributionViewProps {
  assistanceRecords: AssistanceRecord[];
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateAssistanceRecords: (records: AssistanceRecord[]) => void;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const AssistanceDistributionView: React.FC<AssistanceDistributionViewProps> = ({
  assistanceRecords,
  beneficiaries,
  divisions,
  currentUser,
  lang,
  onUpdateAssistanceRecords,
  onUpdateBeneficiaries,
  onAuditLog,
}) => {
  const t = translations[lang];
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';

  // Active sub-tab: 'distribute' (நேரடி உதவி வழங்கல்), 'csv-upload' (சிஎஸ்வி மாதிரி & பதிவேற்றம்), 'history' (முழு வரலாறு & தணிக்கை)
  const [activeTab, setActiveTab] = useState<'distribute' | 'csv-upload' | 'history'>('distribute');

  // Search & Verification for On-the-Spot Aid Form
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<{
    familyCode: string;
    members: Beneficiary[];
    head?: Beneficiary;
  } | null>(null);

  // Duplicate Check Result for selected family
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateAidCheckResult | null>(null);

  // New Assistance Form state
  const [aidCategory, setAidCategory] = useState<AidCategory>('DRY_RATIONS');
  const [aidDescription, setAidDescription] = useState('25kg உலர் உணவுப் பொதி (Dry Rations)');
  const [amountOrValue, setAmountOrValue] = useState('Rs. 7,500');
  const [donorOrOrg, setDonorOrOrg] = useState('பிரதேச செயலக அனர்த்த நிவாரணப் பிரிவு');
  const [distributedDate, setDistributedDate] = useState(new Date().toISOString().slice(0, 10));
  const [aidNotes, setAidNotes] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  // CSV Upload State
  const [csvMode, setCsvMode] = useState<'assistance' | 'families'>('assistance');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedValidAid, setParsedValidAid] = useState<AssistanceRecord[]>([]);
  const [parsedDuplicateAid, setParsedDuplicateAid] = useState<AssistanceRecord[]>([]);
  const [parsedFamilies, setParsedFamilies] = useState<Beneficiary[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState('');

  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [filterDivision, setFilterDivision] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Super Admin Edit & Delete State
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<AssistanceRecord | null>(null);

  const handleDeleteRecord = (recordId: string) => {
    if (!isSuperAdmin && currentUser?.role !== 'ADMIN 1' && currentUser?.role !== 'ADMIN 2') return;
    const confirmMsg = lang === 'ta'
      ? 'இந்த உதவிப் பதிவை நிச்சயமாக நிரந்தரமாக நீக்க வேண்டுமா?'
      : 'Are you sure you want to permanently delete this relief record?';
    if (!window.confirm(confirmMsg)) return;

    const rec = assistanceRecords.find((r) => r.id === recordId);
    if (rec) {
      recordDeletedId(rec.id, rec.beneficiaryNic);
    }
    const updated = assistanceRecords.filter((r) => r.id !== recordId);
    saveAssistanceRecords(updated);
    onUpdateAssistanceRecords(updated);
    onAuditLog('DELETE_ASSISTANCE_RECORD', `Deleted assistance record ${rec?.id} for family ${rec?.familyCode}`);
  };

  const handleClearAllRecords = () => {
    if (!isSuperAdmin) return;
    const confirmMsg = lang === 'ta'
      ? 'கவனம்: அனைத்து உதவி மற்றும் நிவாரண பதிவுகளும் நிரந்தரமாக அழிக்கப்படும். தொடரவா?'
      : 'Caution: All assistance records will be permanently erased. Proceed?';
    if (!window.confirm(confirmMsg)) return;

    const code = window.prompt(
      lang === 'ta'
        ? 'நிரந்தரமாக அழிக்க "DELETE" அல்லது "அழி" என தட்டச்சு செய்க:'
        : 'Type "DELETE" to confirm permanent deletion:'
    );
    if (code !== 'DELETE' && code !== 'அழி') {
      alert(lang === 'ta' ? 'உறுதிப்படுத்தல் சொல் பொருந்தவில்லை. நடவடிக்கை ரத்து செய்யப்பட்டது.' : 'Confirmation text did not match. Aborted.');
      return;
    }

    assistanceRecords.forEach((r) => recordDeletedId(r.id, r.beneficiaryNic));
    clearAllAssistanceRecordsPermanently();
    onUpdateAssistanceRecords([]);
    onAuditLog('CLEAR_ALL_ASSISTANCE', `Super Admin (${currentUser.name}) cleared all assistance records`);
    alert(lang === 'ta' ? 'அனைத்து உதவி பதிவுகளும் அழிக்கப்பட்டன.' : 'All assistance records have been cleared.');
  };

  const handleSaveEditedRecord = (edited: AssistanceRecord) => {
    const updated = assistanceRecords.map((r) => (r.id === edited.id ? edited : r));
    onUpdateAssistanceRecords(updated);
    onAuditLog('EDIT_ASSISTANCE_RECORD', `Super Admin edited assistance record ${edited.id} for family ${edited.familyCode}`);
    setSelectedRecordForEdit(null);
  };

  // Quick categories list
  const categoryOptions: { key: AidCategory; labelTa: string; labelEn: string; icon: string }[] = [
    { key: 'DRY_RATIONS', labelTa: 'உலர் உணவுப் பொதி', labelEn: 'Dry Rations Pack', icon: '🍚' },
    { key: 'CASH_GRANT', labelTa: 'பண உதவி / கொடுப்பனவு', labelEn: 'Cash Grant / Allowance', icon: '💵' },
    { key: 'AGRICULTURE_SEEDS', labelTa: 'விவசாய விதை / உரம்', labelEn: 'Seeds & Fertilizer', icon: '🌱' },
    { key: 'DISASTER_FLOOD', labelTa: 'வெள்ள / அனர்த்த நிவாரணம்', labelEn: 'Disaster / Flood Relief', icon: '🌊' },
    { key: 'HOUSING_REPAIR', labelTa: 'வீட்டு புனரமைப்பு உதவி', labelEn: 'Housing Repair Grant', icon: '🏠' },
    { key: 'MEDICAL_ASSISTANCE', labelTa: 'மருத்துவ சிகிச்சை உதவி', labelEn: 'Medical Treatment Aid', icon: '💊' },
    { key: 'EDUCATION_STATIONERY', labelTa: 'கல்வி கற்றல் உபகரணங்கள்', labelEn: 'School Stationery Pack', icon: '📚' },
    { key: 'LIVELIHOOD_TOOL', labelTa: 'வாழ்வாதார உபகரணங்கள்', labelEn: 'Livelihood Equipment', icon: '🛠️' },
    { key: 'OTHER', labelTa: 'ஏனைய விசேட உதவிகள்', labelEn: 'Other Relief / Assistance', icon: '📦' },
  ];

  // Auto-set description when category changes
  const handleCategoryChange = (cat: AidCategory) => {
    setAidCategory(cat);
    switch (cat) {
      case 'DRY_RATIONS':
        setAidDescription('25kg உலர் உணவுப் பொதி (Dry Rations Pack)');
        setAmountOrValue('Rs. 7,500');
        break;
      case 'CASH_GRANT':
        setAidDescription('வறுமை ஒழிப்பு மாதாந்த பண உதவி');
        setAmountOrValue('Rs. 5,000');
        break;
      case 'AGRICULTURE_SEEDS':
        setAidDescription('நெல் விதை மற்றும் சேதன பசளை பொதி');
        setAmountOrValue('50kg மூட்டை');
        break;
      case 'DISASTER_FLOOD':
        setAidDescription('வெள்ள அனர்த்த அவசர நிவாரணப் பொதி');
        setAmountOrValue('Rs. 10,000');
        break;
      case 'HOUSING_REPAIR':
        setAidDescription('வீட்டு கூரை தகரத் தகடுகள் மற்றும் சீமெந்து');
        setAmountOrValue('Rs. 50,000');
        break;
      case 'MEDICAL_ASSISTANCE':
        setAidDescription('நிரந்தர நோயாளர் விசேட மருந்து கொடுப்பனவு');
        setAmountOrValue('Rs. 10,000');
        break;
      case 'EDUCATION_STATIONERY':
        setAidDescription('மாணவர்களுக்கான கற்றல் அப்பியாச கொப்பிகள் & பை');
        setAmountOrValue('Rs. 4,500');
        break;
      case 'LIVELIHOOD_TOOL':
        setAidDescription('சுயதொழில் மின்சார தையல் இயந்திரம் / வலை உபகரணம்');
        setAmountOrValue('Rs. 45,000');
        break;
      default:
        setAidDescription('விசேட உதவித் திட்டம்');
        setAmountOrValue('வழங்கப்பட்டது');
        break;
    }

    // Re-check duplicate with updated category if family selected
    if (selectedFamily) {
      const check = checkDuplicateAssistance(
        selectedFamily.familyCode,
        selectedFamily.head?.nic,
        cat,
        assistanceRecords
      );
      setDuplicateCheck(check);
    }
  };

  // Search Family by Family Code, NIC, Barcode, or Name
  const handleSearchFamily = (query: string) => {
    setSearchQuery(query);
    const q = query.trim().toUpperCase();
    if (!q) {
      setSelectedFamily(null);
      setDuplicateCheck(null);
      return;
    }

    // Match familyCode directly, or search beneficiary by NIC / Name / QR
    let targetFamilyCode = '';
    const directFamilyMatch = beneficiaries.find(
      (b) => b.familyCode && b.familyCode.toUpperCase() === q
    );

    if (directFamilyMatch && directFamilyMatch.familyCode) {
      targetFamilyCode = directFamilyMatch.familyCode;
    } else {
      const citizenMatch = beneficiaries.find(
        (b) =>
          b.nic.toUpperCase() === q ||
          b.id.toUpperCase() === q ||
          b.barcode.toUpperCase() === q ||
          b.nameTa.toLowerCase().includes(query.toLowerCase()) ||
          b.nameEn.toLowerCase().includes(query.toLowerCase())
      );
      if (citizenMatch && citizenMatch.familyCode) {
        targetFamilyCode = citizenMatch.familyCode;
      }
    }

    if (targetFamilyCode) {
      const members = beneficiaries.filter(
        (b) => (b.familyCode || '').toUpperCase() === targetFamilyCode.toUpperCase()
      );
      const head = members.find((m) => m.familyHead || m.familyRelationship === 'HEAD') || members[0];
      setSelectedFamily({ familyCode: targetFamilyCode, members, head });

      // Run Duplicate Aid Check!
      const check = checkDuplicateAssistance(
        targetFamilyCode,
        head?.nic,
        aidCategory,
        assistanceRecords
      );
      setDuplicateCheck(check);
    } else {
      setSelectedFamily(null);
      setDuplicateCheck(null);
    }
  };

  // Commit on-the-spot single aid record
  const handleSaveAssistance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamily) {
      alert(lang === 'ta' ? 'முதலில் குடும்பத்தை தேடி தெரிவு செய்யவும்!' : 'Please search and select a family first!');
      return;
    }

    const head = selectedFamily.head || selectedFamily.members[0];
    const uniqueQr = head.familyQrPayload || generateUniqueFamilyQrPayload(selectedFamily.familyCode, head.divisionCode);
    const newId = `AID-${new Date().getFullYear()}-${String(assistanceRecords.length + 1).padStart(4, '0')}`;

    const newRecord: AssistanceRecord = {
      id: newId,
      familyCode: selectedFamily.familyCode,
      familyQrPayload: uniqueQr,
      beneficiaryNic: head.nic,
      beneficiaryName: head.nameTa || head.nameEn,
      divisionCode: head.divisionCode,
      householdNo: head.householdNo,
      aidCategory,
      aidDescription: aidDescription.trim(),
      amountOrValue: amountOrValue.trim(),
      donorOrOrganization: donorOrOrg.trim(),
      distributedDate,
      officerName: currentUser.name,
      officerId: currentUser.id,
      status: 'DISTRIBUTED',
      isDuplicate: duplicateCheck?.hasDuplicateRisk,
      notes: aidNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...assistanceRecords];
    onUpdateAssistanceRecords(updated);
    onAuditLog(
      'RECORD_ASSISTANCE',
      `Assistance [${aidDescription}] recorded for Family ${selectedFamily.familyCode} (${head.nameTa})`
    );

    setFormSuccessMessage(
      lang === 'ta'
        ? `✅ உதவி வெற்றிகரமாக பதிவு செய்யப்பட்டது! (இலக்கம்: ${newId})`
        : `✅ Assistance recorded successfully! (ID: ${newId})`
    );
    setTimeout(() => setFormSuccessMessage(''), 5000);

    // Refresh duplicate check after record
    const updatedCheck = checkDuplicateAssistance(
      selectedFamily.familyCode,
      head.nic,
      aidCategory,
      updated
    );
    setDuplicateCheck(updatedCheck);
  };

  // CSV Handlers
  const handleDownloadSampleCsv = (type: 'assistance' | 'families') => {
    if (type === 'assistance') {
      const csv = generateAssistanceSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_assistance_distribution_sample.csv');
    } else {
      const csv = generateFamiliesSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_families_registration_sample.csv');
    }
  };

  const handleExportAssistanceCsv = () => {
    const csv = exportAssistanceToCsv(assistanceRecords);
    const todayStr = new Date().toISOString().slice(0, 10);
    downloadCsvFile(csv, `vaharai_assistance_records_${todayStr}.csv`);
    onAuditLog('EXPORT_ASSISTANCE_CSV', `Exported ${assistanceRecords.length} relief records to CSV`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvRawText(text);

      if (csvMode === 'assistance') {
        const { validRecords, duplicateRecords, errors } = parseAssistanceFromCsv(
          text,
          assistanceRecords,
          beneficiaries
        );
        setParsedValidAid(validRecords);
        setParsedDuplicateAid(duplicateRecords);
        setCsvErrors(errors);
        setParsedFamilies([]);
      } else {
        const { items, errors } = parseFamiliesFromCsv(text, beneficiaries);
        setParsedFamilies(items);
        setCsvErrors(errors);
        setParsedValidAid([]);
        setParsedDuplicateAid([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 1. Commit ONLY Eligible / First-time Recipients (Strict Duplicate Prevention)
  const handleCommitEligibleOnly = () => {
    if (csvMode === 'assistance') {
      if (parsedValidAid.length === 0) return;
      const updated = [...parsedValidAid, ...assistanceRecords];
      onUpdateAssistanceRecords(updated);
      onAuditLog(
        'CSV_ASSISTANCE_IMPORT',
        `Imported ${parsedValidAid.length} eligible assistance records (filtered out ${parsedDuplicateAid.length} duplicate risks)`
      );
      setCsvSuccessMessage(
        lang === 'ta'
          ? `✅ ${parsedValidAid.length} தகுதியான குடும்பங்களுக்கு மட்டும் உதவி வெற்றிகரமாகப் பதிவேற்றப்பட்டது! (${parsedDuplicateAid.length} இரட்டை உதவிகள் தடுக்கப்பட்டன).`
          : `✅ Imported ${parsedValidAid.length} eligible assistance records! (${parsedDuplicateAid.length} duplicates prevented).`
      );
    } else {
      if (parsedFamilies.length === 0) return;
      const existingMap = new Map(beneficiaries.map((b) => [b.nic, b]));
      for (const item of parsedFamilies) {
        existingMap.set(item.nic, item);
      }
      const updated = Array.from(existingMap.values());
      onUpdateBeneficiaries(updated);
      onAuditLog('CSV_FAMILIES_IMPORT', `Imported ${parsedFamilies.length} families via CSV`);
      setCsvSuccessMessage(
        lang === 'ta'
          ? `✅ ${parsedFamilies.length} குடும்பங்கள் தனித்துவமான QR குறியீடுகளுடன் வெற்றிகரமாகப் பதிவு செய்யப்பட்டன!`
          : `✅ Registered ${parsedFamilies.length} families with unique Family QR codes!`
      );
    }

    setParsedValidAid([]);
    setParsedDuplicateAid([]);
    setParsedFamilies([]);
    setCsvRawText('');
    setCsvFileName('');
    setTimeout(() => setCsvSuccessMessage(''), 6000);
  };

  // 2. Force Upload All (with override audit log)
  const handleCommitAllForce = () => {
    if (csvMode === 'assistance') {
      const allToImport = [...parsedValidAid, ...parsedDuplicateAid];
      if (allToImport.length === 0) return;
      const updated = [...allToImport, ...assistanceRecords];
      onUpdateAssistanceRecords(updated);
      onAuditLog(
        'CSV_ASSISTANCE_FORCE_IMPORT',
        `Force imported ${allToImport.length} assistance records including ${parsedDuplicateAid.length} flagged duplicates`
      );
      setCsvSuccessMessage(
        lang === 'ta'
          ? `⚠️ எச்சரிக்கை குறிப்புடன் மொத்தம் ${allToImport.length} பதிவுகளும் பதிவேற்றப்பட்டன!`
          : `⚠️ Force imported all ${allToImport.length} records including duplicates with audit log!`
      );
    }
    setParsedValidAid([]);
    setParsedDuplicateAid([]);
    setCsvRawText('');
    setCsvFileName('');
    setTimeout(() => setCsvSuccessMessage(''), 6000);
  };

  // Filtered History Records
  const filteredHistory = useMemo(() => {
    return assistanceRecords.filter((rec) => {
      if (filterDivision !== 'ALL' && rec.divisionCode !== filterDivision) return false;
      if (filterCategory !== 'ALL' && rec.aidCategory !== filterCategory) return false;
      if (showDuplicatesOnly && !rec.isDuplicate) return false;

      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        const mFam = (rec.familyCode || '').toLowerCase().includes(q);
        const mNic = (rec.beneficiaryNic || '').toLowerCase().includes(q);
        const mName = (rec.beneficiaryName || '').toLowerCase().includes(q);
        const mDesc = (rec.aidDescription || '').toLowerCase().includes(q);
        const mOrg = (rec.donorOrOrganization || '').toLowerCase().includes(q);
        return mFam || mNic || mName || mDesc || mOrg;
      }
      return true;
    });
  }, [assistanceRecords, filterDivision, filterCategory, showDuplicatesOnly, historySearch]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 bg-rose-100 text-rose-800 rounded-xl text-xl shadow-xs">🎁</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === 'ta' ? 'உதவி வழங்கல் & இரட்டை உதவி தடுப்பு மேலாண்மை' : 'Relief Distribution & Duplicate Aid Prevention'}
            </h2>
            <span className="text-[11px] bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
              ANTI-DUPLICATION SYSTEM
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'ஒரே குடும்பத்திற்கே தொடர்ச்சியான உதவிகள் கிடைப்பதை தடுத்து, அனைத்து குடும்பங்களுக்கும் தனித்துவமான QR குறியீட்டின் கீழ் சமத்துவமாக உதவிகளை வழங்குதல்.'
              : 'Prevent duplicate continuous relief to the same family. Every family has a unique QR code with full assistance history.'}
          </p>
        </div>

        {/* Quick CSV Template Download & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDownloadSampleCsv('assistance')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="Download CSV Model for Aid Distribution"
          >
            <Download className="w-3.5 h-3.5 text-rose-600" />
            <span>{lang === 'ta' ? 'உதவி வழங்கல் மாதிரி CSV' : 'Aid Model CSV'}</span>
          </button>

          <button
            onClick={() => handleDownloadSampleCsv('families')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-semibold shadow-xs transition-colors"
            title="Download CSV Model for Family Registrations"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>{lang === 'ta' ? 'குடும்பப் பதிவு மாதிரி CSV' : 'Family Model CSV'}</span>
          </button>

          <button
            onClick={handleExportAssistanceCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'ta' ? 'அனைத்து உதவிகளையும் பதிவிறக்கு' : 'Export Relief CSV'}</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-2xs">
        <button
          onClick={() => setActiveTab('distribute')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'distribute'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>{lang === 'ta' ? '1. நேரடி உதவி வழங்கல் & குடும்ப QR சரிபார்ப்பு' : '1. On-the-spot Relief & QR Verification'}</span>
        </button>

        <button
          onClick={() => setActiveTab('csv-upload')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'csv-upload'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>{lang === 'ta' ? '2. சிஎஸ்வி மாதிரி & மொத்தப் பதிவேற்றம்' : '2. CSV Models & Bulk Upload'}</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'history'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{lang === 'ta' ? '3. உதவிப் பதிவுகள் & தணிக்கை' : '3. Relief History & Duplicate Audit'}</span>
          <span className="px-1.5 py-0.2 bg-rose-200 text-rose-900 rounded-full text-[10px] font-mono">
            {assistanceRecords.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: ON-THE-SPOT AID DISTRIBUTION WITH DUPLICATE CHECK ================= */}
      {activeTab === 'distribute' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Family Verification & Past History */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-rose-600" />
                  <span>{lang === 'ta' ? 'குடும்பத்தைத் தேடுக / QR ஐ ஸ்கேன் செய்க' : 'Search Family / Scan QR'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'ta'
                    ? 'குடும்பக் குறியீடு (FAM-211-042) அல்லது பிரஜையின் NIC / பெயர் உள்ளிடவும்:'
                    : 'Enter Family Code (e.g. FAM-211-042) or Citizen NIC / Name:'}
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchFamily(e.target.value)}
                  placeholder="e.g. FAM-211-042 or 198421500321"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleSearchFamily(searchQuery)}
                  className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800 transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'சரிபார்க்க' : 'Verify'}
                </button>
              </div>

              {/* Quick test buttons for known families */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                <span className="text-slate-400 font-medium">Quick Pick:</span>
                <button
                  type="button"
                  onClick={() => handleSearchFamily('FAM-211-042')}
                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-mono font-bold"
                >
                  FAM-211-042 (5 Members)
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchFamily('FAM-211-088')}
                  className="px-2 py-0.5 bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 rounded font-mono font-bold"
                >
                  FAM-211-088 (WHH)
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchFamily('FAM-212-019')}
                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded font-mono font-bold"
                >
                  FAM-212-019 (Elderly)
                </button>
              </div>
            </div>

            {/* Verification Result Card */}
            {selectedFamily && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        {lang === 'ta' ? 'உறுதிப்படுத்தப்பட்ட குடும்பம்' : 'Verified Family Profile'}
                      </span>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                        {selectedFamily.familyCode}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mt-1">
                      {selectedFamily.head?.nameTa}
                    </h4>
                    <div className="text-xs text-slate-600">
                      {selectedFamily.head?.nameEn} · NIC: <span className="font-mono">{selectedFamily.head?.nic}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full font-bold block">
                      {selectedFamily.members.length} {lang === 'ta' ? 'உறுப்பினர்கள்' : 'Members'}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                      பிரிவு / Div: {selectedFamily.head?.divisionCode}
                    </span>
                  </div>
                </div>

                {/* Single Family Master QR Code Display */}
                <div className="p-3 bg-gradient-to-r from-amber-50 to-emerald-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <div className="font-bold text-amber-950">
                        {lang === 'ta' ? 'தனித்துவமான குடும்ப QR குறியீடு' : 'Strictly Unique Family Master QR'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-600 truncate max-w-[220px]">
                        {selectedFamily.head?.familyQrPayload || `VHR-FAMILY|FAM:${selectedFamily.familyCode}`}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded">
                    1 FAMILY = 1 QR
                  </span>
                </div>

                {/* DUPLICATE AID DETECTION ALERT BANNER */}
                {duplicateCheck && (
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      duplicateCheck.severity === 'CRITICAL'
                        ? 'bg-red-50 border-red-300 text-red-950'
                        : duplicateCheck.severity === 'WARNING'
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {duplicateCheck.severity === 'CRITICAL' && (
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      {duplicateCheck.severity === 'WARNING' && (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      {duplicateCheck.severity === 'SAFE' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      )}

                      <div className="space-y-1">
                        <div className="font-bold text-xs">
                          {duplicateCheck.severity === 'CRITICAL'
                            ? lang === 'ta'
                              ? '⚠️ கடுமையான எச்சரிக்கை: தொடர்ச்சியான இரட்டை உதவி பெறல்!'
                              : '⚠️ CRITICAL: Duplicate Continuous Relief Detected!'
                            : duplicateCheck.severity === 'WARNING'
                            ? lang === 'ta'
                              ? 'கவனிக்க: சமீபத்தில் உதவி பெற்ற குடும்பம்'
                              : 'Notice: Family Received Relief Recently'
                            : lang === 'ta'
                            ? '🟢 புதிய உதவிக்கு தகுதியானது'
                            : '🟢 Eligible for New Relief'}
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          {lang === 'ta' ? duplicateCheck.warningMessageTa : duplicateCheck.warningMessageEn}
                        </p>
                      </div>
                    </div>

                    {/* Past assistances timeline */}
                    {duplicateCheck.previousRecords.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-current/15 space-y-1.5 text-[11px]">
                        <span className="font-bold block text-[10px] uppercase tracking-wider">
                          {lang === 'ta' ? 'கடந்த கால உதவிகள் (Past Aid Received):' : 'Past Assistance History:'}
                        </span>
                        {duplicateCheck.previousRecords.slice(0, 3).map((past) => (
                          <div key={past.id} className="flex items-center justify-between bg-white/70 p-1.5 rounded text-[10px]">
                            <div>
                              <span className="font-bold">{past.aidDescription}</span> ({past.amountOrValue})
                              <div className="text-[9px] text-slate-500 font-mono">
                                திகதி: {past.distributedDate} · அலுவலர்: {past.officerName}
                              </div>
                            </div>
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 font-mono rounded text-[9px] shrink-0">
                              {past.donorOrOrganization}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Register New Relief Distribution Form */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-rose-600" />
                    <span>{lang === 'ta' ? 'புதிய உதவி வழங்கல் பதிவு' : 'Record New Relief Distribution'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ta'
                      ? 'உதவி வழங்கிய திகதி, வகை, பெறுமதி மற்றும் வழங்குபவர் விபரங்களை உள்ளிடவும்.'
                      : 'Record aid category, items/amount, organization and distribution date.'}
                  </p>
                </div>

                {selectedFamily && (
                  <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-mono font-bold">
                    {selectedFamily.familyCode}
                  </span>
                )}
              </div>

              {formSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{formSuccessMessage}</span>
                </div>
              )}

              {!selectedFamily ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                  <span className="text-3xl block">🔍</span>
                  <div className="text-sm font-bold text-slate-700">
                    {lang === 'ta' ? 'முதலில் இடதுபுறத்தில் குடும்பத்தைத் தேடவும்' : 'Please search or select a family on the left'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {lang === 'ta'
                      ? 'குடும்பக் குறியீட்டை உள்ளிட்டவுடன், இரட்டை உதவி சரிபார்ப்பு உடனடியாக இயங்கி எச்சரிக்கும்.'
                      : 'Once a family code is entered, the anti-duplication check runs automatically.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSaveAssistance} className="space-y-4 text-xs">
                  {/* Category Selector Buttons */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-2">
                      {lang === 'ta' ? 'உதவி வகை (Aid Category):' : 'Aid Category:'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categoryOptions.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleCategoryChange(opt.key)}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                            aidCategory === opt.key
                              ? 'bg-rose-50 border-rose-600 text-rose-950 font-bold ring-1 ring-rose-400 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-base">{opt.icon}</span>
                          <span className="truncate">{lang === 'ta' ? opt.labelTa : opt.labelEn}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {lang === 'ta' ? 'உதவி விளக்கம் (Description):' : 'Aid Description:'}
                      </label>
                      <input
                        type="text"
                        value={aidDescription}
                        onChange={(e) => setAidDescription(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {lang === 'ta' ? 'அளவு / பெறுமதி (Amount or Items):' : 'Amount / Value / Items:'}
                      </label>
                      <input
                        type="text"
                        value={amountOrValue}
                        onChange={(e) => setAmountOrValue(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {lang === 'ta' ? 'வழங்கும் நிறுவனம் / நிதி (Donor / Organization):' : 'Donor / Project Fund:'}
                      </label>
                      <input
                        type="text"
                        value={donorOrOrg}
                        onChange={(e) => setDonorOrOrg(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {lang === 'ta' ? 'வழங்கிய திகதி (Distribution Date):' : 'Distribution Date:'}
                      </label>
                      <input
                        type="date"
                        value={distributedDate}
                        onChange={(e) => setDistributedDate(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {lang === 'ta' ? 'குறிப்புகள் / காரண விளக்கம் (Notes):' : 'Notes / Remarks:'}
                    </label>
                    <textarea
                      value={aidNotes}
                      onChange={(e) => setAidNotes(e.target.value)}
                      rows={2}
                      placeholder={lang === 'ta' ? 'விசேட தேவைகள் அல்லது இரட்டை உதவிக்கான விதிவிலக்குக் குறிப்பு...' : 'Special notes or exception justification...'}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 text-xs"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    {duplicateCheck?.hasDuplicateRisk && (
                      <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{lang === 'ta' ? 'இரட்டை உதவி எச்சரிக்கை செயலில் உள்ளது' : 'Duplicate Alert Active'}</span>
                      </span>
                    )}

                    <button
                      type="submit"
                      className="ml-auto px-6 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs transition-colors text-xs flex items-center gap-2"
                    >
                      <span>💾</span>
                      <span>
                        {duplicateCheck?.hasDuplicateRisk
                          ? lang === 'ta'
                            ? 'விதிவிலக்காக உதவியைப் பதிவு செய் (Override & Save)'
                            : 'Override & Save Aid'
                          : lang === 'ta'
                          ? 'உதவி வழங்கலை சேமி (Save Aid Record)'
                          : 'Save Aid Record'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CSV MODELS & BULK UPLOAD WITH ANTI-DUPLICATION ================= */}
      {activeTab === 'csv-upload' && (
        <div className="space-y-6">
          {/* Sub-mode selector */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCsvMode('assistance');
                setParsedValidAid([]);
                setParsedDuplicateAid([]);
                setParsedFamilies([]);
                setCsvRawText('');
                setCsvFileName('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                csvMode === 'assistance'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              🎁 {lang === 'ta' ? 'உதவி வழங்கல் பதிவு CSV (Aid Distribution CSV)' : 'Aid Distribution CSV'}
            </button>

            <button
              onClick={() => {
                setCsvMode('families');
                setParsedValidAid([]);
                setParsedDuplicateAid([]);
                setParsedFamilies([]);
                setCsvRawText('');
                setCsvFileName('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                csvMode === 'families'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              👨‍👩‍👧‍👦 {lang === 'ta' ? 'புதிய குடும்பப் பதிவு CSV (Family Registration CSV)' : 'Family Registration CSV'}
            </button>
          </div>

          {/* Model Download & Instruction Guide Card */}
          <div className="bg-gradient-to-r from-rose-50 via-amber-50 to-blue-50 p-5 rounded-2xl border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-rose-700" />
                <span>
                  {csvMode === 'assistance'
                    ? lang === 'ta'
                      ? 'உதவி வழங்கல் சிஎஸ்வி மாதிரி (Assistance Distribution CSV Model)'
                      : 'Relief / Assistance Distribution CSV Model'
                    : lang === 'ta'
                    ? 'குடும்பப் பதிவு சிஎஸ்வி மாதிரி (Family Registration CSV Model)'
                    : 'Family Registration CSV Model'}
                </span>
              </h3>
              <p className="text-xs text-slate-600">
                {csvMode === 'assistance'
                  ? lang === 'ta'
                    ? 'முதலில் மாதிரியைத் தரவிறக்கம் செய்து நிரப்பி அப்லோட் செய்க. ஒரே குடும்பத்திற்கே தொடர்ச்சியான உதவிகள் கிடைப்பதை இந்த முறைமை தானாகக் கண்டறிந்து தடுக்கும்.'
                    : 'Download the sample template, populate your distribution records, and upload. The system automatically detects and prevents duplicate continuous relief.'
                  : lang === 'ta'
                  ? 'குடும்பப் பதிவு மாதிரியைத் தரவிறக்கம் செய்து குடும்பத் தலைவர், உறுப்பினர் எண்ணிக்கை மற்றும் விபரங்களை உள்ளிட்டு அப்லோட் செய்க. ஒவ்வொரு குடும்பத்திற்கும் தனித்துவமான QR தானாக உருவாகும்.'
                  : 'Download family model, enter family head and household members. A unique Family QR code is automatically generated for every family.'}
              </p>
            </div>

            <button
              onClick={() => handleDownloadSampleCsv(csvMode)}
              className="px-4 py-2 bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 shrink-0 transition-colors"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>{lang === 'ta' ? 'மாதிரி கோப்பை தரவிறக்கு (Download Model)' : 'Download Model Template'}</span>
            </button>
          </div>

          {/* File Upload Drop Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              {lang === 'ta' ? 'நிரப்பப்பட்ட CSV கோப்பைத் தேர்ந்தெடுக்கவும் (Choose CSV File):' : 'Select completed CSV file:'}
            </label>

            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
              />
              {csvFileName && (
                <span className="text-xs text-slate-500 font-mono">
                  {csvFileName}
                </span>
              )}
            </div>

            {csvErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl space-y-1">
                <div className="font-bold">⚠️ {lang === 'ta' ? 'கோப்புப் பிழைகள்:' : 'CSV Errors:'}</div>
                {csvErrors.map((err, idx) => (
                  <div key={idx} className="text-[11px]">• {err}</div>
                ))}
              </div>
            )}

            {csvSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>{csvSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* CSV PREVIEW: ASSISTANCE DISTRIBUTION (WITH DUPLICATE HIGHLIGHTING) */}
          {csvMode === 'assistance' && (parsedValidAid.length > 0 || parsedDuplicateAid.length > 0) && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="font-bold text-slate-900">
                    {lang === 'ta' ? 'பகுப்பாய்வு முடிவு:' : 'Analysis Summary:'}
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full font-bold">
                    🟢 {parsedValidAid.length} {lang === 'ta' ? 'தகுதியான புதிய உதவிகள்' : 'Eligible First-Time Aid'}
                  </span>
                  {parsedDuplicateAid.length > 0 && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-full font-bold">
                      ⚠️ {parsedDuplicateAid.length} {lang === 'ta' ? 'இரட்டை உதவி எச்சரிக்கை!' : 'Duplicate Aid Detected!'}
                    </span>
                  )}
                </div>

                {/* Import Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleCommitEligibleOnly}
                    disabled={parsedValidAid.length === 0}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    title="Filters out duplicates and imports only families with no recent aid"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {lang === 'ta'
                        ? '✅ இரட்டை உதவிகளைத் தடுத்து தகுதியானவர்களை மட்டும் பதிவேற்று'
                        : 'Filter Duplicates & Import Eligible Only'}
                    </span>
                  </button>

                  {parsedDuplicateAid.length > 0 && (
                    <button
                      onClick={handleCommitAllForce}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors"
                      title="Force import all rows with an audit override log"
                    >
                      {lang === 'ta' ? 'விதிவிலக்காக அனைத்தையும் பதிவேற்று' : 'Force Import All (Override)'}
                    </button>
                  )}
                </div>
              </div>

              {/* DUPLICATE WARNINGS SECTION */}
              {parsedDuplicateAid.length > 0 && (
                <div className="bg-red-50/70 border border-red-300 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-950">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>
                      {lang === 'ta'
                        ? `⚠️ எச்சரிக்கை: பின்வரும் ${parsedDuplicateAid.length} குடும்பங்களுக்கு ஏற்கனவே சமீபத்தில் உதவி வழங்கப்பட்டுள்ளது (தொடர் உதவி தடுப்பு)!`
                        : `⚠️ Warning: The following ${parsedDuplicateAid.length} families have already received relief recently (Duplication Alert)!`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-red-200 shadow-2xs">
                      <thead className="bg-red-100 text-red-950 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">குடும்ப இலக்கம்</th>
                          <th className="p-2.5">பெயர் & NIC</th>
                          <th className="p-2.5">கோரப்பட்ட உதவி</th>
                          <th className="p-2.5">காரணம் / கடந்த கால உதவி விபரம்</th>
                          <th className="p-2.5">நிலை</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {parsedDuplicateAid.map((rec) => (
                          <tr key={rec.id} className="hover:bg-red-50/40">
                            <td className="p-2.5 font-mono font-bold text-red-950">{rec.familyCode}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">{rec.beneficiaryName}</div>
                              <div className="font-mono text-[10px] text-slate-500">{rec.beneficiaryNic}</div>
                            </td>
                            <td className="p-2.5 font-semibold text-slate-800">{rec.aidDescription} ({rec.amountOrValue})</td>
                            <td className="p-2.5 text-[11px] text-red-800 font-medium">
                              {rec.duplicateWarningReason || 'இக்குடும்பம் ஏற்கனவே உதவி பெற்றுள்ளது.'}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-red-200 text-red-900 font-bold text-[10px] rounded-full">
                                BLOCKED / DUPLICATE
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ELIGIBLE FIRST-TIME AID SECTION */}
              {parsedValidAid.length > 0 && (
                <div className="bg-white border border-emerald-300 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {lang === 'ta'
                        ? `🟢 தகுதியான புதிய உதவிகள் (${parsedValidAid.length} குடும்பங்கள்):`
                        : `🟢 Eligible First-Time Recipients (${parsedValidAid.length} families):`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <thead className="bg-emerald-50 text-emerald-950 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">குடும்ப இலக்கம்</th>
                          <th className="p-2.5">பயனாளி பெயர்</th>
                          <th className="p-2.5">உதவி வகை & விபரம்</th>
                          <th className="p-2.5">பெறுமதி / அளவு</th>
                          <th className="p-2.5">வழங்கும் நிறுவனம்</th>
                          <th className="p-2.5">திகதி</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedValidAid.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-emerald-900">{rec.familyCode}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">{rec.beneficiaryName}</div>
                              <div className="font-mono text-[10px] text-slate-500">{rec.beneficiaryNic}</div>
                            </td>
                            <td className="p-2.5 font-medium text-slate-800">{rec.aidDescription}</td>
                            <td className="p-2.5 font-mono font-bold text-slate-800">{rec.amountOrValue}</td>
                            <td className="p-2.5 text-slate-600">{rec.donorOrOrganization}</td>
                            <td className="p-2.5 font-mono text-slate-600">{rec.distributedDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CSV PREVIEW: FAMILIES REGISTRATION */}
          {csvMode === 'families' && parsedFamilies.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <span className="font-bold text-slate-900 text-xs">
                    {lang === 'ta' ? `பதிவேற்றத்திற்கு தயாராக உள்ள குடும்பங்கள்: ${parsedFamilies.length}` : `Families Ready for Registration: ${parsedFamilies.length}`}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    {lang === 'ta' ? 'அனைத்து குடும்பங்களுக்கும் தனித்துவமான Family Master QR தானாக இணைக்கப்பட்டுள்ளது.' : 'Each family is assigned a unique Family Master QR code.'}
                  </div>
                </div>

                <button
                  onClick={handleCommitEligibleOnly}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {lang === 'ta' ? '✅ குடும்பங்களை தரவுத்தளத்தில் இணை' : 'Commit Families to Database'}
                </button>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">குடும்ப குறியீடு</th>
                      <th className="p-3">பிரிவு</th>
                      <th className="p-3">குடும்பத் தலைவர்</th>
                      <th className="p-3">அடையாள அட்டை (NIC)</th>
                      <th className="p-3">தனித்துவமான குடும்ப QR</th>
                      <th className="p-3">விசேட பிரிவுகள்</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedFamilies.map((fam) => (
                      <tr key={fam.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-amber-900">{fam.familyCode}</td>
                        <td className="p-3 font-medium">{fam.divisionCode}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{fam.nameTa}</div>
                          <div className="text-[10px] text-slate-500">{fam.nameEn}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">{fam.nic}</td>
                        <td className="p-3">
                          <span className="text-[10px] bg-amber-50 text-amber-950 border border-amber-300 px-2 py-0.5 rounded font-mono truncate max-w-[180px] block">
                            {fam.familyQrPayload}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {fam.isWomanHeadedHousehold && (
                              <span className="px-1.5 py-0.2 bg-pink-100 text-pink-800 rounded text-[9px] font-bold">
                                பெண்தலைமை
                              </span>
                            )}
                            {fam.isSamurdhiBeneficiary && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                                சமுர்த்தி
                              </span>
                            )}
                            {fam.isPregnantMother && (
                              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[9px] font-bold">
                                கர்ப்பிணி
                              </span>
                            )}
                            {fam.isPersonWithDisability && (
                              <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[9px] font-bold">
                                மாற்றுத்திறனாளி
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: COMPLETE ASSISTANCE HISTORY & DUPLICATE AUDIT ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar & Super Admin Master Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800 text-xs">
                {lang === 'ta' ? `முழு உதவிப் பதிவுகள் வரலாறு (${filteredHistory.length})` : `Assistance Records History (${filteredHistory.length})`}
              </span>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleClearAllRecords}
                  disabled={assistanceRecords.length === 0}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'அனைத்து உதவி பதிவுகளையும் அழி (Super Admin)' : 'Clear All Relief Records (Super Admin)'}</span>
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-1">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder={lang === 'ta' ? 'குடும்பக் குறியீடு, NIC, பெயர், உதவி விபரம் தேடுக...' : 'Search by Family, NIC, Name, Aid description...'}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterDivision}
                  onChange={(e) => setFilterDivision(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="ALL">{lang === 'ta' ? 'அனைத்துப் பிரிவுகள் (All Divisions)' : 'All Divisions'}</option>
                  {divisions.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.code} - {lang === 'ta' ? d.nameTa : d.nameEn}
                    </option>
                  ))}
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="ALL">{lang === 'ta' ? 'அனைத்து உதவிகள் (All Aid)' : 'All Aid Categories'}</option>
                  {categoryOptions.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.icon} {lang === 'ta' ? c.labelTa : c.labelEn}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    showDuplicatesOnly
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'இரட்டை உதவிகள் மட்டும்' : 'Duplicates Only'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">பதிவு எண்</th>
                  <th className="p-3">குடும்ப இலக்கம் & QR</th>
                  <th className="p-3">பயனாளி (NIC)</th>
                  <th className="p-3">பிரிவு</th>
                  <th className="p-3">உதவி விபரம் & வகை</th>
                  <th className="p-3">பெறுமதி</th>
                  <th className="p-3">வழங்கும் நிறுவனம்</th>
                  <th className="p-3">திகதி</th>
                  <th className="p-3">அலுவலர்</th>
                  <th className="p-3">நிலை</th>
                  <th className="p-3 text-right">நடவடிக்கை</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      {lang === 'ta' ? 'உதவிப் பதிவுகள் எதுவும் கிடைக்கவில்லை.' : 'No assistance records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((rec) => (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-50 ${rec.isDuplicate ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-800">{rec.id}</td>
                      <td className="p-3">
                        <span className="font-mono font-bold text-amber-900 block">
                          {rec.familyCode}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 truncate max-w-[140px] block">
                          {rec.familyQrPayload}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{rec.beneficiaryName}</div>
                        <div className="font-mono text-[10px] text-slate-500">{rec.beneficiaryNic}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{rec.divisionCode}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{rec.aidDescription}</div>
                        <span className="text-[10px] text-rose-700 font-mono bg-rose-50 px-1.5 py-0.2 rounded">
                          {rec.aidCategory}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">{rec.amountOrValue}</td>
                      <td className="p-3 text-slate-600">{rec.donorOrOrganization}</td>
                      <td className="p-3 font-mono text-slate-600">{rec.distributedDate}</td>
                      <td className="p-3 text-slate-700 font-medium">{rec.officerName}</td>
                      <td className="p-3">
                        {rec.isDuplicate ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-[9px] rounded-full border border-red-200">
                            ⚠️ DUPLICATE RISK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded-full">
                            DISTRIBUTED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForEdit(rec)}
                              className="p-1.5 text-blue-700 hover:bg-blue-50 border border-blue-200 rounded text-xs font-bold transition-colors"
                              title={lang === 'ta' ? 'உதவிப் பதிவை திருத்து (Super Admin)' : 'Edit Record (Super Admin)'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(isSuperAdmin || currentUser?.role === 'ADMIN 1' || currentUser?.role === 'ADMIN 2') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(rec.id)}
                              className="p-1.5 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded text-xs font-bold transition-colors"
                              title={lang === 'ta' ? 'உதவிப் பதிவை நீக்கு' : 'Delete Record'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Super Admin Edit Assistance Record Modal */}
      {selectedRecordForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">✏️</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'உதவிப் பதிவை திருத்து (Super Admin Master Authority)' : 'Edit Relief Record (Super Admin Master Authority)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecordForEdit(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">பதிவு இலக்கம் (Record ID)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedRecordForEdit.id}
                    className="w-full px-3 py-1.5 bg-slate-100 font-mono text-slate-600 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">குடும்பக் குறியீடு (Family Code)</label>
                  <input
                    type="text"
                    value={selectedRecordForEdit.familyCode}
                    onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, familyCode: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono font-bold text-amber-900 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">பயனாளி பெயர்</label>
                  <input
                    type="text"
                    value={selectedRecordForEdit.beneficiaryName}
                    onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, beneficiaryName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">அடையாள அட்டை (NIC)</label>
                  <input
                    type="text"
                    value={selectedRecordForEdit.beneficiaryNic}
                    onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, beneficiaryNic: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">உதவி வகை (Aid Category)</label>
                  <select
                    value={selectedRecordForEdit.aidCategory}
                    onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, aidCategory: e.target.value as AidCategory })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.key} value={c.key}>{c.icon} {c.labelTa}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">பிரிவு (Division)</label>
                  <select
                    value={selectedRecordForEdit.divisionCode}
                    onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, divisionCode: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>{d.code} - {d.nameTa}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">உதவி விபரம் (Aid Description)</label>
                <input
                  type="text"
                  value={selectedRecordForEdit.aidDescription}
                  onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, aidDescription: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">பெறுமதி / அளவு (Amount/Value)</label>
                  <input
                    type="text"
                    value={selectedRecordForEdit.amountOrValue}
                    onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, amountOrValue: e.target.value })}
                    className="w-full px-3 py-1.5 font-bold rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">வழங்கிய திகதி (Date)</label>
                  <input
                    type="date"
                    value={selectedRecordForEdit.distributedDate}
                    onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, distributedDate: e.target.value })}
                    className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">வழங்கும் நிறுவனம் (Donor / Agency)</label>
                <input
                  type="text"
                  value={selectedRecordForEdit.donorOrOrganization}
                  onChange={(e) => setSelectedRecordForEdit({ ...selectedRecordForEdit, donorOrOrganization: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteRecord(selectedRecordForEdit.id);
                    setSelectedRecordForEdit(null);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 inline mr-1" />
                  <span>{lang === 'ta' ? 'பதிவை நீக்கு' : 'Delete'}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRecordForEdit(null)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEditedRecord(selectedRecordForEdit)}
                    className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    {t.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
