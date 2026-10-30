import React, { useState, useMemo } from 'react';
import {
  HouseholdData,
  HouseholdCommonAssets,
  Beneficiary,
  GNDivision,
  User,
  PovertyScoringWeights,
  DEFAULT_POVERTY_WEIGHTS,
  calculateFamilyPovertyScore,
  AssistanceRecord,
  FamilyRelationship,
} from '../types';
import { Language, translations } from '../translations/i18n';
import {
  Users,
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Award,
  ChevronRight,
  Printer,
  Building,
  Home,
  Droplets,
  Zap,
  DollarSign,
  Heart,
  Settings,
  RefreshCw,
  QrCode,
  FileSpreadsheet,
  CheckCircle2,
  Phone,
  CreditCard,
  History,
  Trash2,
  Edit,
} from 'lucide-react';
import {
  generateUniqueFamilyCode,
  generateUniqueFamilyQrPayload,
  generateProvisionalNic,
  clearAllHouseholdsPermanently,
  recordDeletedId,
  saveHouseholds,
} from '../services/storage';
import { generateQrDataUrl } from '../utils/barcode';

interface FamilyDataCenterViewProps {
  households: HouseholdData[];
  beneficiaries: Beneficiary[];
  assistanceRecords?: AssistanceRecord[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  povertyWeights: PovertyScoringWeights;
  onUpdateHouseholds: (items: HouseholdData[]) => void;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onUpdatePovertyWeights: (weights: PovertyScoringWeights) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const FamilyDataCenterView: React.FC<FamilyDataCenterViewProps> = ({
  households,
  beneficiaries,
  assistanceRecords = [],
  divisions,
  currentUser,
  lang,
  povertyWeights,
  onUpdateHouseholds,
  onUpdateBeneficiaries,
  onUpdatePovertyWeights,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Role permissions
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const canEdit = isSuperAdmin || currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2' || currentUser.role === 'GRAMANIILATHARI';

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Pagination State (Requirement 03)
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals
  const [viewingHousehold, setViewingHousehold] = useState<HouseholdData | null>(null);
  const [familyQrDataUrl, setFamilyQrDataUrl] = useState<string>('');
  const [activeDossierTab, setActiveDossierTab] = useState<'profile' | 'household_data' | 'score_breakdown' | 'aid_history'>('profile');

  // Add Family Wizard Modal
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Super Admin Scoring Formula Configuration Modal (Requirement 08)
  const [isConfigWeightsOpen, setIsConfigWeightsOpen] = useState(false);
  const [tempWeights, setTempWeights] = useState<PovertyScoringWeights>(povertyWeights);

  // Wizard State
  const [newHouseholdMeta, setNewHouseholdMeta] = useState<{
    familyCode: string;
    householdReference: string;
    applicationReference: string;
    applicantNameTa: string;
    applicantNameEn: string;
    applicantNic: string;
    phone: string;
    address: string;
    divisionCode: string;
    status: 'DS_ENDORSED' | 'COMMITTEE_APPROVED' | 'ACTIVE';
    selectedCategory: 'VULNERABLE' | 'EXTREME_POOR' | 'POOR' | 'TRANSITIONAL' | 'NON_VULNERABLE';
    bankName: string;
    bankBranch: string;
    bankAccountNo: string;
  }>({
    familyCode: 'FAM-211-101',
    householdReference: 'HH-5-1-03-01-010-00101',
    applicationReference: `2026${Math.floor(Math.random() * 9000000 + 1000000)}`,
    applicantNameTa: '',
    applicantNameEn: '',
    applicantNic: '',
    phone: '',
    address: '',
    divisionCode: '211',
    status: 'DS_ENDORSED',
    selectedCategory: 'VULNERABLE',
    bankName: 'Peoples Bank',
    bankBranch: 'Valaichchenai',
    bankAccountNo: '',
  });

  const [newCommonAssets, setNewCommonAssets] = useState<HouseholdCommonAssets>({
    ownsLand: false,
    landExtent: 'NONE',
    ownsOtherLand: false,
    otherLandExtent: 'NONE',
    vehicleType: 'NONE',
    machineryType: 'NONE',
    livestockType: 'NONE',
    livestockCount: 0,
    expenses: {
      food: 15000,
      water: 500,
      clothing: 1500,
      medical: 2000,
      rent: 0,
      transport: 1000,
      electricity: 800,
      fuelGas: 1500,
      telecom: 800,
      education: 1000,
      religiousLeisure: 500,
      loansDebt: 2000,
      total: 26600,
    },
    income: {
      unstableSources: 10000,
      salary: 0,
      business: 0,
      agriculture: 3000,
      rent: 0,
      pension: 0,
      samurdhi: 2500,
      elderlyAid: 0,
      disabilityAid: 0,
      ckdAid: 0,
      foreignRemittance: 0,
      localRemittance: 0,
      otherGovAid: 0,
      other: 0,
      total: 15500,
    },
    electricityUnitsKwh: 25,
    unitType: 'SINGLE_1_STORY',
    floorMaterial: 'CLAY',
    roofMaterial: 'THATCH_PALM',
    wallMaterial: 'CLAY_MUD',
    houseArea: 'LESS_THAN_500_SQFT',
    ownsCurrentHouse: false,
    ownsOtherHouse: false,
    lightingSource: 'KEROSENE',
    waterSource: 'UNPROTECTED_WELL',
    toiletLocation: 'OPEN_DEFECATION',
    toiletNature: 'NO_TOILET',
    isSingleParent: false,
  });

  const [newMembersList, setNewMembersList] = useState<Array<{
    nameTa: string;
    nameEn: string;
    nic: string;
    rel: FamilyRelationship;
    gender: 'MALE' | 'FEMALE';
    dob: string;
    phone: string;
    isDisability: boolean;
    isElderly: boolean;
    isPregnant: boolean;
    chronicIllness: string;
    economicActivity: string;
    educationLevel: string;
  }>>([
    {
      nameTa: '',
      nameEn: '',
      nic: '',
      rel: 'HEAD',
      gender: 'MALE',
      dob: '1985-01-01',
      phone: '',
      isDisability: false,
      isElderly: false,
      isPregnant: false,
      chronicIllness: 'NONE',
      economicActivity: 'கூலி வேலை (Daily Wage Labor)',
      educationLevel: 'தரம் 8 (Grade 8)',
    },
  ]);

  // Filtered dataset
  const filteredHouseholds = useMemo(() => {
    return households.filter((h) => {
      if (selectedDivision !== 'ALL' && h.divisionCode !== selectedDivision) return false;
      if (selectedPriority !== 'ALL' && String(h.priorityRank) !== selectedPriority) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = h.familyCode?.toLowerCase().includes(q);
        const matchRef = h.householdReference?.toLowerCase().includes(q);
        const matchApp = h.applicationReference?.toLowerCase().includes(q);
        const matchNameTa = h.applicantNameTa?.toLowerCase().includes(q);
        const matchNameEn = h.applicantNameEn?.toLowerCase().includes(q);
        const matchNic = h.applicantNic?.toLowerCase().includes(q);
        const matchPhone = h.phone?.includes(q);
        return matchCode || matchRef || matchApp || matchNameTa || matchNameEn || matchNic || matchPhone;
      }
      return true;
    });
  }, [households, selectedDivision, selectedPriority, searchQuery]);

  // Paginated dataset (Requirement 03)
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredHouseholds.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedHouseholds = useMemo(() => {
    if (pageSize === 'ALL') return filteredHouseholds;
    const start = (effectivePage - 1) * pageSize;
    return filteredHouseholds.slice(start, start + pageSize);
  }, [filteredHouseholds, effectivePage, pageSize]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = households.length;
    const p1Count = households.filter((h) => h.priorityRank === 1).length;
    const p2Count = households.filter((h) => h.priorityRank === 2).length;
    const p3Count = households.filter((h) => h.priorityRank === 3).length;
    const p4Count = households.filter((h) => h.priorityRank === 4).length;
    return { total, p1Count, p2Count, p3Count, p4Count };
  }, [households]);

  // Open Family Dossier (Matching Image 1 / image_0a3d5e1b.png)
  const handleOpenDossier = async (h: HouseholdData) => {
    setViewingHousehold(h);
    setActiveDossierTab('profile');
    try {
      const url = await generateQrDataUrl(h.familyQrPayload);
      setFamilyQrDataUrl(url);
    } catch {
      setFamilyQrDataUrl('');
    }
  };

  // Super Admin: Permanently wipe all family records
  const handleClearAllFamilies = () => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'அனைத்து குடும்பங்களையும் அழிக்க சுப்பர் அட்மின் அனுமதி தேவை.' : 'Super Admin permission required to wipe all family records.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? 'எச்சரிக்கை: பதிவுசெய்யப்பட்ட அனைத்து குடும்ப விபரங்களையும் நிரந்தரமாக அழிக்க விரும்புகிறீர்களா? இந்நடவடிக்கையை மீளப்பெற முடியாது.'
        : 'WARNING: Are you sure you want to permanently wipe all family records? This cannot be undone.'
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

    clearAllHouseholdsPermanently();
    onUpdateHouseholds([]);
    if (viewingHousehold) setViewingHousehold(null);
    onAuditLog('CLEAR_ALL_HOUSEHOLDS', `Super Admin ${currentUser.name} wiped all family records.`);
    alert(lang === 'ta' ? 'அனைத்து குடும்ப விபரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன.' : 'All family records have been wiped.');
  };

  // Delete a single household
  const handleDeleteHousehold = (h: HouseholdData) => {
    if (!canEdit) {
      alert(lang === 'ta' ? 'குடும்பத்தை அழிக்க அனுமதி இல்லை.' : 'Permission denied to delete family.');
      return;
    }
    const confirmed = window.confirm(
      lang === 'ta'
        ? `${h.familyCode} (${h.applicantNameTa}) குடும்ப விபரங்களை நிரந்தரமாக அழிக்க விரும்புகிறீர்களா?`
        : `Are you sure you want to delete family ${h.familyCode} (${h.applicantNameEn || h.applicantNameTa})?`
    );
    if (!confirmed) return;

    recordDeletedId(h.id, h.applicantNic);
    const updated = households.filter((item) => item.id !== h.id);
    saveHouseholds(updated);
    onUpdateHouseholds(updated);
    if (viewingHousehold?.id === h.id) setViewingHousehold(null);
    onAuditLog('DELETE_HOUSEHOLD', `Deleted household ${h.familyCode} (ID: ${h.id})`);
  };

  // Add member row in wizard
  const handleAddMemberRow = () => {
    setNewMembersList([
      ...newMembersList,
      {
        nameTa: '',
        nameEn: '',
        nic: '',
        rel: 'SON',
        gender: 'MALE',
        dob: '2010-01-01',
        phone: '',
        isDisability: false,
        isElderly: false,
        isPregnant: false,
        chronicIllness: 'NONE',
        economicActivity: 'மாணவர் (Student)',
        educationLevel: 'தரம் 10 (Grade 10)',
      },
    ]);
  };

  // Remove member row
  const handleRemoveMemberRow = (idx: number) => {
    if (newMembersList.length <= 1) return;
    setNewMembersList(newMembersList.filter((_, i) => i !== idx));
  };

  // Wizard Open
  const handleOpenAddFamilyWizard = () => {
    const targetDiv = '211';
    const famCode = generateUniqueFamilyCode(targetDiv, households.length + 1);
    setNewHouseholdMeta({
      familyCode: famCode,
      householdReference: `HH-5-1-03-01-010-${String(households.length + 1).padStart(5, '0')}`,
      applicationReference: `2026${Math.floor(Math.random() * 9000000 + 1000000)}`,
      applicantNameTa: '',
      applicantNameEn: '',
      applicantNic: '',
      phone: '',
      address: '',
      divisionCode: targetDiv,
      status: 'DS_ENDORSED',
      selectedCategory: 'VULNERABLE',
      bankName: 'Peoples Bank',
      bankBranch: 'Valaichchenai',
      bankAccountNo: '',
    });
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  // Commit New Family
  const handleCommitFamilyWizard = () => {
    if (!newHouseholdMeta.applicantNic || !newHouseholdMeta.applicantNameTa) {
      alert(lang === 'ta' ? 'தயவுசெய்து குடும்பத் தலைவரின் NIC மற்றும் பெயரை உள்ளிடவும்.' : 'Please enter Applicant NIC and Name.');
      return;
    }

    const familyCode = newHouseholdMeta.familyCode.trim().toUpperCase();
    const divisionCode = newHouseholdMeta.divisionCode;
    const familyQrPayload = generateUniqueFamilyQrPayload(familyCode, divisionCode);

    // Build temporary beneficiaries for the members to calculate 100-point score
    const createdBeneficiaries: Beneficiary[] = newMembersList.map((m, idx) => {
      let memberNic = m.nic.trim();
      let isProvisional = false;
      if (!memberNic) {
        memberNic = generateProvisionalNic(divisionCode);
        isProvisional = true;
      }
      return {
        id: `VHR-${divisionCode}-2026-${String(beneficiaries.length + idx + 1).padStart(4, '0')}`,
        nic: memberNic,
        isProvisionalNic: isProvisional,
        nameTa: m.nameTa.trim() || newHouseholdMeta.applicantNameTa,
        nameEn: m.nameEn.trim() || newHouseholdMeta.applicantNameEn || m.nameTa.trim(),
        gender: m.gender,
        dob: m.dob,
        phone: m.phone.trim() || newHouseholdMeta.phone,
        address: newHouseholdMeta.address || `வாகரை (${divisionCode})`,
        divisionCode,
        familyHead: idx === 0,
        householdNo: newHouseholdMeta.householdReference,
        familyCode,
        familyRelationship: m.rel,
        welfareScheme: 'ASWESUMA_EXTREME',
        welfareStatus: 'ACTIVE',
        chronicIllness: (m.chronicIllness as any) || 'NONE',
        isPersonWithDisability: m.isDisability,
        isElderly: m.isElderly,
        isPregnantMother: m.isPregnant,
        barcode: memberNic,
        qrPayload: `ID:VHR-${divisionCode}|NIC:${memberNic}|FAM:${familyCode}|REL:${m.rel}`,
        familyQrPayload,
        notes: `குடும்ப உறுப்பினர் (${m.rel}) - ${m.economicActivity}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Calculate 100-point score
    const scoreResult = calculateFamilyPovertyScore(newCommonAssets, createdBeneficiaries, povertyWeights);

    const newHousehold: HouseholdData = {
      id: newHouseholdMeta.householdReference,
      familyCode,
      householdReference: newHouseholdMeta.householdReference,
      applicationReference: newHouseholdMeta.applicationReference,
      applicantNameTa: newHouseholdMeta.applicantNameTa.trim(),
      applicantNameEn: newHouseholdMeta.applicantNameEn.trim() || newHouseholdMeta.applicantNameTa.trim(),
      applicantNic: newHouseholdMeta.applicantNic.trim(),
      phone: newHouseholdMeta.phone.trim(),
      address: newHouseholdMeta.address.trim(),
      divisionCode,
      status: newHouseholdMeta.status,
      selectedCategory: newHouseholdMeta.selectedCategory,
      bankDetails: {
        bankName: newHouseholdMeta.bankName,
        branch: newHouseholdMeta.bankBranch,
        accountNumber: newHouseholdMeta.bankAccountNo,
        accountName: `${newHouseholdMeta.applicantNameEn || newHouseholdMeta.applicantNameTa} ${newHouseholdMeta.applicantNic}`,
        status: 'VERIFIED',
      },
      commonAssets: newCommonAssets,
      totalMembersCount: createdBeneficiaries.length,
      familyQrPayload,
      score100: scoreResult.score100,
      priorityRank: scoreResult.priorityRank,
      scoreBreakdown: scoreResult.breakdown,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save household & citizens
    onUpdateHouseholds([newHousehold, ...households]);
    onUpdateBeneficiaries([...createdBeneficiaries, ...beneficiaries]);
    onAuditLog(
      'REGISTER_FAMILY_UNIT',
      `Registered new family ${familyCode} with ${createdBeneficiaries.length} members. 100-Point Score: ${scoreResult.score100} (Priority ${scoreResult.priorityRank})`
    );

    setIsWizardOpen(false);
  };

  // Save Super Admin Scoring Weights
  const handleSaveScoringWeights = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePovertyWeights(tempWeights);
    onAuditLog(
      'CONFIG_POVERTY_WEIGHTS',
      `Super Admin (${currentUser.name}) updated poverty scoring criteria weights and recalculated all households`
    );
    setIsConfigWeightsOpen(false);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl text-xl shadow-xs">👨‍👩‍👧‍👦</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {t.familyCenterTitle}
              </h2>
              <span className="text-[11px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 rounded font-mono">
                100-Point Poverty Assessment & Priority Allocation Engine
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.familyCenterSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin && (
            <button
              onClick={() => {
                setTempWeights(povertyWeights);
                setIsConfigWeightsOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Super Admin: Edit scoring weights and formula"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.configureScoringWeights}</span>
            </button>
          )}

          {isSuperAdmin && households.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllFamilies}
              className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title={lang === 'ta' ? 'அனைத்து குடும்பங்களையும் நிரந்தரமாக அழி (Super Admin)' : 'Wipe all family records (Super Admin)'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>{lang === 'ta' ? 'அனைத்து குடும்பங்களையும் அழி' : 'Clear All Families'}</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleOpenAddFamilyWizard}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNewFamily}</span>
            </button>
          )}
        </div>
      </div>

      {/* Priority Stat Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 border border-slate-200 rounded-xl shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">
            {lang === 'ta' ? 'பதிவான குடும்பங்கள்' : 'Total Families'}
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-white p-3.5 border border-red-200 rounded-xl shadow-2xs bg-red-50/25">
          <div className="text-[10px] uppercase font-bold text-red-800 font-mono flex items-center gap-1">
            <span>🔴 முன்னுரிமை 1 (80-100)</span>
          </div>
          <div className="text-xl font-extrabold text-red-950 mt-1">{stats.p1Count}</div>
          <div className="text-[10px] text-red-700 font-bold">தீவிர வறுமை / அவசரம்</div>
        </div>

        <div className="bg-white p-3.5 border border-amber-200 rounded-xl shadow-2xs bg-amber-50/25">
          <div className="text-[10px] uppercase font-bold text-amber-800 font-mono flex items-center gap-1">
            <span>🟠 முன்னுரிமை 2 (60-79)</span>
          </div>
          <div className="text-xl font-extrabold text-amber-950 mt-1">{stats.p2Count}</div>
          <div className="text-[10px] text-amber-700 font-bold">விளிம்புநிலை வறுமை</div>
        </div>

        <div className="bg-white p-3.5 border border-yellow-200 rounded-xl shadow-2xs bg-yellow-50/25">
          <div className="text-[10px] uppercase font-bold text-yellow-800 font-mono flex items-center gap-1">
            <span>🟡 முன்னுரிமை 3 (40-59)</span>
          </div>
          <div className="text-xl font-extrabold text-yellow-950 mt-1">{stats.p3Count}</div>
          <div className="text-[10px] text-yellow-700 font-bold">இடைக்கால உதவி நிலை</div>
        </div>

        <div className="bg-white p-3.5 border border-emerald-200 rounded-xl shadow-2xs bg-emerald-50/25 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-emerald-800 font-mono flex items-center gap-1">
            <span>🟢 முன்னுரிமை 4 (&lt;40)</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-950 mt-1">{stats.p4Count}</div>
          <div className="text-[10px] text-emerald-700 font-bold">தன்னிறைவு பெற்றவை</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={lang === 'ta' ? 'குடும்ப QR, குறிப்பு எண், குடும்பத் தலைவர் NIC, பெயர், தொலைபேசி...' : 'Search Family Code, HH Ref, Head NIC, Name, Phone...'}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
            />
          </div>

          {/* Division Filter */}
          <div>
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="ALL">🗺️ {t.allDivisions}</option>
              {divisions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} - {d.nameTa}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Ranking Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => {
                setSelectedPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-slate-800"
            >
              <option value="ALL">🎯 {t.priorityRank}: {t.allDivisions}</option>
              <option value="1">🔴 முன்னுரிமை 1: தீவிர வறுமை (80-100 pts)</option>
              <option value="2">🟠 முன்னுரிமை 2: வறுமை நிலை (60-79 pts)</option>
              <option value="3">🟡 முன்னுரிமை 3: இடைக்கால நிலை (40-59 pts)</option>
              <option value="4">🟢 முன்னுரிமை 4: தன்னிறைவு (&lt;40 pts)</option>
            </select>
          </div>
        </div>

        {/* Second Row: Page Size Selector */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
          <span className="text-slate-500 font-medium">
            {lang === 'ta' ? '100 புள்ளிகள் அடிப்படையில் கணிக்கப்பட்ட அதிகாரப்பூர்வ வறுமை அட்டவணை' : 'Official multi-dimensional poverty registry based on 100-point scale'}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {t.perPage}:
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="ALL">{t.allRecords}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Household Cards / Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 uppercase tracking-wider font-mono">
              {filteredHouseholds.length} {lang === 'ta' ? 'குடும்பங்கள்' : 'Families'}
            </span>
            {pageSize !== 'ALL' && (
              <span className="text-[11px] text-slate-500">
                ({t.showingRecords} {Math.min(filteredHouseholds.length, (effectivePage - 1) * pageSize + 1)} - {Math.min(filteredHouseholds.length, effectivePage * pageSize)} {t.ofTotal} {filteredHouseholds.length})
              </span>
            )}
          </div>
          <span className="text-slate-500 text-[11px]">
            {lang === 'ta' ? 'அனைத்து உறுப்பினர்களும் ஒரே QR குறியீட்டின் கீழ் இணைக்கப்பட்டுள்ளனர்' : 'All members unified under one Master QR code'}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {paginatedHouseholds.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {t.noData}
            </div>
          ) : (
            paginatedHouseholds.map((h) => {
              const members = beneficiaries.filter((b) => b.familyCode === h.familyCode);
              return (
                <div
                  key={h.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Household & Head Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-sm text-emerald-950 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                        {h.familyCode}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {h.householdReference}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        {h.divisionCode} - {divisions.find((d) => d.code === h.divisionCode)?.nameTa || h.divisionCode}
                      </span>
                      {h.commonAssets.isSingleParent && (
                        <span className="text-[10px] bg-pink-100 text-pink-900 border border-pink-200 px-2 py-0.5 rounded-full font-bold">
                          👩‍👧 ஒற்றைப் பெற்றோர் (Single Parent)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="font-bold text-slate-900 text-sm">
                        {h.applicantNameTa} <span className="text-xs text-slate-500 font-normal">({h.applicantNameEn})</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-slate-700">
                        NIC: {h.applicantNic}
                      </div>
                      {h.phone && (
                        <div className="text-xs text-slate-600 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{h.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Living Conditions Tags */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Home className="w-3 h-3 text-slate-500" />
                        <span>கூரை: {h.commonAssets.roofMaterial === 'THATCH_PALM' ? 'ஓலை/வைக்கோல்' : h.commonAssets.roofMaterial}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        <span>நீர்: {h.commonAssets.waterSource === 'UNPROTECTED_WELL' ? 'பாதுகாப்பற்ற கிணறு' : h.commonAssets.waterSource}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <span>உறுப்பினர்கள்: <b>{members.length || h.totalMembersCount} பேர்</b></span>
                      </span>
                    </div>
                  </div>

                  {/* Right: 100-Point Score & Actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Score Gauge */}
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {h.score100}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">/100</span>
                      </div>
                      <div className="mt-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          h.priorityRank === 1
                            ? 'bg-red-100 text-red-900 border-red-300'
                            : h.priorityRank === 2
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : h.priorityRank === 3
                            ? 'bg-yellow-100 text-yellow-900 border-yellow-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {h.priorityRank === 1
                            ? 'முன்னுரிமை 1: தீவிர வறுமை'
                            : h.priorityRank === 2
                            ? 'முன்னுரிமை 2: வறுமை'
                            : h.priorityRank === 3
                            ? 'முன்னுரிமை 3: இடைக்காலம்'
                            : 'முன்னுரிமை 4: தன்னிறைவு'}
                        </span>
                      </div>
                    </div>

                    {/* View Dossier Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDossier(h)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <span>அரசு ஆவணம்</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDeleteHousehold(h)}
                        className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-colors"
                        title={lang === 'ta' ? 'இக்குடும்ப விபரத்தை நிரந்தரமாக அழி' : 'Delete household permanently'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls (Requirement 03) */}
        {pageSize !== 'ALL' && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="text-slate-600 font-medium">
              {t.showingRecords} {Math.min(filteredHouseholds.length, (effectivePage - 1) * pageSize + 1)} - {Math.min(filteredHouseholds.length, effectivePage * pageSize)} {t.ofTotal} {filteredHouseholds.length}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={effectivePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold"
              >
                ← {t.prevPage}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 2)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        effectivePage === p
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                type="button"
                disabled={effectivePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-bold"
              >
                {t.nextPage} →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Official Government Dossier Modal (Exact Layout from Image 1 / image_0a3d5e1b.png) */}
      {viewingHousehold && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Top Bar matching iWMS System Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-800 text-white rounded-lg text-sm font-bold font-mono">iWMS</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {lang === 'ta' ? 'அஸ்வெசும & குடும்ப விபரக் குறிப்பு (iWMS System Household Dossier)' : 'iWMS System - Official Household Dossier'}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    iwms.wbb.gov.lk/household/search | DS Vaharai
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t.print}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingHousehold(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Action Navigation Tabs (Matching top right buttons of image_0a3d5e1b.png) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'profile', label: 'Household Overview (பிரதான விபரம்)' },
                { id: 'household_data', label: 'Household data (சொத்துக்கள் & செலவுகள்) >' },
                { id: 'score_breakdown', label: `Criteria score (${viewingHousehold.score100} Pts) >` },
                { id: 'aid_history', label: 'Payment / Aid details >' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDossierTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    activeDossierTab === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Profile & Members (Exact layout of Image 1) */}
            {activeDossierTab === 'profile' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left Column: Official Administrative Details Table */}
                  <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left divide-y divide-slate-200">
                      <tbody className="divide-y divide-slate-100">
                        <tr className="bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-500 w-44">Administrative Area</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            Batticaloa / Koralai Pattu North / {divisions.find((d) => d.code === viewingHousehold.divisionCode)?.nameEn || viewingHousehold.divisionCode}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-500 font-mono">Household reference</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-950 text-sm">
                            {viewingHousehold.householdReference}
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-500 font-mono">Application reference</td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">
                            {viewingHousehold.applicationReference} <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">Cycle 2</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-500">Applicant name</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {viewingHousehold.applicantNameEn} <span className="text-slate-500">({viewingHousehold.applicantNameTa})</span>
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-500">Contact number</td>
                          <td className="py-2.5 px-3 font-mono text-slate-800 flex items-center gap-2">
                            <span>{viewingHousehold.phone || '0760539158'}</span>
                            <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-bold cursor-pointer">
                              Update phone
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-500">Identity</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 rounded font-bold text-[10px] mr-1.5">NIC</span>
                            {viewingHousehold.applicantNic}
                          </td>
                        </tr>
                        <tr className="bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-500">Address</td>
                          <td className="py-2.5 px-3 text-slate-800">
                            {viewingHousehold.address}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-500">Status</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded text-[11px]">
                              Grievance - DS Endorsed
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: Master QR & History Box */}
                  <div className="space-y-3">
                    {/* Master QR Code */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-500 font-mono">
                        Master Family QR Code
                      </div>
                      {familyQrDataUrl ? (
                        <img src={familyQrDataUrl} alt="Family QR" className="w-24 h-24 mx-auto border rounded bg-white p-1" />
                      ) : (
                        <div className="w-24 h-24 mx-auto bg-slate-200 rounded flex items-center justify-center font-mono text-xs">QR</div>
                      )}
                      <div className="text-[11px] font-mono font-bold text-slate-800">
                        {viewingHousehold.familyCode}
                      </div>
                    </div>

                    {/* History Box (Matching Image 1) */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span>HISTORY</span>
                      </div>
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="py-1.5 px-2.5">Date / time</th>
                            <th className="py-1.5 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="py-1.5 px-2.5 font-mono text-slate-600">2026-08-19 08:24 PM</td>
                            <td className="py-1.5 px-2.5 font-semibold text-emerald-900">DS Endorsed</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2.5 font-mono text-slate-600">2026-06-17 10:37 AM</td>
                            <td className="py-1.5 px-2.5 font-semibold text-slate-700">Committee Decision Approved</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2.5 font-mono text-slate-600">2026-03-24 11:48 AM</td>
                            <td className="py-1.5 px-2.5 font-semibold text-slate-700">Committee Decision Got</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Certification Info Box (Matching Image 1) */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>CERTIFICATION INFO</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Selected category:</span>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
                        {viewingHousehold.selectedCategory}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Appeals:</span>
                      <span className="font-bold text-slate-800">None</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Objections:</span>
                      <span className="font-mono text-slate-800">{viewingHousehold.objectionsStatus || 'OC-08-10-2025-69523 [Completed]'}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details Box (Matching Image 1) */}
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2 text-xs shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-700" />
                      <span>BANK DETAILS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="px-2 py-0.5 text-[11px] text-blue-700 border border-blue-300 rounded font-bold">
                        Account detail
                      </button>
                      <button type="button" className="px-2 py-0.5 text-[11px] text-red-600 border border-red-300 rounded font-bold">
                        Deactivate
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Account status:</span>
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-bold mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{viewingHousehold.bankDetails?.status || 'Verified'}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Bank:</span>
                      <span className="font-bold text-slate-900">{viewingHousehold.bankDetails?.bankName || 'Peoples Bank'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Branch:</span>
                      <span className="font-bold text-slate-900">{viewingHousehold.bankDetails?.branch || 'Valaichchenai'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Account number:</span>
                      <span className="font-mono font-bold text-emerald-950 text-sm">{viewingHousehold.bankDetails?.accountNumber || '208390058609'}</span>
                    </div>
                  </div>
                </div>

                {/* Household Members Table (Matching Image 1 Bottom Section) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 px-3.5 py-2.5 font-bold text-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-600" />
                      <span>HOUSEHOLD MEMBERS</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      Family Code: {viewingHousehold.familyCode}
                    </span>
                  </div>

                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Full name</th>
                        <th className="py-2.5 px-3">NIC</th>
                        <th className="py-2.5 px-3">Relation</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {beneficiaries
                        .filter((b) => b.familyCode === viewingHousehold.familyCode)
                        .map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{m.id}</td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">{m.nameEn || m.nameTa}</div>
                              <div className="text-[10px] text-slate-500">{m.nameTa}</div>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-800">{m.nic}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                {m.familyRelationship || (m.familyHead ? 'HEAD' : 'MEMBER')}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {m.status === 'DECEASED' ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-900 rounded border border-red-300 font-bold text-[10px]">
                                  Dead
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold text-[10px]">
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Household Data (Sections 02 to 13 from Form Part 1 / Image 2) */}
            {activeDossierTab === 'household_data' && (
              <div className="space-y-4 text-xs">
                {/* Sections 02 & 03: Assets */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-slate-800">
                    02 & 03. நிலம் மற்றும் சொத்துக்கள் (Land & Property Assets)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                    <div><b>நிலம் சொந்தமா:</b> {viewingHousehold.commonAssets.ownsLand ? 'ஆம் (Owns Land)' : 'இல்லை (Landless)'}</div>
                    <div><b>வாகனம்:</b> {viewingHousehold.commonAssets.vehicleType}</div>
                    <div><b>இயந்திரம்/படகு:</b> {viewingHousehold.commonAssets.machineryType}</div>
                    <div><b>கால்நடைகள்:</b> {viewingHousehold.commonAssets.livestockType} ({viewingHousehold.commonAssets.livestockCount})</div>
                  </div>
                </div>

                {/* Sections 04 & 05: Monthly Expenses & Monthly Income */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                    <div className="font-bold text-slate-800 flex items-center justify-between pb-1 border-b">
                      <span>04. கடந்த மாத செலவுகள்</span>
                      <span className="font-mono text-red-800 font-bold">Rs. {viewingHousehold.commonAssets.expenses.total.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                      <div>உணவு: Rs. {viewingHousehold.commonAssets.expenses.food}</div>
                      <div>மருந்து: Rs. {viewingHousehold.commonAssets.expenses.medical}</div>
                      <div>மின்சாரம்: Rs. {viewingHousehold.commonAssets.expenses.electricity}</div>
                      <div>கடன்கள்: Rs. {viewingHousehold.commonAssets.expenses.loansDebt}</div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-2xs">
                    <div className="font-bold text-slate-800 flex items-center justify-between pb-1 border-b">
                      <span>05. கடந்த மாத வருமானம்</span>
                      <span className="font-mono text-emerald-800 font-bold">Rs. {viewingHousehold.commonAssets.income.total.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                      <div>கூலி/பாதுகாப்பற்றது: Rs. {viewingHousehold.commonAssets.income.unstableSources}</div>
                      <div>சமுர்த்தி: Rs. {viewingHousehold.commonAssets.income.samurdhi}</div>
                      <div>விவசாயம்: Rs. {viewingHousehold.commonAssets.income.agriculture}</div>
                      <div>முதியோர்/பிற உதவி: Rs. {viewingHousehold.commonAssets.income.elderlyAid}</div>
                    </div>
                  </div>
                </div>

                {/* Sections 07 to 12: House Construction, Water, Sanitation */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="font-bold text-slate-800">
                    07 - 12. வீடமைப்பு, குடிநீர் மற்றும் கழிப்பறை வசதிகள்
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 text-[11px]">
                    <div><b>சுவர்:</b> {viewingHousehold.commonAssets.wallMaterial}</div>
                    <div><b>கூரை:</b> {viewingHousehold.commonAssets.roofMaterial}</div>
                    <div><b>தரை:</b> {viewingHousehold.commonAssets.floorMaterial}</div>
                    <div><b>பரப்பளவு:</b> {viewingHousehold.commonAssets.houseArea}</div>
                    <div><b>குடிநீர்:</b> {viewingHousehold.commonAssets.waterSource}</div>
                    <div><b>ஒளி:</b> {viewingHousehold.commonAssets.lightingSource}</div>
                    <div><b>மின் அலகுகள்:</b> {viewingHousehold.commonAssets.electricityUnitsKwh} kWh</div>
                    <div><b>கழிப்பறை:</b> {viewingHousehold.commonAssets.toiletLocation}</div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Criteria Score 100-Point Breakdown */}
            {activeDossierTab === 'score_breakdown' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase font-bold text-emerald-800">Total Vulnerability Assessment Score</div>
                    <div className="text-3xl font-black text-emerald-950 font-mono mt-1">
                      {viewingHousehold.score100} <span className="text-sm font-normal text-slate-500">/ 100 Pts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-emerald-800 text-white font-extrabold rounded-lg text-xs">
                      Priority Rank: {viewingHousehold.priorityRank}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>1. வீடமைப்பு நிலைமைப் புள்ளிகள்</span>
                      <span className="font-mono">{viewingHousehold.scoreBreakdown?.housingScore || 25} / 25</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${((viewingHousehold.scoreBreakdown?.housingScore || 25) / 25) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>2. சுகாதாரம் & குடிநீர்ப் புள்ளிகள்</span>
                      <span className="font-mono">{viewingHousehold.scoreBreakdown?.sanitationScore || 20} / 20</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((viewingHousehold.scoreBreakdown?.sanitationScore || 20) / 20) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>3. குடும்ப அங்கத்தவர்கள் இடர்பாட்டுப் புள்ளிகள்</span>
                      <span className="font-mono">{viewingHousehold.scoreBreakdown?.demographicsScore || 18} / 25</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-amber-600 h-2 rounded-full" style={{ width: `${((viewingHousehold.scoreBreakdown?.demographicsScore || 18) / 25) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>4. வருமானம் & வாழ்வாதாரப் புள்ளிகள்</span>
                      <span className="font-mono">{viewingHousehold.scoreBreakdown?.economicScore || 25} / 30</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${((viewingHousehold.scoreBreakdown?.economicScore || 25) / 30) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Past Assistance History for this Family */}
            {activeDossierTab === 'aid_history' && (
              <div className="space-y-3 text-xs">
                <div className="font-bold text-slate-800 flex items-center justify-between pb-1 border-b">
                  <span>கடந்த கால நிவாரண உதவிகள் வரலாறு (Aid Distribution History)</span>
                  <span className="text-slate-500 font-normal">Family Code: {viewingHousehold.familyCode}</span>
                </div>

                {assistanceRecords.filter((a) => a.familyCode === viewingHousehold.familyCode).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                    இக்குடும்பத்திற்கு இதுவரை எந்த நிவாரண உதவியும் பதிவு செய்யப்படவில்லை.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {assistanceRecords
                      .filter((a) => a.familyCode === viewingHousehold.familyCode)
                      .map((rec) => (
                        <div key={rec.id} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                          <div>
                            <div className="font-bold text-slate-900">{rec.aidDescription}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {rec.distributedDate} | Donor: {rec.donorOrOrganization}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-emerald-950">
                            {rec.amountOrValue}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-[11px] text-slate-500 font-mono">
                Household Ref: {viewingHousehold.householdReference}
              </span>
              <button
                type="button"
                onClick={() => setViewingHousehold(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Configure Scoring Weights Modal (Requirement 08) */}
      {isConfigWeightsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg text-lg">⚙️</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.configureScoringWeights}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    சுப்பர் அட்மின் அதிகாரம்: வறுமை மதிப்பீட்டு புள்ளிகளை விடயங்களுக்கு ஏற்ப மாற்றியமைக்கலாம்
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigWeightsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveScoringWeights} className="space-y-4">
              {/* Category Maximums */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800 block">01. பிரதான பிரிவுகளுக்கான அதிகபட்ச புள்ளிகள் (Max Total: 100)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Housing Max</label>
                    <input
                      type="number"
                      value={tempWeights.housingMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, housingMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Sanitation Max</label>
                    <input
                      type="number"
                      value={tempWeights.sanitationMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, sanitationMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Demographics Max</label>
                    <input
                      type="number"
                      value={tempWeights.demographicsMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, demographicsMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-0.5">Economic Max</label>
                    <input
                      type="number"
                      value={tempWeights.economicMax}
                      onChange={(e) => setTempWeights({ ...tempWeights, economicMax: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded bg-white font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Individual Item Weights */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                <span className="font-bold text-slate-800 block">02. தனித்தனி விடயங்களுக்கான புள்ளிகள் (Item Criteria Points)</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">ஓலைக் கூரை (Thatch Roof):</label>
                    <input
                      type="number"
                      value={tempWeights.thatchRoofPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, thatchRoofPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">மண் சுவர் (Mud Wall):</label>
                    <input
                      type="number"
                      value={tempWeights.mudWallPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, mudWallPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">கழிப்பறை அற்றது (No Toilet):</label>
                    <input
                      type="number"
                      value={tempWeights.noToiletPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, noToiletPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">ஒற்றைப் பெற்றோர் (Single Parent):</label>
                    <input
                      type="number"
                      value={tempWeights.singleParentPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, singleParentPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">மாற்றுத்திறனாளி (Disability):</label>
                    <input
                      type="number"
                      value={tempWeights.disabilityMemberPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, disabilityMemberPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">சிறுநீரக/நாள்பட்ட நோய் (Chronic):</label>
                    <input
                      type="number"
                      value={tempWeights.chronicIllnessPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, chronicIllnessPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">குறைந்த வருமானம் (&lt;15k):</label>
                    <input
                      type="number"
                      value={tempWeights.lowIncomePoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, lowIncomePoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">வாகனம் அற்றவர் (No Vehicle):</label>
                    <input
                      type="number"
                      value={tempWeights.noVehiclePoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, noVehiclePoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">தினக்கூலி வேலை (Daily Wage):</label>
                    <input
                      type="number"
                      value={tempWeights.dailyWageLaborPoints}
                      onChange={(e) => setTempWeights({ ...tempWeights, dailyWageLaborPoints: Number(e.target.value) })}
                      className="w-full px-2 py-1 border rounded font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTempWeights(DEFAULT_POVERTY_WEIGHTS)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100"
                >
                  மீட்டமை (Reset to Default)
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigWeightsOpen(false)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-100"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-bold shadow-xs"
                  >
                    சேமித்து மீளக்கணக்கிடு (Save & Recalculate)
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Family Wizard Modal (Requirement 02, 08) */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[92vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg text-lg">👨‍👩‍👧‍👦</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.addNewFamily}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    படிமுறை {wizardStep} / 3: {wizardStep === 1 ? 'குடும்பத்திற்கு பொதுவான தரவுகள்' : wizardStep === 2 ? 'தனி நபருக்குரிய தரவுகள்' : '100 புள்ளிகள் கணக்கீடு & உறுதிப்படுத்தல்'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Step Navigation Indicator */}
            <div className="flex items-center gap-2 text-xs font-bold pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className={`px-3 py-1 rounded-lg ${wizardStep === 1 ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                1. பொதுவான தரவுகள்
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className={`px-3 py-1 rounded-lg ${wizardStep === 2 ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                2. உறுப்பினர்கள் ({newMembersList.length})
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className={`px-3 py-1 rounded-lg ${wizardStep === 3 ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                3. புள்ளிகள் & முடிவு
              </button>
            </div>

            {/* STEP 1: Household Common Data (Sections 02 to 13) */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">குடும்ப அடையாளக் குறியீடு (Family Code) *</label>
                    <input
                      type="text"
                      required
                      value={newHouseholdMeta.familyCode}
                      onChange={(e) => setNewHouseholdMeta({ ...newHouseholdMeta, familyCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t.division} *</label>
                    <select
                      value={newHouseholdMeta.divisionCode}
                      onChange={(e) => setNewHouseholdMeta({ ...newHouseholdMeta, divisionCode: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                    >
                      {divisions.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.nameTa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t.headNameTa} *</label>
                    <input
                      type="text"
                      required
                      value={newHouseholdMeta.applicantNameTa}
                      onChange={(e) => setNewHouseholdMeta({ ...newHouseholdMeta, applicantNameTa: e.target.value })}
                      placeholder="e.g. சின்னப்பு விஜயகுமார்"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">தலைவர் NIC *</label>
                    <input
                      type="text"
                      required
                      value={newHouseholdMeta.applicantNic}
                      onChange={(e) => setNewHouseholdMeta({ ...newHouseholdMeta, applicantNic: e.target.value })}
                      placeholder="e.g. 891902697V"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t.phone}</label>
                    <input
                      type="text"
                      value={newHouseholdMeta.phone}
                      onChange={(e) => setNewHouseholdMeta({ ...newHouseholdMeta, phone: e.target.value })}
                      placeholder="e.g. 0760539158"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">{t.address}</label>
                    <input
                      type="text"
                      value={newHouseholdMeta.address}
                      onChange={(e) => setNewHouseholdMeta({ ...newHouseholdMeta, address: e.target.value })}
                      placeholder="e.g. SELVAPURAM KAYANKERNI"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Section 13: Single Parent Checkbox */}
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-pink-900">{t.isSingleParentQuestion}</span>
                  <input
                    type="checkbox"
                    checked={newCommonAssets.isSingleParent}
                    onChange={(e) => setNewCommonAssets({ ...newCommonAssets, isSingleParent: e.target.checked })}
                    className="w-4 h-4 rounded text-pink-600 cursor-pointer"
                  />
                </div>

                {/* Housing Materials (Sections 07 to 12) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-800 block">வீடமைப்பு மற்றும் சுகாதார நிலை (Living Conditions)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">கூரை (Roof)</label>
                      <select
                        value={newCommonAssets.roofMaterial}
                        onChange={(e) => setNewCommonAssets({ ...newCommonAssets, roofMaterial: e.target.value as any })}
                        className="w-full px-2 py-1 border rounded bg-white text-xs"
                      >
                        <option value="THATCH_PALM">தென்னை ஓலை / வைக்கோல்</option>
                        <option value="SHEET_ALUMINIUM">அலுமினியம் / தகடு</option>
                        <option value="TILES">ஓடுகள்</option>
                        <option value="CONCRETE">கான்கிரீட்</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">சுவர்கள் (Walls)</label>
                      <select
                        value={newCommonAssets.wallMaterial}
                        onChange={(e) => setNewCommonAssets({ ...newCommonAssets, wallMaterial: e.target.value as any })}
                        className="w-full px-2 py-1 border rounded bg-white text-xs"
                      >
                        <option value="CLAY_MUD">களிமண் / மண் சுவர்</option>
                        <option value="PALM_LEAF">தென்னை ஓலை</option>
                        <option value="PLANK">பலகை</option>
                        <option value="BRICK">செங்கல்</option>
                        <option value="CEMENT_BLOCK">சிமென்ட் கல்</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">தரை (Floor)</label>
                      <select
                        value={newCommonAssets.floorMaterial}
                        onChange={(e) => setNewCommonAssets({ ...newCommonAssets, floorMaterial: e.target.value as any })}
                        className="w-full px-2 py-1 border rounded bg-white text-xs"
                      >
                        <option value="CLAY">களிமண் தரை</option>
                        <option value="SAND">மணல் தரை</option>
                        <option value="CEMENT">சிமெந்து</option>
                        <option value="TILES">டைல்ஸ்</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">குடிநீர் (Water Source)</label>
                      <select
                        value={newCommonAssets.waterSource}
                        onChange={(e) => setNewCommonAssets({ ...newCommonAssets, waterSource: e.target.value as any })}
                        className="w-full px-2 py-1 border rounded bg-white text-xs"
                      >
                        <option value="UNPROTECTED_WELL">பாதுகாப்பற்ற கிணறு</option>
                        <option value="PROTECTED_WELL">பாதுகாக்கப்பட்ட கிணறு</option>
                        <option value="NWSDB_TAP">குழாய் நீர் (சபை)</option>
                        <option value="RIVER_TANK">குளம் / ஆறு</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">கழிப்பறை (Toilet)</label>
                      <select
                        value={newCommonAssets.toiletLocation}
                        onChange={(e) => setNewCommonAssets({ ...newCommonAssets, toiletLocation: e.target.value as any })}
                        className="w-full px-2 py-1 border rounded bg-white text-xs"
                      >
                        <option value="OPEN_DEFECATION">திறந்தவெளி (கழிப்பறையற்றது)</option>
                        <option value="SHARED">மற்ற குடும்பத்துடன் பகிர்வு</option>
                        <option value="INDOOR_EXCLUSIVE">வீட்டுக்குள் தனி கழிப்பறை</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">மின்சாரம் (Lighting)</label>
                      <select
                        value={newCommonAssets.lightingSource}
                        onChange={(e) => setNewCommonAssets({ ...newCommonAssets, lightingSource: e.target.value as any })}
                        className="w-full px-2 py-1 border rounded bg-white text-xs"
                      >
                        <option value="KEROSENE">மண்ணெண்ணெய் விளக்கு</option>
                        <option value="GRID_ELECTRICITY">தேசிய மின் கட்டமைப்பு</option>
                        <option value="SOLAR">சூரிய சக்தி</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold"
                  >
                    அடுத்த படிமுறை: உறுப்பினர்கள் பதிவு →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Individual Members Profile (Form Part 2) */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="font-bold text-slate-800">
                    குடும்ப உறுப்பினர்கள் விபரம் (அனைவரும் ஒரே குடும்ப QR இன் கீழ் இணைகின்றனர்)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMemberRow}
                    className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>உறுப்பினர் சேர்</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {newMembersList.map((m, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          உறுப்பினர் {idx + 1}: {idx === 0 ? 'குடும்பத் தலைவர் (Head)' : m.rel}
                        </span>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberRow(idx)}
                            className="text-red-600 hover:text-red-800 text-xs font-bold"
                          >
                            நீக்கு ✕
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">பெயர் (தமிழ்)</label>
                          <input
                            type="text"
                            value={m.nameTa}
                            onChange={(e) => {
                              const updated = [...newMembersList];
                              updated[idx].nameTa = e.target.value;
                              setNewMembersList(updated);
                            }}
                            placeholder="பெயர்"
                            className="w-full px-2 py-1 border rounded bg-white text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">NIC (இல்லை எனில் வெற்றிடம்)</label>
                          <input
                            type="text"
                            value={m.nic}
                            onChange={(e) => {
                              const updated = [...newMembersList];
                              updated[idx].nic = e.target.value;
                              setNewMembersList(updated);
                            }}
                            placeholder="NIC"
                            className="w-full px-2 py-1 border rounded bg-white text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">உறவு (Relation)</label>
                          <select
                            value={m.rel}
                            onChange={(e) => {
                              const updated = [...newMembersList];
                              updated[idx].rel = e.target.value as FamilyRelationship;
                              setNewMembersList(updated);
                            }}
                            className="w-full px-2 py-1 border rounded bg-white text-xs"
                          >
                            <option value="HEAD">குடும்பத் தலைவர்</option>
                            <option value="WIFE">மனைவி</option>
                            <option value="HUSBAND">கணவன்</option>
                            <option value="SON">மகன்</option>
                            <option value="DAUGHTER">மகள்</option>
                            <option value="MOTHER">தாய்</option>
                            <option value="FATHER">தந்தை</option>
                            <option value="GRANDMOTHER">பாட்டி</option>
                            <option value="GRANDFATHER">தாத்தா</option>
                            <option value="OTHER">ஏனைய உறவினர்</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">பிறந்த திகதி</label>
                          <input
                            type="date"
                            value={m.dob}
                            onChange={(e) => {
                              const updated = [...newMembersList];
                              updated[idx].dob = e.target.value;
                              setNewMembersList(updated);
                            }}
                            className="w-full px-2 py-1 border rounded bg-white text-xs font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">பொருளாதார செயல்பாடு (Employment)</label>
                          <input
                            type="text"
                            value={m.economicActivity}
                            onChange={(e) => {
                              const updated = [...newMembersList];
                              updated[idx].economicActivity = e.target.value;
                              setNewMembersList(updated);
                            }}
                            placeholder="e.g. கூலி வேலை / கடற்றொழில் / மாணவர்"
                            className="w-full px-2 py-1 border rounded bg-white text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-3 sm:col-span-2">
                          <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.isDisability}
                              onChange={(e) => {
                                const updated = [...newMembersList];
                                updated[idx].isDisability = e.target.checked;
                                setNewMembersList(updated);
                              }}
                              className="rounded text-emerald-600"
                            />
                            <span>மாற்றுத்திறனாளி</span>
                          </label>
                          <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.isElderly}
                              onChange={(e) => {
                                const updated = [...newMembersList];
                                updated[idx].isElderly = e.target.checked;
                                setNewMembersList(updated);
                              }}
                              className="rounded text-emerald-600"
                            />
                            <span>முதியோர் (70+)</span>
                          </label>
                          <label className="flex items-center gap-1 font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={m.isPregnant}
                              onChange={(e) => {
                                const updated = [...newMembersList];
                                updated[idx].isPregnant = e.target.checked;
                                setNewMembersList(updated);
                              }}
                              className="rounded text-emerald-600"
                            />
                            <span>கர்ப்பிணி</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 border rounded-lg font-bold text-slate-700"
                  >
                    ← முந்தையது
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold"
                  >
                    அடுத்த படிமுறை: 100 புள்ளிகள் மதிப்பீடு →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Real-Time 100-Point Score Calculation & Confirmation */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-emerald-800">கணிக்கப்பட்ட வறுமைப் புள்ளிகள்</span>
                      <div className="text-3xl font-black text-emerald-950 font-mono mt-0.5">
                        {calculateFamilyPovertyScore(newCommonAssets, newMembersList as any, povertyWeights).score100} / 100
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 bg-emerald-800 text-white font-extrabold rounded-lg text-xs">
                        முன்னுரிமை நிலை: {calculateFamilyPovertyScore(newCommonAssets, newMembersList as any, povertyWeights).priorityRank}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    இக்குடும்பத்தின் கூரை, சுவர், குடிநீர், வருமானம் மற்றும் அங்கத்தவர்களின் இடர்பாடுகள் அடிப்படையில் முன்னுரிமை ஒழுங்குமுறை தீர்மானிக்கப்பட்டுள்ளது.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 border rounded-lg font-bold text-slate-700"
                  >
                    ← முந்தையது
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitFamilyWizard}
                    className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-xs"
                  >
                    குடும்பத்தை பதிக (Commit & Save Family Unit)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
