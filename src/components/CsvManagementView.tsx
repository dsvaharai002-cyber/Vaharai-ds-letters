import React, { useState, useMemo } from 'react';
import {
  Beneficiary,
  User,
  GNDivision,
  AssistanceRecord,
  PregnantMotherRecord,
  LandRecord,
  ALL_WELFARE_SCHEMES_LIST,
  WelfareScheme,
  FamilyRelationship,
} from '../types';
import { Language, translations } from '../translations/i18n';
import {
  downloadCsvFile,
  generateBeneficiarySampleCsv,
  generateUsersSampleCsv,
  generateDivisionsSampleCsv,
  generateAssistanceSampleCsv,
  generateFamiliesSampleCsv,
  generateElderlySampleCsv,
  generatePregnantMothersSampleCsv,
  generateDisabilitySampleCsv,
  generateAswesumaSampleCsv,
  generateLandSampleCsv,
  parseBeneficiariesFromCsv,
  parseUsersFromCsv,
  parseAssistanceFromCsv,
  parseFamiliesFromCsv,
  parseElderlyFromCsv,
  parsePregnantMothersFromCsv,
  parseDisabilityFromCsv,
  parseAswesumaFromCsv,
  parseLandFromCsv,
  exportBeneficiariesToCsv,
  exportUsersToCsv,
  exportDivisionsToCsv,
  exportAssistanceToCsv,
  exportFamiliesToCsv,
  exportElderlyToCsv,
  exportPregnantMothersToCsv,
  exportDisabilityToCsv,
  exportAswesumaToCsv,
  exportLandToCsv,
  getRelationshipTamilLabel,
} from '../services/csv';
import {
  FileSpreadsheet,
  Download,
  Compass,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Users,
  Gift,
  Building,
  UserCheck,
  Heart,
  Baby,
  Accessibility,
  Coins,
  Search,
  Filter,
  Eye,
  Plus,
  QrCode,
  Printer,
  Sparkles,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import { 
  createDatabaseSnapshot, 
  pushToCentralDatabase, 
  calculateAge,
  recordDeletedId,
  recordDeletedIds,
  clearAllBeneficiariesPermanently,
  clearAllAssistanceRecordsPermanently,
  clearAllPregnantMothersPermanently,
  clearAllLandRecordsPermanently,
} from '../services/storage';
import { saveToDesignatedDriveFile, isDriveAutoSyncEnabled } from '../services/googleDrive';
import { isGoogleDriveAuthenticated } from '../services/auth';
import { FamilyGroupModal } from './FamilyGroupModal';

interface CsvManagementViewProps {
  beneficiaries: Beneficiary[];
  users: User[];
  divisions: GNDivision[];
  assistanceRecords?: AssistanceRecord[];
  pregnantMothers?: PregnantMotherRecord[];
  landRecords?: LandRecord[];
  currentUser: User;
  lang: Language;
  onUpdateBeneficiaries: (items: Beneficiary[]) => void;
  onUpdateUsers: (items: User[]) => void;
  onUpdateAssistanceRecords?: (items: AssistanceRecord[]) => void;
  onUpdatePregnantMothers?: (items: PregnantMotherRecord[]) => void;
  onUpdateLandRecords?: (items: LandRecord[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export type ActiveCsvType =
  | 'families'
  | 'elderly'
  | 'pregnant'
  | 'disability'
  | 'aswesuma'
  | 'beneficiaries'
  | 'assistance'
  | 'land'
  | 'users'
  | 'divisions';

export const CsvManagementView: React.FC<CsvManagementViewProps> = ({
  beneficiaries,
  users,
  divisions,
  assistanceRecords = [],
  pregnantMothers = [],
  landRecords = [],
  currentUser,
  lang,
  onUpdateBeneficiaries,
  onUpdateUsers,
  onUpdateAssistanceRecords,
  onUpdatePregnantMothers,
  onUpdateLandRecords,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Primary View Mode: CSV Management vs Connected Family Visualizer
  const [viewMode, setViewMode] = useState<'csv_io' | 'family_visualizer'>('csv_io');
  const [activeType, setActiveType] = useState<ActiveCsvType>('families');

  // Assistance Program Batch Info State (Requirement 06)
  const [assistanceProgramTitle, setAssistanceProgramTitle] = useState<string>(
    'வறட்சி / வெள்ள நிவாரண விநியோகம் 2026 (Flood & Drought Relief)'
  );
  const [assistanceBatchId, setAssistanceBatchId] = useState<string>(
    () => `AID-PRG-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [assistanceDonor, setAssistanceDonor] = useState<string>(
    'பிரதேச செயலகம் வாகரை / DS Office Vaharai'
  );
  const [assistanceDate, setAssistanceDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );

  // Import State
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [parsedPregnantMothers, setParsedPregnantMothers] = useState<PregnantMotherRecord[]>([]);
  const [parsedDuplicates, setParsedDuplicates] = useState<AssistanceRecord[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [successBanner, setSuccessBanner] = useState<string>('');

  // Family Tree Modal State
  const [selectedFamilyCodeForModal, setSelectedFamilyCodeForModal] = useState<string | null>(null);

  // Search & Filter for Family Visualizer
  const [familySearchQuery, setFamilySearchQuery] = useState('');
  const [familyDivisionFilter, setFamilyDivisionFilter] = useState('ALL');

  // Group all citizens by Family Code for the Connected Family Units Visualizer
  const familyGroups = useMemo(() => {
    const map = new Map<string, Beneficiary[]>();
    for (const b of beneficiaries) {
      const code = b.familyCode?.trim() || `FAM-${b.divisionCode}-001`;
      const list = map.get(code) || [];
      list.push(b);
      map.set(code, list);
    }

    let entries = Array.from(map.entries());

    if (familyDivisionFilter !== 'ALL') {
      entries = entries.filter(([_, members]) => members[0]?.divisionCode === familyDivisionFilter);
    }

    if (familySearchQuery.trim()) {
      const q = familySearchQuery.toLowerCase().trim();
      entries = entries.filter(([code, members]) => {
        const matchCode = code.toLowerCase().includes(q);
        const matchMembers = members.some(
          (m) =>
            m.nameTa.toLowerCase().includes(q) ||
            m.nameEn.toLowerCase().includes(q) ||
            m.nic.toLowerCase().includes(q) ||
            (m.phone && m.phone.includes(q))
        );
        return matchCode || matchMembers;
      });
    }

    return entries;
  }, [beneficiaries, familyDivisionFilter, familySearchQuery]);

  // Super Admin & Admin Deletion Powers for Section / CSV imported records
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';
  const canDelete = isSuperAdmin || currentUser.role === 'ADMIN 1' || currentUser.role === 'ADMIN 2';
  const [selectedRegisteredIds, setSelectedRegisteredIds] = useState<string[]>([]);
  const [registeredSearchQuery, setRegisteredSearchQuery] = useState<string>('');

  // Items currently registered under the active category
  const currentCategoryItems = useMemo(() => {
    let list: any[] = [];
    if (activeType === 'families' || activeType === 'beneficiaries') {
      list = beneficiaries;
    } else if (activeType === 'elderly') {
      list = beneficiaries.filter(
        (b) => b.isElderly || calculateAge(b.dob, b.nic) >= 60 || b.welfareScheme === 'ELDERLY' || b.elderlyAllowanceStatus
      );
    } else if (activeType === 'pregnant') {
      list = pregnantMothers || [];
    } else if (activeType === 'disability') {
      list = beneficiaries.filter(
        (b) => b.isPersonWithDisability || b.chronicIllness === 'DISABILITY_PHYSICAL' || b.welfareSchemes?.includes('DISABILITY')
      );
    } else if (activeType === 'aswesuma') {
      list = beneficiaries.filter(
        (b) => b.welfareScheme?.startsWith('ASWESUMA') || b.welfareSchemes?.some((s) => s.startsWith('ASWESUMA'))
      );
    } else if (activeType === 'assistance') {
      list = assistanceRecords || [];
    } else if (activeType === 'land') {
      list = landRecords || [];
    } else if (activeType === 'users') {
      list = users;
    } else {
      list = beneficiaries;
    }

    if (registeredSearchQuery.trim()) {
      const q = registeredSearchQuery.toLowerCase().trim();
      list = list.filter((item: any) => {
        const text = `${item.id || ''} ${item.nic || ''} ${item.nameTa || ''} ${item.nameEn || ''} ${item.name || ''} ${item.ownerNic || ''} ${item.ownerNameTa || ''} ${item.permitNo || ''} ${item.familyCode || ''} ${item.phone || ''}`.toLowerCase();
        return text.includes(q);
      });
    }
    return list;
  }, [activeType, beneficiaries, pregnantMothers, assistanceRecords, landRecords, users, registeredSearchQuery]);

  const handleClearAllActiveCategory = () => {
    if (!isSuperAdmin) {
      alert(lang === 'ta' ? 'அனைத்து தரவுகளையும் அழிக்கும் உரிமை சூப்பர் அட்மினுக்கு மட்டுமே உண்டு.' : 'Only Super Admin can erase all records.');
      return;
    }
    const catName =
      activeType === 'families' ? (lang === 'ta' ? 'குடும்பங்கள் & பிரஜைகள்' : 'Families & Citizens')
      : activeType === 'elderly' ? (lang === 'ta' ? 'முதியோர் பதிவுகள்' : 'Senior Citizens')
      : activeType === 'pregnant' ? (lang === 'ta' ? 'கர்ப்பிணித் தாய்மார் பதிவுகள்' : 'Pregnant Mothers')
      : activeType === 'disability' ? (lang === 'ta' ? 'அங்கவீனர் பதிவுகள்' : 'Disability Records')
      : activeType === 'aswesuma' ? (lang === 'ta' ? 'அஸ்வெசும பயனாளிகள்' : 'Aswesuma Beneficiaries')
      : activeType === 'assistance' ? (lang === 'ta' ? 'நிவாரண உதவி பதிவுகள்' : 'Relief Aid Records')
      : activeType === 'land' ? (lang === 'ta' ? 'காணிப் பதிவுகள்' : 'Land Records')
      : activeType === 'users' ? (lang === 'ta' ? 'உத்தியோகத்தர் பயனாளர்கள்' : 'Staff Users')
      : (lang === 'ta' ? 'பிரஜைகள் தரவுத்தளம்' : 'Citizens');

    const confirmMsg = lang === 'ta'
      ? `⚠️ கடுமையான எச்சரிக்கை: "${catName}" பிரிவில் உள்ள அனைத்து பதிவுகளும் (${currentCategoryItems.length}) நிரந்தரமாக அழிக்கப்படும்!\n\nநிச்சயமாக அழிக்க விரும்புகிறீர்களா?`
      : `Warning: ALL records in "${catName}" (${currentCategoryItems.length}) will be permanently erased. Proceed?`;
    if (!window.confirm(confirmMsg)) return;

    const promptText = lang === 'ta' ? 'உறுதிப்படுத்த "DELETE" அல்லது "அழி" என தட்டச்சு செய்யவும்:' : 'Type "DELETE" to confirm:';
    const answer = window.prompt(promptText);
    if (answer !== 'DELETE' && answer !== 'அழி') return;

    if (activeType === 'pregnant') {
      clearAllPregnantMothersPermanently();
      if (onUpdatePregnantMothers) onUpdatePregnantMothers([]);
      onAuditLog('CLEAR_ALL_CATEGORY', `Super Admin (${currentUser.name}) erased all pregnant mother records`);
    } else if (activeType === 'assistance') {
      clearAllAssistanceRecordsPermanently();
      if (onUpdateAssistanceRecords) onUpdateAssistanceRecords([]);
      onAuditLog('CLEAR_ALL_CATEGORY', `Super Admin (${currentUser.name}) erased all assistance relief records`);
    } else if (activeType === 'land') {
      clearAllLandRecordsPermanently();
      if (onUpdateLandRecords) onUpdateLandRecords([]);
      onAuditLog('CLEAR_ALL_CATEGORY', `Super Admin (${currentUser.name}) erased all land records`);
    } else if (activeType === 'users') {
      const superAdminOnly = users.filter((u) => u.role === 'SUPERADMIN');
      onUpdateUsers(superAdminOnly);
      onAuditLog('CLEAR_ALL_CATEGORY', `Super Admin (${currentUser.name}) reset staff users`);
    } else {
      clearAllBeneficiariesPermanently();
      onUpdateBeneficiaries([]);
      onAuditLog('CLEAR_ALL_CATEGORY', `Super Admin (${currentUser.name}) erased all citizen & family records`);
    }

    setSelectedRegisteredIds([]);
    setSuccessBanner(lang === 'ta' ? `🗑️ ${catName} அனைத்து விபரங்களும் வெற்றிகரமாக அழிக்கப்பட்டன.` : `All ${catName} records were permanently erased.`);
    setTimeout(() => {
      const snapshot = createDatabaseSnapshot();
      pushToCentralDatabase(snapshot);
      if (isGoogleDriveAuthenticated() && isDriveAutoSyncEnabled()) {
        saveToDesignatedDriveFile(snapshot);
      }
    }, 50);
  };

  const handleDeleteSingleRegistered = (item: any) => {
    if (!canDelete) {
      alert(lang === 'ta' ? 'பதிவுகளை நீக்கும் அதிகாரம் சூப்பர் அட்மின் மற்றும் அட்மினுக்கு மட்டுமே உண்டு.' : 'Permission denied. Only Super Admin and Admin can delete records.');
      return;
    }
    const name = item.nameTa || item.nameEn || item.name || item.permitNo || item.id;
    if (!window.confirm(lang === 'ta' ? `"${name}" பதிவை நிச்சயமாக அழிக்க வேண்டுமா?` : `Are you sure you want to delete "${name}"?`)) return;

    if (activeType === 'pregnant' && onUpdatePregnantMothers) {
      recordDeletedId(item.id, item.nic);
      const updated = (pregnantMothers || []).filter((m) => m.id !== item.id && (item.nic ? m.nic !== item.nic : true));
      onUpdatePregnantMothers(updated);
      onAuditLog('DELETE_PREGNANT_RECORD', `Deleted pregnant mother ${name} (${item.nic || item.id})`);
    } else if (activeType === 'assistance' && onUpdateAssistanceRecords) {
      const updated = (assistanceRecords || []).filter((a) => a.id !== item.id);
      onUpdateAssistanceRecords(updated);
      onAuditLog('DELETE_ASSISTANCE_RECORD', `Deleted aid record ${item.id} for family ${item.familyCode}`);
    } else if (activeType === 'land' && onUpdateLandRecords) {
      const updated = (landRecords || []).filter((l) => l.id !== item.id);
      onUpdateLandRecords(updated);
      onAuditLog('DELETE_LAND_RECORD', `Deleted land permit ${item.permitNo || item.id}`);
    } else if (activeType === 'users') {
      if (item.role === 'SUPERADMIN' && users.filter((u) => u.role === 'SUPERADMIN').length <= 1) {
        alert(lang === 'ta' ? 'கடைசி Super Admin கணக்கை அழிக்க முடியாது!' : 'Cannot delete the only Super Admin account!');
        return;
      }
      const updated = users.filter((u) => u.id !== item.id);
      onUpdateUsers(updated);
      onAuditLog('DELETE_USER', `Deleted user ${item.name} (${item.id})`);
    } else {
      recordDeletedId(item.id, item.nic);
      const updated = beneficiaries.filter((b) => b.id !== item.id && (item.nic ? b.nic !== item.nic : true));
      onUpdateBeneficiaries(updated);
      onAuditLog('DELETE_BENEFICIARY_FROM_CSV_VIEW', `Deleted citizen ${name} (NIC: ${item.nic || item.id})`);
    }

    setSuccessBanner(lang === 'ta' ? `🗑️ "${name}" பதிவு வெற்றிகரமாக அழிக்கப்பட்டது.` : `Deleted "${name}" successfully.`);
    setTimeout(() => {
      const snapshot = createDatabaseSnapshot();
      pushToCentralDatabase(snapshot);
      if (isGoogleDriveAuthenticated() && isDriveAutoSyncEnabled()) {
        saveToDesignatedDriveFile(snapshot);
      }
    }, 50);
  };

  const handleBulkDeleteRegistered = () => {
    if (!canDelete || selectedRegisteredIds.length === 0) return;
    const count = selectedRegisteredIds.length;
    const confirmMsg = lang === 'ta'
      ? `தேர்ந்தெடுக்கப்பட்ட ${count} பதிவுகளை நிச்சயமாக நீக்க வேண்டுமா?`
      : `Are you sure you want to delete ${count} selected records?`;
    if (!window.confirm(confirmMsg)) return;

    const idSet = new Set(selectedRegisteredIds);
    if (activeType === 'pregnant' && onUpdatePregnantMothers) {
      const toDel = (pregnantMothers || []).filter((m) => idSet.has(m.id) || (m.nic && idSet.has(m.nic)));
      recordDeletedIds(toDel.map((m) => m.id).concat(toDel.map((m) => m.nic).filter(Boolean)));
      const updated = (pregnantMothers || []).filter((m) => !idSet.has(m.id) && !(m.nic && idSet.has(m.nic)));
      onUpdatePregnantMothers(updated);
    } else if (activeType === 'assistance' && onUpdateAssistanceRecords) {
      const updated = (assistanceRecords || []).filter((a) => !idSet.has(a.id));
      onUpdateAssistanceRecords(updated);
    } else if (activeType === 'land' && onUpdateLandRecords) {
      const updated = (landRecords || []).filter((l) => !idSet.has(l.id));
      onUpdateLandRecords(updated);
    } else if (activeType === 'users') {
      const updated = users.filter((u) => !idSet.has(u.id) || u.role === 'SUPERADMIN');
      onUpdateUsers(updated);
    } else {
      const toDel = beneficiaries.filter((b) => idSet.has(b.id) || (b.nic && idSet.has(b.nic)));
      recordDeletedIds(toDel.map((b) => b.id).concat(toDel.map((b) => b.nic).filter(Boolean)));
      const updated = beneficiaries.filter((b) => !idSet.has(b.id) && !(b.nic && idSet.has(b.nic)));
      onUpdateBeneficiaries(updated);
    }

    onAuditLog('BULK_DELETE_CSV_VIEW', `Bulk deleted ${count} records in ${activeType} by ${currentUser.name}`);
    setSelectedRegisteredIds([]);
    setSuccessBanner(lang === 'ta' ? `🗑️ ${count} பதிவுகள் வெற்றிகரமாக நீக்கப்பட்டன.` : `Deleted ${count} records successfully.`);
    setTimeout(() => {
      const snapshot = createDatabaseSnapshot();
      pushToCentralDatabase(snapshot);
      if (isGoogleDriveAuthenticated() && isDriveAutoSyncEnabled()) {
        saveToDesignatedDriveFile(snapshot);
      }
    }, 50);
  };

  const handleRemovePreviewRow = (idx: number) => {
    setParsedPreview((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDownloadSample = () => {
    if (activeType === 'families') {
      const csv = generateFamiliesSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_family_units_sample.csv');
    } else if (activeType === 'elderly') {
      const csv = generateElderlySampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_elderly_registration_sample.csv');
    } else if (activeType === 'pregnant') {
      const csv = generatePregnantMothersSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_pregnant_mothers_sample.csv');
    } else if (activeType === 'disability') {
      const csv = generateDisabilitySampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_disability_registration_sample.csv');
    } else if (activeType === 'aswesuma') {
      const csv = generateAswesumaSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_aswesuma_sample.csv');
    } else if (activeType === 'beneficiaries') {
      const csv = generateBeneficiarySampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_all_citizens_sample.csv');
    } else if (activeType === 'assistance') {
      const csv = generateAssistanceSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_assistance_distribution_sample.csv');
    } else if (activeType === 'land') {
      const csv = generateLandSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_land_permits_sample.csv');
    } else if (activeType === 'users') {
      const csv = generateUsersSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_staff_users_sample.csv');
    } else {
      const csv = generateDivisionsSampleCsv();
      downloadCsvFile(csv, 'vaharai_ds_divisions_sample.csv');
    }
  };

  const handleExportCurrent = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    if (activeType === 'families') {
      const csv = exportFamiliesToCsv(beneficiaries);
      downloadCsvFile(csv, `vaharai_families_master_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported all family units and members to CSV`);
    } else if (activeType === 'elderly') {
      const csv = exportElderlyToCsv(beneficiaries);
      downloadCsvFile(csv, `vaharai_elderly_citizens_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported elderly citizens to CSV`);
    } else if (activeType === 'pregnant') {
      const csv = exportPregnantMothersToCsv(pregnantMothers);
      downloadCsvFile(csv, `vaharai_pregnant_mothers_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported pregnant mothers to CSV`);
    } else if (activeType === 'disability') {
      const csv = exportDisabilityToCsv(beneficiaries);
      downloadCsvFile(csv, `vaharai_disability_records_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported persons with disabilities to CSV`);
    } else if (activeType === 'aswesuma') {
      const csv = exportAswesumaToCsv(beneficiaries);
      downloadCsvFile(csv, `vaharai_aswesuma_beneficiaries_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported Aswesuma beneficiaries to CSV`);
    } else if (activeType === 'beneficiaries') {
      const csv = exportBeneficiariesToCsv(beneficiaries);
      downloadCsvFile(csv, `vaharai_citizens_master_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${beneficiaries.length} citizens to CSV`);
    } else if (activeType === 'assistance') {
      const csv = exportAssistanceToCsv(assistanceRecords);
      downloadCsvFile(csv, `vaharai_assistance_distribution_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${assistanceRecords.length} assistance distribution records to CSV`);
    } else if (activeType === 'land') {
      const csv = exportLandToCsv(landRecords);
      downloadCsvFile(csv, `vaharai_land_records_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${landRecords.length} land records to CSV`);
    } else if (activeType === 'users') {
      const csv = exportUsersToCsv(users);
      downloadCsvFile(csv, `vaharai_users_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${users.length} staff records to CSV`);
    } else {
      const csv = exportDivisionsToCsv(divisions);
      downloadCsvFile(csv, `vaharai_divisions_${timestamp}.csv`);
      onAuditLog('EXPORT_CSV', `Exported ${divisions.length} GN divisions to CSV`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);

      if (activeType === 'families') {
        const { items, errors } = parseFamiliesFromCsv(text, beneficiaries);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'elderly') {
        const { items, errors } = parseElderlyFromCsv(text, beneficiaries);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'pregnant') {
        const { beneficiaries: bItems, pregnantMothers: mItems, errors } = parsePregnantMothersFromCsv(text, beneficiaries);
        setParsedPreview(bItems);
        setParsedPregnantMothers(mItems);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'disability') {
        const { items, errors } = parseDisabilityFromCsv(text, beneficiaries);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'aswesuma') {
        const { items, errors } = parseAswesumaFromCsv(text, beneficiaries);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'beneficiaries') {
        const { items, errors } = parseBeneficiariesFromCsv(text);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'assistance') {
        // Requirement 06: Apply Batch Metadata (Unique ID and Program Title)
        const { validRecords, duplicateRecords, errors } = parseAssistanceFromCsv(
          text,
          assistanceRecords,
          beneficiaries,
          {
            programBatchId: assistanceBatchId,
            programTitle: assistanceProgramTitle,
            donor: assistanceDonor,
            date: assistanceDate,
          }
        );
        setParsedPreview(validRecords);
        setParsedDuplicates(duplicateRecords);
        setParseErrors(errors);
      } else if (activeType === 'land') {
        // Requirement 05: Land CSV parsing
        const { items, errors } = parseLandFromCsv(text, landRecords);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else if (activeType === 'users') {
        const { items, errors } = parseUsersFromCsv(text);
        setParsedPreview(items);
        setParsedDuplicates([]);
        setParseErrors(errors);
      } else {
        setParsedPreview([]);
        setParsedDuplicates([]);
        setParseErrors([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleCommitImport = (includeDuplicates: boolean = false) => {
    if (parsedPreview.length === 0 && (!includeDuplicates || parsedDuplicates.length === 0)) return;

    if (activeType === 'assistance') {
      const itemsToSave = includeDuplicates
        ? [...parsedPreview, ...parsedDuplicates]
        : (parsedPreview as AssistanceRecord[]);

      if (onUpdateAssistanceRecords) {
        onUpdateAssistanceRecords([...itemsToSave, ...assistanceRecords]);
      }
      onAuditLog(
        'IMPORT_ASSISTANCE_CSV',
        `Imported ${itemsToSave.length} relief records (duplicates filtered: ${includeDuplicates ? 'No (Forced)' : 'Yes'})`
      );
      setSuccessBanner(
        lang === 'ta'
          ? `✅ ${itemsToSave.length} உதவிப் பதிவுகள் சேர்க்கப்பட்டன! (${parsedDuplicates.length} இரட்டை உதவிகள் ${includeDuplicates ? 'விதிவிலக்காக அனுமதிக்கப்பட்டன' : 'தடுக்கப்பட்டன'})`
          : `✅ ${itemsToSave.length} assistance records saved! (${parsedDuplicates.length} duplicates ${includeDuplicates ? 'force imported' : 'prevented'}).`
      );
    } else if (activeType === 'pregnant') {
      // Update both Beneficiaries and PregnantMothers in sync
      const newCitizens = parsedPreview as Beneficiary[];
      const existingMap = new Map(beneficiaries.map((b) => [b.nic, b]));
      for (const item of newCitizens) {
        existingMap.set(item.nic, item);
      }
      onUpdateBeneficiaries(Array.from(existingMap.values()));

      if (onUpdatePregnantMothers && parsedPregnantMothers.length > 0) {
        const motherMap = new Map(pregnantMothers.map((m) => [m.nic, m]));
        for (const item of parsedPregnantMothers) {
          motherMap.set(item.nic, item);
        }
        onUpdatePregnantMothers(Array.from(motherMap.values()));
      }

      onAuditLog('IMPORT_CSV', `Imported ${newCitizens.length} pregnant mother records`);
      setSuccessBanner(
        lang === 'ta'
          ? `✅ ${newCitizens.length} கர்ப்பிணித் தாய்மார் விபரங்கள் குடும்பக் குறியீட்டுடன் சேர்க்கப்பட்டன!`
          : `✅ ${newCitizens.length} pregnant mother records imported and linked to families!`
      );
    } else if (
      activeType === 'families' ||
      activeType === 'elderly' ||
      activeType === 'disability' ||
      activeType === 'aswesuma' ||
      activeType === 'beneficiaries'
    ) {
      const newItems = parsedPreview as Beneficiary[];
      const existingMap = new Map(beneficiaries.map((b) => [b.nic, b]));
      for (const item of newItems) {
        existingMap.set(item.nic, item);
      }
      const merged = Array.from(existingMap.values());
      onUpdateBeneficiaries(merged);

      const typeLabel =
        activeType === 'families'
          ? lang === 'ta' ? 'குடும்பங்கள் (உறவுகளுடன்)' : 'family members'
          : activeType === 'elderly'
          ? lang === 'ta' ? 'முதியோர்' : 'senior citizens'
          : activeType === 'disability'
          ? lang === 'ta' ? 'மாற்றுத்திறனாளிகள்' : 'persons with disabilities'
          : activeType === 'aswesuma'
          ? lang === 'ta' ? 'அஸ்வெசும பயனாளிகள்' : 'Aswesuma beneficiaries'
          : lang === 'ta' ? 'பிரஜைகள்' : 'citizens';

      onAuditLog('IMPORT_CSV', `Imported ${newItems.length} ${activeType} records via CSV`);
      setSuccessBanner(
        lang === 'ta'
          ? `✅ ${newItems.length} ${typeLabel} வெற்றிகரமாக குடும்ப அலகு மற்றும் நலன்புரி உதவிகளுடன் சேர்க்கப்பட்டனர்!`
          : `✅ ${newItems.length} ${typeLabel} imported successfully with family linkages!`
      );
    } else if (activeType === 'users') {
      const newUsers = parsedPreview as User[];
      const existingMap = new Map(users.map((u) => [u.id, u]));
      for (const item of newUsers) {
        existingMap.set(item.id, item);
      }
      const merged = Array.from(existingMap.values());
      onUpdateUsers(merged);
      onAuditLog('IMPORT_CSV', `Imported ${newUsers.length} staff users via CSV`);
      setSuccessBanner(
        `${newUsers.length} ${lang === 'ta' ? 'அலுவலர் கணக்குகள் சேர்க்கப்பட்டன!' : 'users imported successfully!'}`
      );
    } else if (activeType === 'land') {
      const newLand = parsedPreview as LandRecord[];
      const existingMap = new Map(landRecords.map((l) => [l.id, l]));
      for (const item of newLand) {
        existingMap.set(item.id, item);
      }
      const merged = Array.from(existingMap.values());
      if (onUpdateLandRecords) onUpdateLandRecords(merged);
      onAuditLog('IMPORT_CSV', `Imported ${newLand.length} land records via CSV`);
      setSuccessBanner(
        lang === 'ta'
          ? `✅ ${newLand.length} காணிப் பதிவுகள் (அனுமதிப்பத்திரம் / LDO) வெற்றிகரமாக சேர்க்கப்பட்டன!`
          : `✅ ${newLand.length} land records (Permits / LDO) imported successfully!`
      );
    }

    setParsedPreview([]);
    setParsedDuplicates([]);
    setParsedPregnantMothers([]);
    setFileContent('');
    setFileName('');
    setTimeout(() => setSuccessBanner(''), 6000);

    // Instant cloud synchronization push
    setTimeout(async () => {
      try {
        const snapshot = createDatabaseSnapshot();
        await pushToCentralDatabase(snapshot);
        if (isGoogleDriveAuthenticated() && isDriveAutoSyncEnabled()) {
          await saveToDesignatedDriveFile(snapshot);
        }
      } catch (err) {
        console.warn('[CSV Import] Instant cloud sync notification:', err);
      }
    }, 50);
  };

  const getWelfareBadge = (code: WelfareScheme) => {
    const found = ALL_WELFARE_SCHEMES_LIST.find((s) => s.code === code);
    if (!found) return null;
    return (
      <span
        key={code}
        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${found.badgeClass}`}
      >
        {lang === 'ta' ? found.labelTa.split('(')[0] : found.labelEn}
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Main Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl text-xl shadow-xs">📊</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === 'ta' ? 'சிஎஸ்வி மாதிரிகள் & குடும்பங்கள் தரவுத்தளம்' : 'CSV Models & Family Unified Database'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'முதியோர், கர்ப்பிணி, அங்கவீனர், அஸ்வெசும என அனைத்தையும் தனித்தனி மாதிரிகளாக பதிவிறக்கி, தாய், தந்தை, மகன், மகள் என குடும்பமாக இணைக்கும் வசதி.'
              : 'Download individual CSV models for Elderly, Maternity, Disability, Aswesuma, and link them under universal Family QR codes.'}
          </p>
        </div>

        {/* Top Action Toggle & Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="p-1 bg-slate-200 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('csv_io')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'csv_io'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>{lang === 'ta' ? 'சிஎஸ்வி மேலாண்மை' : 'CSV Import/Export'}</span>
            </button>
            <button
              onClick={() => setViewMode('family_visualizer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'family_visualizer'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === 'ta' ? 'குடும்பங்கள் இணைப்புக் காட்சி' : 'Family Visualizer'}</span>
              <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-full font-mono">
                {familyGroups.length}
              </span>
            </button>
          </div>

          {viewMode === 'csv_io' && (
            <>
              <button
                onClick={handleDownloadSample}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-300 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'ta' ? 'மாதிரி CSV பதிவிறக்கு' : 'Download Sample CSV'}</span>
              </button>
              <button
                onClick={handleExportCurrent}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'ta' ? 'ஏற்றுமதி செய் (Export)' : 'Export CSV'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {successBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 1: CSV IMPORT / EXPORT WITH ALL REQUESTED MODELS                */}
      {/* ========================================================================= */}
      {viewMode === 'csv_io' && (
        <div className="space-y-5">
          {/* Dataset Model Selection Tabs (Full 10 Dedicated Models including Land) */}
          <div className="p-1.5 bg-slate-200/80 rounded-2xl flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'families', labelTa: '👨‍👩‍👧‍👦 குடும்பங்கள் (உறவுகளுடன்)', labelEn: 'Family Units (Relationships)', color: 'bg-emerald-800 text-white' },
              { id: 'elderly', labelTa: '👵 முதியோர் பதிவு (Elderly)', labelEn: 'Elderly CSV', color: 'bg-purple-800 text-white' },
              { id: 'pregnant', labelTa: '🤰 கர்ப்பிணிப் பதிவு (Maternity)', labelEn: 'Maternity CSV', color: 'bg-pink-800 text-white' },
              { id: 'disability', labelTa: '♿ அங்கவீனர் பதிவு (Disability)', labelEn: 'Disability CSV', color: 'bg-blue-800 text-white' },
              { id: 'aswesuma', labelTa: '🌾 அஸ்வெசும நலன்புரி (Aswesuma)', labelEn: 'Aswesuma CSV', color: 'bg-amber-700 text-white' },
              { id: 'beneficiaries', labelTa: '👥 பிரஜைகள் (All Citizens)', labelEn: 'Citizens CSV', color: 'bg-teal-800 text-white' },
              { id: 'assistance', labelTa: '🎁 நிவாரணம் & உதவி வழங்கல்', labelEn: 'Relief Aid CSV', color: 'bg-rose-800 text-white' },
              { id: 'land', labelTa: '🗺️ காணிப் பதிவுகள் (Land Records)', labelEn: 'Land Permits CSV', color: 'bg-emerald-900 text-white' },
              { id: 'users', labelTa: '👔 உத்தியோகத்தர்கள் (Staff)', labelEn: 'Staff Users CSV', color: 'bg-slate-800 text-white' },
              { id: 'divisions', labelTa: '🏛️ பிரிவுகள் (Divisions)', labelEn: 'GN Divisions', color: 'bg-slate-800 text-white' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveType(tab.id as ActiveCsvType);
                  setParsedPreview([]);
                  setParsedDuplicates([]);
                  setParsedPregnantMothers([]);
                  setParseErrors([]);
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
                  activeType === tab.id ? `${tab.color} shadow-xs` : 'text-slate-700 hover:bg-white/70'
                }`}
              >
                {lang === 'ta' ? tab.labelTa : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Model Description & Upload Box */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>📥</span>
                  <span>
                    {activeType === 'families'
                      ? lang === 'ta' ? 'குடும்பங்கள் & உறவுமுறை சிஎஸ்வி மாதிரி (Family Code & Relationship Model)' : 'Family Units & Relationships Model'
                      : activeType === 'elderly'
                      ? lang === 'ta' ? 'முதியோர் பதிவு சிஎஸ்வி மாதிரி (Senior Citizens CSV Model)' : 'Senior Citizens CSV Model'
                      : activeType === 'pregnant'
                      ? lang === 'ta' ? 'கர்ப்பிணித் தாய்மார் பதிவு சிஎஸ்வி மாதிரி (Maternity & Nutrition Stamps Model)' : 'Pregnant Mothers & Nutrition Stamps Model'
                      : activeType === 'disability'
                      ? lang === 'ta' ? 'அங்கவீனர் / மாற்றுத்திறனாளி சிஎஸ்வி மாதிரி (Disability Rights Model)' : 'Disability Rights CSV Model'
                      : activeType === 'aswesuma'
                      ? lang === 'ta' ? 'அஸ்வெசும நலன்புரி சிஎஸ்வி மாதிரி (Aswesuma Poverty Relief Model)' : 'Aswesuma Poverty Relief Model'
                      : activeType === 'assistance'
                      ? lang === 'ta' ? 'நிவாரண உதவி வழங்கல் சிஎஸ்வி மாதிரி (இரட்டை உதவி தடுப்புடன்)' : 'Aid Distribution CSV with Duplicate Prevention'
                      : activeType === 'land'
                      ? lang === 'ta' ? 'காணி உறுதி & அனுமதிப்பத்திர மாதிரி (Land Permits & LDO Model)' : 'Land Permits & Grants Model'
                      : activeType === 'beneficiaries'
                      ? lang === 'ta' ? 'முழுமையான பிரஜைகள் சிஎஸ்வி மாதிரி' : 'General Citizens CSV Model'
                      : lang === 'ta' ? 'அலுவலக சிஎஸ்வி மாதிரி' : 'Staff / Division CSV Model'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activeType === 'land'
                    ? (lang === 'ta'
                        ? 'காணி அனுமதிப்பத்திரம் (Permit), LDO மானியம், காணித் துண்டு எண், பரப்பு (ஏக்கர்/றூட்/பேர்ச்) விபரங்கள் பதிவு செய்யப்படும்.'
                        : 'Land permits, LDO grants, plot lot numbers, and extent (Acres/Roods/Perches) are recorded.')
                    : (lang === 'ta'
                        ? 'ஒவ்வொரு பதிவிலும் குடும்பத்திற்கு பொதுவான Family QR எண் மற்றும் உறவுநிலை கேட்கப்பட்டு ஒரே குடும்பமாக இணைக்கப்படும்.'
                        : 'Each record links to a shared Family QR Code and relationship role connecting the whole household.')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
                  {lang === 'ta' ? 'பதிவுகள்:' : 'Total:'} <span className="font-mono text-emerald-800 font-extrabold">{currentCategoryItems.length}</span>
                </span>

                <button
                  onClick={handleDownloadSample}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{lang === 'ta' ? 'மாதிரி கோப்பை பதிவிறக்கு' : 'Download Sample CSV'}</span>
                </button>

                {isSuperAdmin && currentCategoryItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllActiveCategory}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs transition-colors"
                    title={lang === 'ta' ? 'இப்பிரிவின் அனைத்து விபரங்களையும் நிரந்தரமாக அழி (Super Admin)' : 'Permanently wipe all records in this category'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'ta' ? 'இப்பிரிவை முழுமையாக அழி' : 'Wipe Category Data'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Requirement 06: Unique Computer-Generated ID & Assistance Title Input Section */}
            {activeType === 'assistance' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>
                        {lang === 'ta'
                          ? '06. உதவிக்கான தலைப்பு & கணினியின் தனித்துவ அடையாள எண் (Batch ID)'
                          : 'Assistance Program Title & Unique Batch ID'}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssistanceBatchId(`AID-PRG-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded text-[11px] font-bold shadow-2xs transition-colors"
                  >
                    🔄 {lang === 'ta' ? 'புதிய ID உருவாக்கு' : 'Generate New ID'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="lg:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">
                      {lang === 'ta' ? 'குறித்த உதவிக்கான தலைப்பு (Program Title):' : 'Assistance Program Title:'}
                    </label>
                    <input
                      type="text"
                      value={assistanceProgramTitle}
                      onChange={(e) => setAssistanceProgramTitle(e.target.value)}
                      placeholder="எ.கா: 2026 வெள்ள நிவாரண உதவி கட்டம் 1"
                      className="w-full px-3 py-1.5 border border-rose-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {lang === 'ta' ? 'கணினி தனித்துவ இலக்கம் (Batch ID):' : 'Unique Program ID:'}
                    </label>
                    <input
                      type="text"
                      value={assistanceBatchId}
                      onChange={(e) => setAssistanceBatchId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-rose-300 rounded-lg bg-white font-mono font-bold text-rose-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {lang === 'ta' ? 'வழங்கும் திகதி:' : 'Distribution Date:'}
                    </label>
                    <input
                      type="date"
                      value={assistanceDate}
                      onChange={(e) => setAssistanceDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-rose-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-rose-800">
                  {lang === 'ta'
                    ? '💡 நீங்கள் அப்லோட் செய்யும் சிஎஸ்வி கோப்பில் உள்ள அனைத்து பதிவுகளுக்கும் இந்த தலைப்பும் தனித்துவ கணினி இலக்கமும் தானாக ஒதுக்கப்பட்டு இரட்டை உதவிகள் சரிபார்க்கப்படும்.'
                    : '💡 All records in your uploaded CSV will be stamped with this Program Title and Unique ID, and checked against previous relief distributions.'}
                </p>
              </div>
            )}

            {/* File Upload Selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
              />
              {fileName && (
                <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
                  📄 {fileName}
                </span>
              )}
            </div>

            {parseErrors.length > 0 && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>{lang === 'ta' ? 'கண்டறியப்பட்ட பிழைகள்:' : 'CSV Parsing Warnings:'}</span>
                </div>
                {parseErrors.map((err, idx) => (
                  <div key={idx} className="text-[11px]">• {err}</div>
                ))}
              </div>
            )}
          </div>

          {/* PARSED PREVIEW FOR CITIZENS / FAMILIES / ELDERLY / PREGNANT / DISABILITY / ASWESUMA */}
          {activeType !== 'assistance' && parsedPreview.length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {lang === 'ta'
                        ? `சரிபார்க்கப்பட்ட பதிவுகள் (${parsedPreview.length}) - முன்னோட்டம்`
                        : `Verified Records (${parsedPreview.length}) - Preview`}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ta'
                      ? 'கீழே உள்ள விபரங்களை சரிபார்த்து "தரவுத்தளத்தில் இணைக்க" பொத்தானை அழுத்தவும்.'
                      : 'Review the parsed members and their family relationship linkages below before committing.'}
                  </p>
                </div>

                <button
                  onClick={() => handleCommitImport(false)}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'ta' ? '✅ தரவுத்தளத்தில் இணைக்க (Commit Import)' : 'Commit Import to Database'}</span>
                </button>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
                {activeType === 'land' ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">அனுமதிப்பத்திர எண்</th>
                        <th className="p-2.5">காணி வகை</th>
                        <th className="p-2.5">உரிமையாளர் பெயர் & NIC</th>
                        <th className="p-2.5">காணி அமைவிடம் / துண்டு</th>
                        <th className="p-2.5">பரப்பு</th>
                        <th className="p-2.5">நிலை</th>
                        <th className="p-2.5">பிரிவு</th>
                        <th className="p-2.5 text-right">நீக்கு</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPreview.map((row: any, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-emerald-950">
                            {row.permitNo || row.id}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                              {row.landType}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{row.ownerNameTa}</div>
                            <div className="text-[10px] font-mono text-slate-500">{row.ownerNic}</div>
                          </td>
                          <td className="p-2.5 text-slate-700">
                            <div>{row.landAddress}</div>
                            {row.plotLotNumber && <div className="text-[10px] text-slate-500 font-mono">Lot: {row.plotLotNumber}</div>}
                          </td>
                          <td className="p-2.5 font-mono text-slate-800">
                            {row.extentAcres || 0}A {row.extentRoods || 0}R {row.extentPerches || 0}P
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900">
                              {row.permitStatus}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">{row.divisionCode}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemovePreviewRow(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                              title={lang === 'ta' ? 'இப்பதிவை நீக்கு' : 'Remove row'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">குடும்ப QR / Code</th>
                        <th className="p-2.5">குடும்ப உறவுநிலை</th>
                        <th className="p-2.5">அடையாள அட்டை (NIC)</th>
                        <th className="p-2.5">பெயர்</th>
                        <th className="p-2.5">வயது</th>
                        <th className="p-2.5">நலன்புரி உதவிகள் (Checklist)</th>
                        <th className="p-2.5">பிரிவு</th>
                        <th className="p-2.5 text-right">நீக்கு</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedPreview.map((row, idx) => {
                        const relLabel = getRelationshipTamilLabel(row.familyRelationship);
                        const schemes: WelfareScheme[] = row.welfareSchemes || (row.welfareScheme ? [row.welfareScheme] : []);
                        const age = calculateAge(row.dob, row.nic);

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-emerald-950">
                              <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {row.familyCode || 'FAM-GEN'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[11px] font-bold">
                                {relLabel}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-800 font-semibold">{row.nic}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">{row.nameTa}</div>
                              <div className="text-[10px] text-slate-500">{row.nameEn}</div>
                            </td>
                            <td className="p-2.5 font-mono text-slate-700">
                              {age > 0 ? `${age} yrs` : '-'}
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1">
                                {schemes.length > 0
                                  ? schemes.map((s) => getWelfareBadge(s))
                                  : <span className="text-[10px] text-slate-400 italic">None</span>}
                              </div>
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">{row.divisionCode}</td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePreviewRow(idx)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                                title={lang === 'ta' ? 'இப்பதிவை நீக்கு' : 'Remove row'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* PREVIEW: ASSISTANCE DISTRIBUTION (WITH DUPLICATE ENGINE) */}
          {activeType === 'assistance' && (parsedPreview.length > 0 || parsedDuplicates.length > 0) && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-950 border border-rose-300 rounded-lg font-mono font-bold">
                    <span>🏷️</span>
                    <span>{assistanceBatchId}</span>
                    <span className="text-rose-800 font-sans font-medium text-[11px] truncate max-w-[200px]">
                      ({assistanceProgramTitle})
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full font-bold">
                    🟢 {parsedPreview.length} {lang === 'ta' ? 'தகுதியான புதிய உதவிகள்' : 'Eligible First-Time Aid'}
                  </span>
                  {parsedDuplicates.length > 0 && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-900 rounded-full font-bold">
                      ⚠️ {parsedDuplicates.length} {lang === 'ta' ? 'இரட்டை உதவி எச்சரிக்கை!' : 'Duplicate Aid Detected!'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleCommitImport(false)}
                    disabled={parsedPreview.length === 0}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {lang === 'ta'
                        ? '✅ இரட்டை உதவிகளைத் தடுத்து தகுதியானவர்களை மட்டும் பதிவேற்று'
                        : 'Filter Duplicates & Import Eligible Only'}
                    </span>
                  </button>

                  {parsedDuplicates.length > 0 && (
                    <button
                      onClick={() => handleCommitImport(true)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors"
                    >
                      {lang === 'ta' ? 'விதிவிலக்காக அனைத்தையும் பதிவேற்று' : 'Force Import All (Override)'}
                    </button>
                  )}
                </div>
              </div>

              {/* Duplicates Alert Table */}
              {parsedDuplicates.length > 0 && (
                <div className="bg-red-50/80 border border-red-300 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-950">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>
                      {lang === 'ta'
                        ? `⚠️ பின்வரும் ${parsedDuplicates.length} குடும்பங்களுக்கு ஏற்கனவே சமீபத்தில் உதவி வழங்கப்பட்டுள்ளது (தொடர் உதவி தடுப்பு எச்சரிக்கை):`
                        : `⚠️ The following ${parsedDuplicates.length} families have received aid recently:`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs bg-white rounded-xl overflow-hidden border border-red-200">
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
                        {parsedDuplicates.map((rec) => (
                          <tr key={rec.id} className="hover:bg-red-50/50">
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
            </div>
          )}

          {/* ========================================================================= */}
          {/* CURRENTLY REGISTERED RECORDS FOR THIS SECTION WITH SUPER ADMIN DELETION   */}
          {/* ========================================================================= */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs">📋</span>
                  <span>
                    {lang === 'ta'
                      ? `தற்போது தரவுத்தளத்தில் உள்ள பதிவுகள் (${currentCategoryItems.length})`
                      : `Currently Stored Records in this Category (${currentCategoryItems.length})`}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'ta'
                    ? 'சிஎஸ்வி அல்லது படிவங்கள் மூலம் ஏற்கனவே பதிவான விபரங்கள். தேவையற்ற பதிவுகளை இங்கிருந்தும் நிரந்தரமாக நீக்கலாம்.'
                    : 'Records previously imported via CSV or added manually. Super Admins can permanently delete single or bulk entries.'}
                </p>
              </div>

              {canDelete && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedRegisteredIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkDeleteRegistered}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'ta'
                          ? `தெரிவுசெய்தவற்றை நீக்கு (${selectedRegisteredIds.length})`
                          : `Delete Selected (${selectedRegisteredIds.length})`}
                      </span>
                    </button>
                  )}

                  {isSuperAdmin && currentCategoryItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllActiveCategory}
                      className="px-3.5 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>{lang === 'ta' ? 'அனைத்தையும் அழி (Clear Category)' : 'Clear Entire Category'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {currentCategoryItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                {lang === 'ta' ? 'இப்பிரிவில் தற்போது எவ்வித பதிவுகளும் இல்லை.' : 'No records currently registered in this section.'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[460px] border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 text-[11px] uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      {canDelete && (
                        <th className="p-2.5 w-10 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedRegisteredIds.length === currentCategoryItems.length) {
                                setSelectedRegisteredIds([]);
                              } else {
                                setSelectedRegisteredIds(currentCategoryItems.map((c: any) => c.id || c.nic || c.permitNo));
                              }
                            }}
                            className="p-1 hover:text-emerald-700"
                            title="Select All"
                          >
                            {selectedRegisteredIds.length === currentCategoryItems.length && currentCategoryItems.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">அடையாளம் / குறியீடு</th>
                      <th className="p-2.5">பெயர் / விபரம்</th>
                      <th className="p-2.5">தேசிய அடையாள அட்டை (NIC)</th>
                      <th className="p-2.5">வயது / திகதி</th>
                      <th className="p-2.5">பிரிவு / நிலை</th>
                      {canDelete && <th className="p-2.5 text-right">நீக்குக</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentCategoryItems.slice(0, 100).map((item: any, idx: number) => {
                      const itemKey = item.id || item.nic || item.permitNo || String(idx);
                      const isChecked = selectedRegisteredIds.includes(itemKey);
                      const age = item.dob || item.nic ? calculateAge(item.dob, item.nic) : null;

                      return (
                        <tr key={itemKey} className={isChecked ? 'bg-rose-50/50' : 'hover:bg-slate-50/80'}>
                          {canDelete && (
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRegisteredIds((prev) => [...prev, itemKey]);
                                  } else {
                                    setSelectedRegisteredIds((prev) => prev.filter((id) => id !== itemKey));
                                  }
                                }}
                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-slate-800">
                            {item.familyCode || item.permitNo || item.batchId || item.id}
                          </td>
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">
                              {item.nameTa || item.ownerNameTa || item.motherNameTa || item.beneficiaryName || item.nameEn || '-'}
                            </div>
                            {(item.nameEn || item.aidDescription) && (
                              <div className="text-[10px] text-slate-500">
                                {item.aidDescription || item.nameEn}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 font-semibold">
                            {item.nic || item.ownerNic || item.motherNic || item.beneficiaryNic || '-'}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700">
                            {age !== null && age > 0 ? (
                              <span className="font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {age} {lang === 'ta' ? 'வயது' : 'yrs'}
                              </span>
                            ) : (
                              item.distributionDate || item.registrationDate || '-'
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                              {item.divisionCode || item.permitStatus || item.status || 'Active'}
                            </span>
                          </td>
                          {canDelete && (
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleRegistered(item)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors"
                                title={lang === 'ta' ? 'இப்பதிவை நிரந்தரமாக அழி' : 'Delete permanently'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {currentCategoryItems.length > 100 && (
                  <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
                    {lang === 'ta'
                      ? `மொத்தம் ${currentCategoryItems.length} பதிவுகளில் முதல் 100 பதிவுகள் காட்டப்படுகின்றன.`
                      : `Showing first 100 of ${currentCategoryItems.length} records.`}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: CONNECTED FAMILY UNITS VISUALIZER (தாய், தந்தை, மகன், மகள்)   */}
      {/* ========================================================================= */}
      {viewMode === 'family_visualizer' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={lang === 'ta' ? 'குடும்ப QR எண், தந்தை/தாய் பெயர், NIC மூலம் தேடுக...' : 'Search Family Code, Parent Name, NIC...'}
                value={familySearchQuery}
                onChange={(e) => setFamilySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={familyDivisionFilter}
                onChange={(e) => setFamilyDivisionFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="ALL">🏛️ {lang === 'ta' ? 'அனைத்து பிரிவுகளும்' : 'All Divisions'}</option>
                {divisions.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} - {d.nameTa}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-3 py-2 rounded-xl">
                {familyGroups.length} {lang === 'ta' ? 'குடும்பங்கள்' : 'Families'}
              </span>
            </div>
          </div>

          {/* Families Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyGroups.map(([fCode, members]) => {
              const divCode = members[0]?.divisionCode || '211';
              const divName = divisions.find((d) => d.code === divCode)?.nameTa || divCode;
              const head = members.find((m) => m.familyHead || m.familyRelationship === 'HEAD' || m.familyRelationship === 'FATHER') || members[0];

              return (
                <div
                  key={fCode}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 p-4 sm:p-5 shadow-xs transition-all space-y-3"
                >
                  {/* Family Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-mono font-bold text-slate-900 text-sm">{fCode}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                            {divCode} - {divName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {lang === 'ta' ? 'தலைவர்:' : 'Head:'} <strong className="text-slate-800">{head?.nameTa}</strong> ({members.length} {lang === 'ta' ? 'உறுப்பினர்கள்' : 'members'})
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedFamilyCodeForModal(fCode)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{lang === 'ta' ? 'குடும்ப மரம் & QR' : 'Tree & QR'}</span>
                    </button>
                  </div>

                  {/* Connected Members List: தந்தை, தாய், மகன், மகள் */}
                  <div className="space-y-1.5">
                    {members.map((m) => {
                      const relLabel = getRelationshipTamilLabel(m.familyRelationship);
                      const age = calculateAge(m.dob);
                      const schemes: WelfareScheme[] = m.welfareSchemes || (m.welfareScheme && m.welfareScheme !== 'NONE' ? [m.welfareScheme] : []);

                      return (
                        <div
                          key={m.id}
                          className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {m.familyRelationship === 'FATHER' ? '👨' : m.familyRelationship === 'MOTHER' ? '👩' : m.familyRelationship === 'SON' ? '👦' : m.familyRelationship === 'DAUGHTER' ? '👧' : m.gender === 'FEMALE' ? '👩' : '👨'}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <strong className="text-slate-900">{m.nameTa}</strong>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                  {relLabel}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {m.nic} · {age} {lang === 'ta' ? 'வயது' : 'yrs'}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                            {schemes.slice(0, 2).map((s) => getWelfareBadge(s))}
                            {schemes.length > 2 && (
                              <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                +{schemes.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Family Tree Modal */}
      {selectedFamilyCodeForModal && (
        <FamilyGroupModal
          familyCode={selectedFamilyCodeForModal}
          allBeneficiaries={beneficiaries}
          divisions={divisions}
          lang={lang}
          onClose={() => setSelectedFamilyCodeForModal(null)}
        />
      )}
    </div>
  );
};
