import React, { useState, useMemo } from 'react';
import {
  PregnantMotherRecord,
  MonthlyStampCollection,
  GNDivision,
  User,
  FamilyRelationship,
  WelfareScheme,
  FAMILY_RELATIONSHIP_OPTIONS,
  ALL_WELFARE_SCHEMES_LIST,
} from '../types';
import { Language, translations } from '../translations/i18n';
import { parseSriLankanNic } from '../utils/nicParser';
import {
  calculateTenMonthsDate,
  createDefaultMonthlyCollections,
  checkDuplicateActivePregnantMother,
  getPregnancyCountForNic,
  clearAllPregnantMothersPermanently,
  recordDeletedId,
  savePregnantMothers,
} from '../services/storage';
import { downloadCsvFile, escapeCsv, getRelationshipTamilLabel } from '../services/csv';
import {
  Baby,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  X,
  CreditCard,
  History,
  Phone,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface PregnantMothersViewProps {
  pregnantMothers: PregnantMotherRecord[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdatePregnantMothers: (records: PregnantMotherRecord[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const PregnantMothersView: React.FC<PregnantMothersViewProps> = ({
  pregnantMothers,
  divisions,
  currentUser,
  lang,
  onUpdatePregnantMothers,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Role separation
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const isGramaNiladhari = currentUser.role === 'GRAMANIILATHARI';
  const officerDivision = isGramaNiladhari ? currentUser.division || '211' : '';

  // Super Admin: Wipe all pregnant mother records
  const handleClearAllMothers = () => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'அனைத்து கர்ப்பிணித் தாய்மார் விபரங்களையும் அழிக்க சுப்பர் அட்மின் அனுமதி தேவை.' : 'Super Admin permission required to wipe pregnant mother records.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? 'எச்சரிக்கை: பதிவுசெய்யப்பட்ட அனைத்து கர்ப்பிணித் தாய்மார் விபரங்களையும் நிரந்தரமாக அழிக்க விரும்புகிறீர்களா? இந்நடவடிக்கையை மீளப்பெற முடியாது.'
        : 'WARNING: Are you sure you want to permanently delete all pregnant mother records?'
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

    pregnantMothers.forEach((m) => recordDeletedId(m.id, m.nic));
    clearAllPregnantMothersPermanently();
    onUpdatePregnantMothers([]);
    onAuditLog('CLEAR_ALL_PREGNANT_MOTHERS', `Super Admin ${currentUser.name} wiped all pregnant mother records.`);
    alert(lang === 'ta' ? 'அனைத்து கர்ப்பிணித் தாய்மார் விபரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன.' : 'All pregnant mother records have been wiped.');
  };

  // Delete single pregnant mother record
  const handleDeleteSingleMother = (m: PregnantMotherRecord) => {
    const confirmed = window.confirm(
      lang === 'ta'
        ? `${m.name} (${m.nic}) அவர்களின் விபரங்களை நிரந்தரமாக அழிக்க விரும்புகிறீர்களா?`
        : `Permanently delete pregnant mother record ${m.name} (${m.nic})?`
    );
    if (!confirmed) return;

    recordDeletedId(m.id, m.nic);
    const remaining = pregnantMothers.filter((item) => item.id !== m.id);
    savePregnantMothers(remaining);
    onUpdatePregnantMothers(remaining);
    onAuditLog('DELETE_PREGNANT_MOTHER', `Deleted pregnant mother ${m.name} (${m.nic})`);
  };

  // Working View Tabs: Waiting Queue, Active 10-Month Distribution, Completed Archive
  const [activeTab, setActiveTab] = useState<'WAITING' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>(isGramaNiladhari ? officerDivision : 'ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [assigningStampMother, setAssigningStampMother] = useState<PregnantMotherRecord | null>(null);
  const [stampInputNo, setStampInputNo] = useState('');
  const [stampInputDate, setStampInputDate] = useState(new Date().toISOString().slice(0, 10));
  const [stampInputValue, setStampInputValue] = useState(4500);

  // Month Checklist Modal for a specific Mother
  const [checklistMother, setChecklistMother] = useState<PregnantMotherRecord | null>(null);

  // Form State for New Pregnant Mother Registration (Requirements 01, 02, 03)
  const [formName, setFormName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formDivision, setFormDivision] = useState(isGramaNiladhari ? officerDivision : '211');
  const [formFamilyCode, setFormFamilyCode] = useState('FAM-211-101');
  const [formFamilyRelationship, setFormFamilyRelationship] = useState<FamilyRelationship>('MOTHER');
  const [formWelfareSchemes, setFormWelfareSchemes] = useState<WelfareScheme[]>(['PREGNANT_NUTRITION']);
  const [formPhone, setFormPhone] = useState('');
  const [formRegDate, setFormRegDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStampDate, setFormStampDate] = useState('');
  const [formStampNo, setFormStampNo] = useState('');
  const [formStampValue, setFormStampValue] = useState(4500);
  const [formPregnancyNumber, setFormPregnancyNumber] = useState(1);
  const [formNotes, setFormNotes] = useState('');

  // Auto-calculated expected completion date (10 months)
  const formExpectedCompletionDate = useMemo(() => {
    return calculateTenMonthsDate(formRegDate);
  }, [formRegDate]);

  // Duplicate Check in Form
  const duplicateActiveCheck = useMemo(() => {
    return checkDuplicateActivePregnantMother(formNic);
  }, [formNic, pregnantMothers]);

  // Parity / Pregnancy Count calculation
  const calculatedPregnancyCount = useMemo(() => {
    return getPregnancyCountForNic(formNic);
  }, [formNic, pregnantMothers]);

  // When NIC changes, update pregnancy number recommendation
  const handleNicInput = (nicVal: string) => {
    setFormNic(nicVal);
    const count = getPregnancyCountForNic(nicVal);
    setFormPregnancyNumber(count);
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
    const div = isGramaNiladhari ? officerDivision : '211';
    setFormName('');
    setFormNic('');
    setFormDivision(div);
    setFormFamilyCode(`FAM-${div}-${Math.floor(Math.random() * 800 + 100)}`);
    setFormFamilyRelationship('MOTHER');
    setFormWelfareSchemes(['PREGNANT_NUTRITION']);
    setFormPhone('');
    setFormRegDate(new Date().toISOString().slice(0, 10));
    setFormStampDate('');
    setFormStampNo('');
    setFormStampValue(4500);
    setFormPregnancyNumber(1);
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleSaveMother = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formNic.trim()) {
      alert(lang === 'ta' ? 'பெயர் மற்றும் தேசிய அடையாள அட்டை கட்டாயம் தேவை!' : 'Name and NIC are required!');
      return;
    }

    // Safety validation for active duplicate
    if (duplicateActiveCheck.isDuplicate) {
      const confirmSave = window.confirm(
        lang === 'ta'
          ? `⚠️ எச்சரிக்கை: இந்த தாய் (${formNic}) ஏற்கனவே ஒரு முத்திரை திட்டத்தில் உள்ளார். 10 மாதங்கள் முடியவில்லை. எனினும் புதிய பதிவாக தொடரவா?`
          : `Warning: This mother is currently in an active 10-month voucher cycle. Continue registration anyway?`
      );
      if (!confirmSave) return;
    }

    const cleanNic = formNic.trim().toUpperCase();
    const cleanStampNo = formStampNo.trim();
    const hasStamp = !!cleanStampNo;
    const initialStatus = hasStamp ? 'ACTIVE_COLLECTING' : 'WAITING_STAMP';
    const famCode = formFamilyCode.trim() || `FAM-${formDivision}-001`;

    const newRecord: PregnantMotherRecord = {
      id: `MAT-${formDivision}-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: formName.trim(),
      nic: cleanNic,
      divisionCode: formDivision,
      familyCode: famCode,
      familyRelationship: formFamilyRelationship,
      welfareSchemes: formWelfareSchemes,
      phone: formPhone.trim(),
      registrationDate: formRegDate,
      expectedCompletionDate: formExpectedCompletionDate,
      stampIssueDate: hasStamp ? (formStampDate || formRegDate) : undefined,
      stampNumber: cleanStampNo || undefined,
      stampValue: Number(formStampValue) || 4500,
      pregnancyNumber: Number(formPregnancyNumber) || 1,
      monthlyCollections: createDefaultMonthlyCollections(),
      isCompleted: false,
      status: initialStatus,
      notes: formNotes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newRecord, ...pregnantMothers];
    onUpdatePregnantMothers(updated);
    onAuditLog('REGISTER_PREGNANT_MOTHER', `Registered pregnant mother ${newRecord.name} (NIC: ${newRecord.nic}, Div: ${newRecord.divisionCode}, Family: ${famCode})`);

    setShowAddModal(false);
  };

  // Assign Stamp Number to Mother in Waiting Queue
  const handleOpenAssignStamp = (mother: PregnantMotherRecord) => {
    setAssigningStampMother(mother);
    setStampInputNo(mother.stampNumber || `STAMP-VHR-${Math.floor(Math.random() * 90000 + 10000)}`);
    setStampInputDate(new Date().toISOString().slice(0, 10));
    setStampInputValue(mother.stampValue || 4500);
  };

  const handleSaveAssignedStamp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningStampMother || !stampInputNo.trim()) return;

    const updated = pregnantMothers.map((m) => {
      if (m.id === assigningStampMother.id) {
        return {
          ...m,
          stampNumber: stampInputNo.trim(),
          stampIssueDate: stampInputDate,
          stampValue: Number(stampInputValue) || 4500,
          status: 'ACTIVE_COLLECTING' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    onUpdatePregnantMothers(updated);
    onAuditLog('ASSIGN_STAMP_NUMBER', `Assigned stamp #${stampInputNo} to mother ${assigningStampMother.name} (${assigningStampMother.nic})`);
    setAssigningStampMother(null);
  };

  // Toggle Month Collection in 10-Month Grid
  const handleToggleMonth = (motherId: string, monthIdx: number) => {
    const updated = pregnantMothers.map((m) => {
      if (m.id !== motherId) return m;

      const newCollections = m.monthlyCollections.map((col) => {
        if (col.monthIndex === monthIdx) {
          const nextCollected = !col.collected;
          return {
            ...col,
            collected: nextCollected,
            collectedDate: nextCollected ? new Date().toISOString().slice(0, 10) : undefined,
            collectedByOfficer: nextCollected ? currentUser.name : undefined,
          };
        }
        return col;
      });

      // Check if all 10 months are collected
      const allCollected = newCollections.every((c) => c.collected);
      const isNowCompleted = allCollected;

      const updatedMother: PregnantMotherRecord = {
        ...m,
        monthlyCollections: newCollections,
        isCompleted: isNowCompleted,
        status: isNowCompleted ? 'COMPLETED' : m.status === 'COMPLETED' ? 'ACTIVE_COLLECTING' : m.status,
        completedDate: isNowCompleted ? new Date().toISOString().slice(0, 10) : undefined,
        updatedAt: new Date().toISOString(),
      };

      if (checklistMother && checklistMother.id === motherId) {
        setChecklistMother(updatedMother);
      }

      return updatedMother;
    });

    onUpdatePregnantMothers(updated);
    onAuditLog('UPDATE_STAMP_COLLECTION', `Updated month ${monthIdx} collection for mother ID ${motherId}`);
  };

  // Manually Move to Completed
  const handleManualComplete = (mother: PregnantMotherRecord) => {
    const confirmDone = window.confirm(
      lang === 'ta'
        ? `இத்தாயின் 10 மாத முத்திரை விநியோகம் முடிவுற்றதாக அறிவிக்கவா?`
        : `Mark this mother's 10-month voucher cycle as completed?`
    );
    if (!confirmDone) return;

    const updated = pregnantMothers.map((m) => {
      if (m.id === mother.id) {
        return {
          ...m,
          isCompleted: true,
          status: 'COMPLETED' as const,
          completedDate: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    onUpdatePregnantMothers(updated);
    onAuditLog('COMPLETE_MATERNITY_RECORD', `Marked 10-month cycle completed for ${mother.name} (${mother.nic})`);
  };

  // Filtered dataset
  const filteredMothers = useMemo(() => {
    return pregnantMothers.filter((m) => {
      // 1. Division
      if (isGramaNiladhari && m.divisionCode !== officerDivision) return false;
      if (!isGramaNiladhari && selectedDivision !== 'ALL' && m.divisionCode !== selectedDivision) return false;

      // 2. Working View Tab
      if (activeTab === 'WAITING' && (m.status !== 'WAITING_STAMP' || m.isCompleted)) return false;
      if (activeTab === 'ACTIVE' && (m.status !== 'ACTIVE_COLLECTING' || m.isCompleted)) return false;
      if (activeTab === 'COMPLETED' && (!m.isCompleted && m.status !== 'COMPLETED')) return false;

      // 3. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNic = (m.nic || '').toLowerCase().includes(q);
        const matchesName = (m.name || '').toLowerCase().includes(q);
        const matchesPhone = (m.phone || '').toLowerCase().includes(q);
        const matchesStamp = (m.stampNumber || '').toLowerCase().includes(q);
        const matchesId = (m.id || '').toLowerCase().includes(q);
        return matchesNic || matchesName || matchesPhone || matchesStamp || matchesId;
      }

      return true;
    });
  }, [pregnantMothers, isGramaNiladhari, officerDivision, selectedDivision, activeTab, searchQuery]);

  // Overall counts for tabs
  const tabCounts = useMemo(() => {
    let waiting = 0;
    let active = 0;
    let completed = 0;

    pregnantMothers.forEach((m) => {
      if (isGramaNiladhari && m.divisionCode !== officerDivision) return;
      if (m.isCompleted || m.status === 'COMPLETED') {
        completed++;
      } else if (m.status === 'WAITING_STAMP' || !m.stampNumber) {
        waiting++;
      } else {
        active++;
      }
    });

    return { waiting, active, completed };
  }, [pregnantMothers, isGramaNiladhari, officerDivision]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Registration ID',
      'Name',
      'NIC',
      'GN Division',
      'Phone',
      'Registration Date',
      'Expected 10-Month Completion',
      'Stamp Number',
      'Stamp Issue Date',
      'Monthly Stamp Value (LKR)',
      'Pregnancy Number',
      'Months Collected (out of 10)',
      'Status',
      'Notes',
    ];

    const rows = filteredMothers.map((m) => {
      const collectedCount = m.monthlyCollections.filter((c) => c.collected).length;
      return [
        escapeCsv(m.id),
        escapeCsv(m.name),
        escapeCsv(m.nic),
        escapeCsv(m.divisionCode),
        escapeCsv(m.phone),
        escapeCsv(m.registrationDate),
        escapeCsv(m.expectedCompletionDate),
        escapeCsv(m.stampNumber || ''),
        escapeCsv(m.stampIssueDate || ''),
        escapeCsv(String(m.stampValue)),
        escapeCsv(String(m.pregnancyNumber)),
        escapeCsv(`${collectedCount} / 10`),
        escapeCsv(m.isCompleted ? 'COMPLETED' : m.status),
        escapeCsv(m.notes || ''),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    downloadCsvFile(csvContent, `Vaharai_Pregnant_Mothers_Stamps_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Official Top Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl text-pink-700">
            <Baby className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-300">
                {lang === 'ta' ? 'கர்ப்பிணித் தாய்மார் & ஊட்டச்சத்து பிரிவு' : 'Maternity & Nutrition Stamps'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentUser.role}
              </span>
            </div>
            <h1 className="text-lg font-black text-slate-900 mt-1">
              {lang === 'ta'
                ? 'கர்ப்பிணித் தாய்மார்கள் பதிவாளர் & முத்திரை விநியோகம்'
                : 'Pregnant Mothers Registrar & 10-Month Nutrition Stamp Portal'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'ta'
                ? '10 மாத கால போசணை முத்திரை ஒதுக்கீடு, மாதாந்த விநியோக கண்காணிப்பு மற்றும் பிரசவ தவணை மேலாண்மை'
                : '10-month nutritional food stamp vouchers, monthly tracking grid, parity counters, and waiting queue'}
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
            <span>{lang === 'ta' ? 'அறிக்கை அச்சிடுக' : 'Print Register'}</span>
          </button>
          {isSuperAdmin && pregnantMothers.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllMothers}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title={lang === 'ta' ? 'அனைத்து கர்ப்பிணித் தாய்மார் விபரங்களையும் நிரந்தரமாக அழி (Super Admin)' : 'Wipe all pregnant mother records'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'ta' ? 'அனைத்து தாய்மாரையும் அழி' : 'Clear All Mothers'}</span>
            </button>
          )}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-pink-700 hover:bg-pink-800 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? 'புதிய தாய் பதிவு' : 'Register Pregnant Mother'}</span>
          </button>
        </div>
      </div>

      {/* 3 Working View Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('WAITING')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'WAITING'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{lang === 'ta' ? 'முத்திரை ஒதுக்கீட்டு காத்திருப்பு வரிசை' : 'Waiting for Stamp Allocation'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-900 font-black">
            {tabCounts.waiting}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'border-pink-600 text-pink-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Baby className="w-4 h-4" />
          <span>{lang === 'ta' ? 'நடப்பு 10 மாத முத்திரை விநியோகம்' : 'Active 10-Month Distribution'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-pink-100 text-pink-900 font-black">
            {tabCounts.active}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`pb-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'COMPLETED'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{lang === 'ta' ? '10 மாதங்கள் நிறைவுற்ற பதிவுகள்' : 'Completed (10 Months Done)'}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-900 font-black">
            {tabCounts.completed}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={lang === 'ta' ? 'தேசிய அடையாள அட்டை, பெயர், முத்திரை இலக்கம் அல்லது தொலைபேசி...' : 'Search NIC, name, stamp # or phone...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4">தாய் பெயர் & NIC</th>
                <th className="py-3 px-4">பிரிவு & தொடர்பு</th>
                <th className="py-3 px-4">பதிவு & 10 மாத முடிவு</th>
                <th className="py-3 px-4">முத்திரை விபரம் (இலக்கம் & பெறுமதி)</th>
                <th className="py-3 px-4">குழந்தை தவணை</th>
                <th className="py-3 px-4">10 மாத பொருட்கள் பெறுதல் நிலை</th>
                <th className="py-3 px-4 text-right">செயல்கள்</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMothers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Baby className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">இப்பிரிவில் பதிவுகள் எதுவும் காணப்படவில்லை</p>
                    <p className="text-[11px] mt-1">புதிய கர்ப்பிணி தாயை பதிவு செய்ய மேல் உள்ள பொத்தானை அழுத்தவும்.</p>
                  </td>
                </tr>
              ) : (
                filteredMothers.map((m) => {
                  const collectedCount = m.monthlyCollections.filter((c) => c.collected).length;
                  const is10MonthsFull = collectedCount >= 10;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-pink-100 text-pink-900 border border-pink-200">
                            {getRelationshipTamilLabel(m.familyRelationship || 'MOTHER')}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] font-semibold text-emerald-900 mt-0.5">
                          {m.nic}
                        </div>
                        {m.familyCode && (
                          <div className="text-[10px] text-blue-800 font-mono font-bold mt-0.5">
                            QR அலகு: {m.familyCode}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {m.divisionCode} - {divisions.find((d) => d.code === m.divisionCode)?.nameTa || m.divisionCode}
                        </div>
                        {m.phone && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{m.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-700">
                          பதிவு: <span className="font-mono font-semibold">{m.registrationDate}</span>
                        </div>
                        <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
                          முடிவு: <span className="font-mono">{m.expectedCompletionDate}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {m.stampNumber ? (
                          <div>
                            <span className="px-2 py-0.5 rounded font-mono font-bold bg-pink-100 text-pink-900 border border-pink-200">
                              #{m.stampNumber}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1 font-semibold">
                              மதிப்பு: Rs. {m.stampValue.toLocaleString()} · வழங்கல்: {m.stampIssueDate || m.registrationDate}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            <span>காத்திருப்பு வரிசையில் (Pending)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                          {m.pregnancyNumber === 1
                            ? '01 வது குழந்தை'
                            : m.pregnancyNumber === 2
                            ? '02 வது குழந்தை'
                            : m.pregnancyNumber === 3
                            ? '03 வது குழந்தை'
                            : `${String(m.pregnancyNumber).padStart(2, '0')} வது குழந்தை`}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                is10MonthsFull ? 'bg-emerald-600' : 'bg-pink-600'
                              }`}
                              style={{ width: `${(collectedCount / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-slate-800">
                            {collectedCount}/10
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {is10MonthsFull ? 'அனைத்து 10 மாதங்களும் பெறப்பட்டது' : `${10 - collectedCount} மாதங்கள் மீதமுள்ளன`}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right space-x-1.5">
                        {!m.stampNumber && (
                          <button
                            onClick={() => handleOpenAssignStamp(m)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shadow-xs cursor-pointer"
                          >
                            முத்திரை ஒதுக்குக
                          </button>
                        )}
                        <button
                          onClick={() => setChecklistMother(m)}
                          className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 text-pink-900 rounded text-[11px] font-bold border border-pink-200 cursor-pointer"
                        >
                          10 மாத கட்டம்
                        </button>
                        {!m.isCompleted && is10MonthsFull && (
                          <button
                            onClick={() => handleManualComplete(m)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold cursor-pointer"
                          >
                            முடிவுக்கு நகர்த்துக
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSingleMother(m)}
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

      {/* Modal: Register New Pregnant Mother */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-pink-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'புதிய கர்ப்பிணித் தாய் பதிவு (New Pregnant Mother)' : 'Register Pregnant Mother'}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Duplicate Warning Alert */}
            {duplicateActiveCheck.isDuplicate && duplicateActiveCheck.existingRecord && (
              <div className="mt-3 p-3 bg-red-50 border-2 border-red-300 text-red-900 rounded-xl text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-800">
                  <ShieldAlert className="w-4 h-4" />
                  <span>தீவிர எச்சரிக்கை: இந்த தாய் ஏற்கனவே முத்திரை பெற்று வருகிறார்!</span>
                </div>
                <p className="text-[11px]">
                  முந்தைய பதிவு திகதி: <strong className="font-mono">{duplicateActiveCheck.existingRecord.registrationDate}</strong> · 
                  முடிவடையும் திகதி: <strong className="font-mono">{duplicateActiveCheck.existingRecord.expectedCompletionDate}</strong>
                </p>
                <p className="text-[11px] font-semibold text-red-700">
                  10 மாத கால அவகாசம் இன்னும் முடிவடையவில்லை! ஒரே தாய் இரட்டிப்பாக முத்திரை பெறுவது விதிமீறலாகும்.
                </p>
              </div>
            )}

            <form onSubmit={handleSaveMother} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    தாயின் முழுப் பெயர் (Mother's Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. கமலநாதன் சுகந்தி"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    தேசிய அடையாள அட்டை (NIC) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 965123456V அல்லது 199612345678"
                    value={formNic}
                    onChange={(e) => handleNicInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-pink-600 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              </div>

              {/* Requirement 03: Family QR Code & Relationship in Registration */}
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
                      ℹ️ குடும்பத்தின் பொதுவான கிவ் ஆர் இலக்கம். தாய், தந்தை, பிள்ளைகள் அனைவரும் இந்த ஒரே எண்ணையே பகிர்வர்.
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
                      இயல்புநிலை: 👩 தாய் (Mother)
                    </span>
                  </div>
                </div>
              </div>

              {/* Requirement 02: Multi-Welfare Aid Checklist (செக் லிஸ்ட்) */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>நலன்புரி உதவிகள் செக் லிஸ்ட் (Multi-Welfare Checklist):</span>
                    </label>
                    <span className="text-[10px] text-emerald-800 block">
                      ஒரு தாய் கர்ப்பிணி ஊட்டச்சத்து முத்திரையுடன் அஸ்வெசும, சமூர்த்தி போன்ற பிற உதவிகளையும் பெறலாம்.
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

              {/* 10-Month Timeline Box */}
              <div className="p-3.5 bg-pink-50/70 border border-pink-200 rounded-xl space-y-2">
                <div className="font-bold text-pink-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-pink-700" />
                  <span>10 மாத முத்திரை கால அவகாசம் (10-Month Validity Window)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      பதிவு செய்த திகதி (Registration Date)
                    </label>
                    <input
                      type="date"
                      value={formRegDate}
                      onChange={(e) => setFormRegDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      முடிவடையும் திகதி (10 மாதங்களின் பின்)
                    </label>
                    <input
                      type="date"
                      disabled
                      value={formExpectedCompletionDate}
                      className="w-full px-3 py-2 border border-pink-200 rounded-lg font-mono bg-pink-100/60 font-bold text-pink-900"
                    />
                  </div>
                </div>
              </div>

              {/* Parity Tracking: 01, 02, 03, 04 Child */}
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-purple-900">
                    குழந்தை தவணை / பிரசவ முறை (Parity):
                  </label>
                  <span className="text-[11px] text-purple-700 font-semibold">
                    கணினியால் கணிக்கப்பட்டது: {calculatedPregnancyCount} வது குழந்தை
                  </span>
                </div>
                <select
                  value={formPregnancyNumber}
                  onChange={(e) => setFormPregnancyNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
                >
                  <option value={1}>01 வது குழந்தை / முதல் பிரசவம் (1st Pregnancy)</option>
                  <option value={2}>02 வது குழந்தை / இரண்டாம் பிரசவம் (2nd Pregnancy)</option>
                  <option value={3}>03 வது குழந்தை / மூன்றாம் பிரசவம் (3rd Pregnancy)</option>
                  <option value={4}>04 வது குழந்தை / நான்காம் பிரசவம் (4th Pregnancy)</option>
                  <option value={5}>05 வது குழந்தை / அதற்கு மேற்பட்டவை (5th+ Pregnancy)</option>
                </select>
              </div>

              {/* Stamp Voucher Details (Optional initially) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                  <span>முத்திரை ஒதுக்கீடு (Stamp Voucher Assignment - விருப்பத்தெரிவு)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  இப்போதே முத்திரை இலக்கம் வழங்கப்பட்டால் உள்ளிடவும். இல்லையெனில் காத்திருப்பு வரிசையில் பாதுகாக்கப்பட்டு பின்னர் ஒதுக்கப்படும்.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">முத்திரை இலக்கம்</label>
                    <input
                      type="text"
                      placeholder="e.g. STAMP-8921"
                      value={formStampNo}
                      onChange={(e) => setFormStampNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">வழங்கிய திகதி</label>
                    <input
                      type="date"
                      value={formStampDate}
                      onChange={(e) => setFormStampDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">மாதாந்த பெறுமதி (LKR)</label>
                    <input
                      type="number"
                      value={formStampValue}
                      onChange={(e) => setFormStampValue(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  மேலதிக குறிப்புகள்
                </label>
                <textarea
                  rows={2}
                  placeholder="மருத்துவ ஆலோசனைகள், விசேட உணவுத் தேவைகள்..."
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
                  className="px-5 py-2 bg-pink-700 hover:bg-pink-800 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  பதிவு செய்க
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Stamp Number */}
      {assigningStampMother && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span>முத்திரை இலக்கம் ஒதுக்குதல் (Assign Stamp Number)</span>
            </h3>

            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
              <div className="font-bold text-amber-950">{assigningStampMother.name}</div>
              <div className="font-mono text-amber-800 mt-0.5">NIC: {assigningStampMother.nic}</div>
              <div className="text-[11px] text-amber-700 mt-0.5">
                பிரிவு: {assigningStampMother.divisionCode} · பதிவு: {assigningStampMother.registrationDate}
              </div>
            </div>

            <form onSubmit={handleSaveAssignedStamp} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  முத்திரை வரிசை இலக்கம் (Stamp Number) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STAMP-VHR-2026-081"
                  value={stampInputNo}
                  onChange={(e) => setStampInputNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  வழங்கப்பட்ட திகதி
                </label>
                <input
                  type="date"
                  value={stampInputDate}
                  onChange={(e) => setStampInputDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  முத்திரையின் பெறுமதி (LKR)
                </label>
                <input
                  type="number"
                  value={stampInputValue}
                  onChange={(e) => setStampInputValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningStampMother(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  முத்திரை ஒதுக்குக & ஆரம்பிக்க
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 10-Month Interactive Food Package Checklist */}
      {checklistMother && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Baby className="w-5 h-5 text-pink-700" />
                  <span>10 மாத போசணை முத்திரை பொருட்கள் விநியோக அட்டவணை</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {checklistMother.name} · NIC: <span className="font-mono font-semibold">{checklistMother.nic}</span> · முத்திரை: <span className="font-mono font-bold text-pink-700">#{checklistMother.stampNumber || 'Pending'}</span>
                </p>
              </div>
              <button onClick={() => setChecklistMother(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Progress Bar */}
              <div className="p-3 bg-pink-50 rounded-xl border border-pink-200">
                <div className="flex items-center justify-between text-xs font-bold text-pink-900 mb-1.5">
                  <span>முத்திரை பொருட்கள் பெற்றுக்கொண்ட முன்னேற்றம்</span>
                  <span className="font-mono text-sm">
                    {checklistMother.monthlyCollections.filter((c) => c.collected).length} / 10 மாதங்கள்
                  </span>
                </div>
                <div className="w-full bg-pink-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-pink-600 transition-all"
                    style={{
                      width: `${(checklistMother.monthlyCollections.filter((c) => c.collected).length / 10) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* 10 Monthly Checkboxes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {checklistMother.monthlyCollections.map((col) => {
                  return (
                    <button
                      key={col.monthIndex}
                      type="button"
                      onClick={() => handleToggleMonth(checklistMother.id, col.monthIndex)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        col.collected
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-xs">{col.monthLabelTa}</span>
                        {col.collected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0"></div>
                        )}
                      </div>
                      <div className="text-[10px] font-semibold mt-1">
                        {col.collected ? (
                          <span className="text-emerald-700 font-mono">
                            ✓ {col.collectedDate || 'பெறப்பட்டது'}
                          </span>
                        ) : (
                          <span className="text-slate-400">பெறப்படவில்லை</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* All 10 Months Collected Action Alert */}
              {checklistMother.monthlyCollections.every((c) => c.collected) && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block font-bold">10 மாதங்களும் வெற்றிகரமாக பொருட்கள் பெறப்பட்டு நிறைவுற்றது!</strong>
                      <span className="text-[11px] text-emerald-700">இப்பதிவு தானாக முடிவு பகுதிக்கு (Completed Archive) மாற்றப்பட்டுள்ளது.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setChecklistMother(null)}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
                  >
                    சரி
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setChecklistMother(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                மூடுக
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
