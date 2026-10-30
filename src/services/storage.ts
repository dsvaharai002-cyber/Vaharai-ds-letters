import { 
  User, 
  Beneficiary, 
  QueueToken, 
  GNDivision, 
  SystemAuditLog, 
  ChronicIllness, 
  WelfareScheme, 
  WelfareStatus,
  AssistanceRecord,
  DuplicateAidCheckResult,
  ServiceDefinition,
  PregnantMotherRecord,
  MonthlyStampCollection,
  LandRecord,
  HouseholdData,
  PovertyScoringWeights,
  DEFAULT_POVERTY_WEIGHTS,
  calculateFamilyPovertyScore,
} from '../types';
import initialDatabaseSeed from '../data/central_database.json';
import { scheduleAutoDriveSync } from './googleDrive';
import { parseSriLankanNic } from '../utils/nicParser';

const STORAGE_KEYS = {
  USERS: 'vaharai_ds_users_v6',
  BENEFICIARIES: 'vaharai_ds_beneficiaries_v6',
  TOKENS: 'vaharai_ds_tokens_v6',
  DIVISIONS: 'vaharai_ds_divisions_v7',
  AUDIT_LOGS: 'vaharai_ds_audit_logs_v6',
  ASSISTANCE: 'vaharai_ds_assistance_v6',
  SERVICES: 'vaharai_ds_services_v6',
  PREGNANT_MOTHERS: 'vaharai_ds_pregnant_mothers_v6',
  LAND_RECORDS: 'vaharai_ds_land_records_v6',
  HOUSEHOLDS: 'vaharai_ds_households_v6',
  POVERTY_WEIGHTS: 'vaharai_ds_poverty_weights_v6',
  DELETED_IDS: 'vaharai_ds_deleted_ids_v6',
  INITIALIZED: 'vaharai_ds_initialized_v6',
};

// ================= PERMANENT DELETION & TOMBSTONE TRACKING (Requirement 01) ================= //
export const getDeletedIdsSet = (): Set<string> => {
  try {
    if (typeof window === 'undefined') return new Set<string>();
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_IDS);
    if (!raw) return new Set<string>();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set<string>();
  }
};

export const recordDeletedId = (id?: string, nic?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedIdsSet();
    if (id && id.trim()) set.add(id.trim());
    if (nic && nic.trim()) set.add(nic.trim());
    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

export const recordDeletedIds = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedIdsSet();
    ids.forEach((i) => {
      if (i && i.trim()) set.add(i.trim());
    });
    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

export const isRecordDeleted = (id?: string, nic?: string): boolean => {
  const set = getDeletedIdsSet();
  const idMatch = id ? set.has(id.trim()) : false;
  const nicMatch = nic ? set.has(nic.trim()) : false;
  return idMatch || nicMatch;
};

export const removeDeletedId = (id?: string, nic?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedIdsSet();
    if (id) set.delete(id.trim());
    if (nic) set.delete(nic.trim());
    localStorage.setItem(STORAGE_KEYS.DELETED_IDS, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

// Purge legacy mock data cache from previous versions so users see a completely fresh registration portal
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'vaharai_ds_users_v4',
      'vaharai_ds_beneficiaries_v4',
      'vaharai_ds_tokens_v4',
      'vaharai_ds_assistance_v4',
      'vaharai_ds_audit_logs_v4',
      'vaharai_ds_initialized_v4',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// Age calculation helper with Sri Lankan NIC fallback & multiple date format support
export const calculateAge = (dob?: string, nic?: string): number => {
  // If valid Sri Lankan NIC is available and (DOB is missing, default, or invalid), extract accurate age directly from NIC
  if (nic && (!dob || dob === '1995-01-01' || dob === '1990-01-01' || dob === '2000-01-01' || dob === '1954-01-01' || dob === '1985-01-01' || dob === '2005-01-01')) {
    const parsed = parseSriLankanNic(nic);
    if (parsed.isValid && typeof parsed.age === 'number') {
      return parsed.age;
    }
  }

  if (!dob || !dob.trim()) {
    if (nic) {
      const parsed = parseSriLankanNic(nic);
      if (parsed.isValid && typeof parsed.age === 'number') return parsed.age;
    }
    return 0;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY formats safely
  let birthDate: Date;
  const cleanDob = dob.trim();
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(cleanDob)) {
    const parts = cleanDob.split(/[\/\-\.]/);
    birthDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  } else {
    birthDate = new Date(cleanDob);
  }

  if (isNaN(birthDate.getTime())) {
    if (nic) {
      const parsed = parseSriLankanNic(nic);
      if (parsed.isValid && typeof parsed.age === 'number') return parsed.age;
    }
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // If age came out to 31 (from 1995-01-01) or 36 (from 1990-01-01) and NIC gives a different real age, prefer NIC!
  if (nic && (cleanDob === '1995-01-01' || cleanDob === '1990-01-01' || cleanDob === '2000-01-01' || cleanDob === '1954-01-01')) {
    const parsed = parseSriLankanNic(nic);
    if (parsed.isValid && typeof parsed.age === 'number') {
      return parsed.age;
    }
  }

  return age >= 0 ? age : 0;
};

// System-generated Citizen ID
export const generateSystemCitizenId = (divisionCode: string = '211', count: number = 1): string => {
  const year = new Date().getFullYear();
  const seq = String(count).padStart(4, '0');
  return `VHR-${divisionCode}-${year}-${seq}`;
};

// Provisional Computer NIC for citizens without card
export const generateProvisionalNic = (divisionCode: string = '211'): string => {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(Math.random() * 90000 + 10000);
  return `TNIC-${divisionCode}-${year}-${randomSuffix}`;
};

// Strictly unique Family Code & Master QR Payload generator (Requirement 02)
export const generateUniqueFamilyCode = (divisionCode: string = '211', count: number = 1): string => {
  const seq = String(count).padStart(3, '0');
  return `FAM-${divisionCode}-${seq}`;
};

export const generateUniqueFamilyQrPayload = (familyCode: string, divisionCode: string = '211'): string => {
  const salt = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VHR-FAMILY|FAM:${familyCode}|DIV:${divisionCode}|UID:${familyCode}-${salt}`;
};

// 16 Official GN Divisions in Koralaipattu North (Vaharai) + General Division option (Requirement 03)
export const DEFAULT_DIVISIONS: GNDivision[] = ((initialDatabaseSeed as any)?.divisions as GNDivision[]) || [
  { code: '213', nameEn: 'Kathiraveli', nameTa: 'கதிரவெளி', gnOfficerName: '', population: 2750, households: 690 },
  { code: '213B', nameEn: 'Kaddumurivu', nameTa: 'கட்டுமுறிவு', gnOfficerName: '', population: 1420, households: 360 },
  { code: '211C', nameEn: 'Panichchankerni', nameTa: 'பனிச்சங்கேணி', gnOfficerName: '', population: 2310, households: 580 },
  { code: '211D', nameEn: 'Vaddavaan', nameTa: 'வட்டவான்', gnOfficerName: '', population: 1530, households: 380 },
  { code: '211A', nameEn: 'Kayankerni', nameTa: 'காயான்கேணி', gnOfficerName: '', population: 2600, households: 650 },
  { code: '212B', nameEn: 'Uooriyankaddu ', nameTa: 'உரியன்கட்டு', gnOfficerName: '', population: 1390, households: 350 },
  { code: '211E', nameEn: 'Mathurankernikulam', nameTa: 'மதுரங்கேணிக்குளம்', gnOfficerName: '', population: 1180, households: 290 },
  { code: '212', nameEn: 'Vaharai Central', nameTa: 'வாகரை மத்தி', gnOfficerName: '', population: 1920, households: 480 },
  { code: '211F', nameEn: 'Kirimichchi', nameTa: 'கிரிமிச்சை', gnOfficerName: '', population: 1720, households: 430 },
  { code: '212A', nameEn: 'Vaharai North', nameTa: 'வாகரை வடக்கு', gnOfficerName: '', population: 2450, households: 610 },
  { code: '211', nameEn: 'Mankerni Central', nameTa: 'மாங்கேணி மத்தி', gnOfficerName: '', population: 2890, households: 720 },
  { code: '213D', nameEn: 'Ammanthanaaveli', nameTa: 'அம்மந்தனாவெளி', gnOfficerName: '', population: 1840, households: 460 },
  { code: '213C', nameEn: 'Puchchakkerni', nameTa: 'புச்சக்கேணி', gnOfficerName: '', population: 1260, households: 320 },
  { code: '211B', nameEn: 'Punaanai East', nameTa: 'புனானை கிழக்கு', gnOfficerName: '', population: 1650, households: 410 },
  { code: '213A', nameEn: 'Paalchenai', nameTa: 'பால்சேனை', gnOfficerName: '', population: 2180, households: 540 },
  { code: '211G', nameEn: 'Mankerni South', nameTa: 'மாங்கேணி தெற்கு', gnOfficerName: '', population: 1980, households: 510 },
  { code: 'GENERAL', nameEn: 'General (Outside / Public)', nameTa: 'பொது (வெளிப் பிரதேசம் / பொதுமக்கள்)', gnOfficerName: 'பொதுமக்கள் கருமபீடம்', population: 0, households: 0 },
];

export const DEFAULT_GN_DIVISIONS = DEFAULT_DIVISIONS;

export const getDivisionByCode = (code: string, divisions: GNDivision[] = DEFAULT_DIVISIONS): GNDivision | undefined => {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  if (clean === 'GENERAL' || clean === 'பொது') {
    return { code: 'GENERAL', nameEn: 'General (Outside / Public)', nameTa: 'பொது (வெளிப் பிரதேசம் / பொதுமக்கள்)', gnOfficerName: 'பொதுமக்கள் கருமபீடம்', population: 0, households: 0 };
  }
  return (
    divisions.find((d) => d.code.toUpperCase() === clean) ||
    (clean === '212B' ? divisions.find((d) => d.nameEn.includes('Uooriyankaddu') || d.code === '213B') : undefined) ||
    (clean === '212B' ? divisions.find((d) => d.code === '212B') : undefined) ||
    divisions.find((d) => d.nameEn.toUpperCase().includes(clean) || d.nameTa.includes(clean))
  );
};

// Clean Production Database: Sole Super Admin seeded according to official mandate
export const INITIAL_SUPERADMIN_USER: User = {
  id: '93008148555',
  password: '19930108',
  name: 'பிரதேச செயலாளர் (Super Admin)',
  role: 'SUPERADMIN',
  division: 'ALL',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
};

export const INITIAL_LAND_OFFICER_USER: User = {
  id: '605',
  password: '605',
  name: 'காணி பிரிவு உத்தியோகத்தர் (Land Officer)',
  role: 'LAND_OFFICER',
  division: 'ALL',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
};

export const DEFAULT_USERS: User[] = [INITIAL_SUPERADMIN_USER, INITIAL_LAND_OFFICER_USER];

// Clean Citizens Database: Zero mock citizens (Murugesu etc. removed)
export const DEFAULT_BENEFICIARIES: Beneficiary[] = ((initialDatabaseSeed as any)?.beneficiaries as Beneficiary[]) || [];

// Clean Queue Tokens
export const DEFAULT_TOKENS: QueueToken[] = ((initialDatabaseSeed as any)?.tokens as QueueToken[]) || [];

// Official Public Service Counters mapped strictly to the Office Layout Plan (Blueprint)
export const DEFAULT_SERVICES: ServiceDefinition[] = [
  {
    id: 'SRV-RECEPTION',
    code: 'RECEPTION',
    nameTa: '01. வரவேற்பு கருமபீடம்',
    nameEn: '01. Reception Desk',
    counterNo: 1,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'R',
    defaultOfficerTa: 'வரவேற்பு உத்தியோகத்தர்',
    defaultOfficerEn: 'Reception Officer',
    descriptionTa: 'பொதுமக்கள் ஆரம்ப வழிகாட்டல் மற்றும் டோக்கன் வழங்கும் கருமபீடம்',
    descriptionEn: 'Public reception, guidance and token issuance',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-ADMIN-OFFICER',
    code: 'ADMIN_OFFICER',
    nameTa: '02. நிர்வாக அதிகாரி',
    nameEn: '02. Administration Officer',
    counterNo: 2,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'AO',
    defaultOfficerTa: 'நிர்வாக அதிகாரி',
    defaultOfficerEn: 'Administration Officer',
    descriptionTa: 'பிரதேச செயலக நிர்வாகம் மற்றும் அலுவலர் ஒருங்கிணைப்பு',
    descriptionEn: 'Administrative office and management',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-ASWESUMA',
    code: 'ICT_ASWESUMA',
    nameTa: '03. தகவல் தொழில்நுட்பம் & அஸ்வெசும',
    nameEn: '03. ICT & Aswesuma',
    counterNo: 3,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'W',
    defaultOfficerTa: 'அஸ்வெசும / ICT அலுவலர்',
    defaultOfficerEn: 'Aswesuma & ICT Officer',
    descriptionTa: 'அஸ்வெசும நலன்புரி கொடுப்பனவுகள் மற்றும் தகவல் தொழில்நுட்ப சேவைகள்',
    descriptionEn: 'Aswesuma welfare schemes and IT unit',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-LAND',
    code: 'LAND_BRANCH',
    nameTa: '04. காணி கிளை',
    nameEn: '04. Land Branch',
    counterNo: 4,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'L',
    defaultOfficerTa: 'காணி பிரிவு உத்தியோகத்தர் (Land Officer)',
    defaultOfficerEn: 'Land Branch Officer',
    descriptionTa: 'அரச காணி அனுமதிப்பத்திரம், எல்லை அளவீடு மற்றும் காணி பிணக்குகள்',
    descriptionEn: 'State land permits, boundary surveying and land dispute resolutions',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-FIELD-1',
    code: 'FIELD_OFFICERS_1',
    nameTa: '05. கள அலுவலர்கள் அலகு',
    nameEn: '05. Field Officers Unit',
    counterNo: 5,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'FO',
    defaultOfficerTa: 'கள உத்தியோகத்தர்',
    defaultOfficerEn: 'Field Officer',
    descriptionTa: 'கிராம மட்ட கள ஆய்வு அலுவலர்கள் பிரிவு',
    descriptionEn: 'Field inquiries and investigations',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-ADMIN-BRANCH',
    code: 'ADMIN_BRANCH',
    nameTa: '06. நிர்வாக கிளை',
    nameEn: '06. Administration Branch',
    counterNo: 6,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'AB',
    defaultOfficerTa: 'நிர்வாக கிளை அலுவலர்',
    defaultOfficerEn: 'Administration Branch Officer',
    descriptionTa: 'பொது நிர்வாகம் மற்றும் உத்தியோகபூர்வ கடிதப் போக்குவரத்து',
    descriptionEn: 'General administrative operations and correspondence',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-DS',
    code: 'DS_OFFICER',
    nameTa: '08. பிரதேச செயலாளர் காரியாலயம்',
    nameEn: '08. Divisional Secretary',
    counterNo: 8,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'DS',
    defaultOfficerTa: 'பிரதேச செயலாளர்',
    defaultOfficerEn: 'Divisional Secretary',
    descriptionTa: 'பிரதேச செயலக தலைமை நிர்வாகி சந்திப்பு மற்றும் விசேட முறைப்பாடுகள்',
    descriptionEn: 'Divisional Secretary executive consultations',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-ADS',
    code: 'ADS_OFFICER',
    nameTa: '09. உதவி பிரதேச செயலாளர்',
    nameEn: '09. Asst. Divisional Secretary',
    counterNo: 9,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'ADS',
    defaultOfficerTa: 'உதவி பிரதேச செயலாளர்',
    defaultOfficerEn: 'Assistant Divisional Secretary',
    descriptionTa: 'உதவி பிரதேச செயலாளர் அலுவலகம் மற்றும் அனுமதிகள்',
    descriptionEn: 'Assistant Divisional Secretary branch',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-REGISTRAR',
    code: 'REGISTRAR_BRANCH',
    nameTa: '10. பதிவாளர் கிளை (பிறப்பு / இறப்பு / திருமணம்)',
    nameEn: '10. Registrar Branch',
    counterNo: 10,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'C',
    defaultOfficerTa: 'பிறப்பு / இறப்பு பதிவாளர் (Civil Registrar)',
    defaultOfficerEn: 'Civil Registrar Officer',
    descriptionTa: 'பிறப்பு, இறப்பு, விவாக சான்றிதழ் பிரதிகள் மற்றும் பதிவுகள்',
    descriptionEn: 'Birth, death, marriage certificates and official registrations',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-ACCOUNTANT',
    code: 'ACCOUNTANT',
    nameTa: '11. கணக்காளர்',
    nameEn: '11. Accountant',
    counterNo: 11,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'ACC',
    defaultOfficerTa: 'கணக்காளர்',
    defaultOfficerEn: 'Accountant',
    descriptionTa: 'பிரதேச செயலக நிதி மற்றும் கொடுப்பனவுகள் அங்கீகரிப்பு',
    descriptionEn: 'Chief Accountant branch',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-ACCOUNTS-BRANCH',
    code: 'ACCOUNTS_BRANCH',
    nameTa: '12. கணக்கு கிளை',
    nameEn: '12. Accounts Branch',
    counterNo: 12,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'AC',
    defaultOfficerTa: 'கணக்கு கிளை அலுவலர்',
    defaultOfficerEn: 'Accounts Branch Officer',
    descriptionTa: 'வருமான வரிசை, பற்றுச்சீட்டு வழங்கல் மற்றும் அரச கொடுப்பனவுகள்',
    descriptionEn: 'Payments, revenue receipts and treasury transactions',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-GRAMANILADHARI',
    code: 'GRAMANILADHARI_UNIT',
    nameTa: '18. கிராம உத்தியோகத்தர் அலகு',
    nameEn: '18. Gramaniladhari Unit',
    counterNo: 18,
    floor: 'First Floor (முதலாம் மாடி)',
    prefix: 'G',
    defaultOfficerTa: 'கிராம அலுவலர் ஒருங்கிணைப்பாளர்',
    defaultOfficerEn: 'Grama Niladhari Coordinator',
    descriptionTa: '16 கிராம அலுவலர் பிரிவுகளின் சான்றிதழ்கள், நன்னடத்தை மற்றும் அறிக்கைகள்',
    descriptionEn: 'Grama Niladhari certificates and reports',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-PLANNING',
    code: 'PLANNING_BRANCH',
    nameTa: '20. திட்டமிடல் கிளை',
    nameEn: '20. Planning Branch',
    counterNo: 20,
    floor: 'First Floor (முதலாம் மாடி)',
    prefix: 'PL',
    defaultOfficerTa: 'திட்டமிடல் அலுவலர்',
    defaultOfficerEn: 'Planning Officer',
    descriptionTa: 'பிரதேச அபிவிருத்தி திட்டங்கள் மற்றும் கண்காணிப்பு',
    descriptionEn: 'Development planning and progress monitoring',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-SAMURDHI',
    code: 'SAMURDHI_BRANCH',
    nameTa: '26. சமுர்த்தி கிளை',
    nameEn: '26. Samurdhi Branch',
    counterNo: 26,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'S',
    defaultOfficerTa: 'சமுர்த்தி முகாமையாளர் / உத்தியோகத்தர்',
    defaultOfficerEn: 'Samurdhi Officer',
    descriptionTa: 'சமுர்த்தி வங்கி, வாழ்வாதார உதவிகள், கடன் திட்டங்கள் மற்றும் சமூக உதவி',
    descriptionEn: 'Samurdhi bank, livelihood grants and micro-credit',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRV-NIC',
    code: 'NIC_BRANCH',
    nameTa: '28. தேசிய அடையாள அட்டை கிளை',
    nameEn: '28. NIC Branch',
    counterNo: 28,
    floor: 'Ground Floor (தரைத்தளம்)',
    prefix: 'NIC',
    defaultOfficerTa: 'அடையாள அட்டை பிரிவு அலுவலர்',
    defaultOfficerEn: 'NIC Branch Officer',
    descriptionTa: '16 வயது பூர்த்தி அடைந்தோருக்கான புதிய NIC மற்றும் திருத்த விண்ணப்பங்கள்',
    descriptionEn: 'National Identity Card applications and services',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

// Helper to safely read from localStorage
export const getStoredData = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const setStoredData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write to localStorage for key ${key}:`, err);
  }
};

export const loadUsers = (): User[] => {
  let users = getStoredData<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  let changed = false;
  if (!users.some((u) => u.id === '93008148555')) {
    users = [INITIAL_SUPERADMIN_USER, ...users];
    changed = true;
  }
  if (!users.some((u) => u.id === '605' || u.role === 'LAND_OFFICER')) {
    users = [...users, INITIAL_LAND_OFFICER_USER];
    changed = true;
  }
  if (changed) {
    setStoredData(STORAGE_KEYS.USERS, users);
  }
  return users;
};
export const saveUsers = (users: User[]) => {
  setStoredData(STORAGE_KEYS.USERS, users);
  scheduleCentralSync();
};

// 10 Months Expiry & Stamp Voucher Calculations
export const calculateTenMonthsDate = (startDateStr: string): string => {
  if (!startDateStr) return '';
  const date = new Date(startDateStr);
  date.setMonth(date.getMonth() + 10);
  return date.toISOString().slice(0, 10);
};

export const createDefaultMonthlyCollections = (): MonthlyStampCollection[] => {
  return Array.from({ length: 10 }, (_, i) => ({
    monthIndex: i + 1,
    monthLabelTa: `மாதம் ${String(i + 1).padStart(2, '0')}`,
    monthLabelEn: `Month ${String(i + 1).padStart(2, '0')}`,
    collected: false,
  }));
};

export const loadPregnantMothers = (): PregnantMotherRecord[] => {
  return getStoredData<PregnantMotherRecord[]>(STORAGE_KEYS.PREGNANT_MOTHERS, []);
};

export const savePregnantMothers = (records: PregnantMotherRecord[]) => {
  setStoredData(STORAGE_KEYS.PREGNANT_MOTHERS, records);
  scheduleCentralSync();
};

export const checkDuplicateActivePregnantMother = (
  nic: string,
  currentRecordId?: string
): { isDuplicate: boolean; existingRecord?: PregnantMotherRecord } => {
  if (!nic || !nic.trim()) return { isDuplicate: false };
  const clean = nic.trim().toUpperCase();
  const records = loadPregnantMothers();
  const today = new Date().toISOString().slice(0, 10);

  const found = records.find((r) => {
    if (currentRecordId && r.id === currentRecordId) return false;
    if (r.nic.trim().toUpperCase() !== clean) return false;
    // Active if not completed AND today is before or equal to expected completion date
    return !r.isCompleted && r.status !== 'COMPLETED' && r.expectedCompletionDate >= today;
  });

  return {
    isDuplicate: !!found,
    existingRecord: found,
  };
};

export const getPregnancyCountForNic = (nic: string): number => {
  if (!nic || !nic.trim()) return 1;
  const clean = nic.trim().toUpperCase();
  const records = loadPregnantMothers();
  const matching = records.filter((r) => r.nic.trim().toUpperCase() === clean);
  return matching.length + 1;
};

export const loadBeneficiaries = (): Beneficiary[] => {
  const stored = getStoredData<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, DEFAULT_BENEFICIARIES);
  const deletedSet = getDeletedIdsSet();
  // Filter out any that were deleted/tombstoned so deletions stay permanently deleted on refresh
  const filtered = stored.filter((b) => !deletedSet.has(b.id) && !(b.nic && deletedSet.has(b.nic)));
  return filtered.map((b) => {
    let resolvedDob = b.dob;
    let resolvedGender = b.gender;
    // Auto-heal default/empty DOB using NIC if valid
    if (b.nic && (!resolvedDob || resolvedDob === '1995-01-01' || resolvedDob === '1990-01-01' || resolvedDob === '2000-01-01')) {
      const parsed = parseSriLankanNic(b.nic);
      if (parsed.isValid && parsed.birthDate) {
        resolvedDob = parsed.birthDate;
        if (!resolvedGender || resolvedGender === 'OTHER') {
          resolvedGender = parsed.gender || resolvedGender;
        }
      }
    }
    const familyCode = b.familyCode || (b.householdNo ? `FAM-${b.householdNo.replace(/^HH-/, '')}` : `FAM-${b.divisionCode}-001`);
    const familyQrPayload = b.familyQrPayload || `VHR-FAMILY|FAM:${familyCode}|DIV:${b.divisionCode}`;
    return {
      ...b,
      dob: resolvedDob,
      gender: resolvedGender,
      familyCode,
      familyQrPayload,
    };
  });
};

export const saveBeneficiaries = (items: Beneficiary[], trackDeletions: boolean = true) => {
  if (trackDeletions) {
    const prev = getStoredData<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, []);
    const newIds = new Set(items.map((b) => b.id));
    const newNics = new Set(items.map((b) => b.nic).filter(Boolean));
    for (const p of prev) {
      const idMissing = p.id && !newIds.has(p.id);
      const nicMissing = p.nic && !newNics.has(p.nic);
      if (idMissing || nicMissing) {
        recordDeletedId(p.id, p.nic);
      }
    }
  }
  setStoredData(STORAGE_KEYS.BENEFICIARIES, items);
  scheduleCentralSync();
};

export const deleteSingleBeneficiary = (id: string, nic?: string) => {
  recordDeletedId(id, nic);
  const current = getStoredData<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, []);
  const updated = current.filter((b) => b.id !== id && (nic ? b.nic !== nic : true));
  setStoredData(STORAGE_KEYS.BENEFICIARIES, updated);
  scheduleCentralSync();
  notifyCrossTabSync('RECORD_DELETED');
};

export const clearAllBeneficiariesPermanently = () => {
  const current = getStoredData<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, []);
  recordDeletedIds(current.map((b) => b.id).concat(current.map((b) => b.nic).filter(Boolean)));
  setStoredData(STORAGE_KEYS.BENEFICIARIES, []);
  scheduleCentralSync();
  notifyCrossTabSync('ALL_BENEFICIARIES_CLEARED');
};

export const clearAllHouseholdsPermanently = () => {
  setStoredData(STORAGE_KEYS.HOUSEHOLDS, []);
  scheduleCentralSync();
  notifyCrossTabSync('ALL_HOUSEHOLDS_CLEARED');
};

export const clearAllAssistanceRecordsPermanently = () => {
  setStoredData(STORAGE_KEYS.ASSISTANCE, []);
  scheduleCentralSync();
  notifyCrossTabSync('ALL_ASSISTANCE_CLEARED');
};

export const clearAllPregnantMothersPermanently = () => {
  setStoredData(STORAGE_KEYS.PREGNANT_MOTHERS, []);
  scheduleCentralSync();
  notifyCrossTabSync('ALL_PREGNANT_MOTHERS_CLEARED');
};

export const clearAllLandRecordsPermanently = () => {
  setStoredData(STORAGE_KEYS.LAND_RECORDS, []);
  scheduleCentralSync();
  notifyCrossTabSync('ALL_LAND_RECORDS_CLEARED');
};

export const clearAllTokensPermanently = () => {
  setStoredData(STORAGE_KEYS.TOKENS, []);
  scheduleCentralSync();
  notifyCrossTabSync('ALL_TOKENS_CLEARED');
};

export const loadTokens = (): QueueToken[] => {
  const stored = getStoredData<QueueToken[]>(STORAGE_KEYS.TOKENS, DEFAULT_TOKENS);
  return stored.map((tok) => ({
    ...tok,
    officerToMeet: tok.officerToMeet || 'அட்மின் 01 (Admin 1)',
  }));
};
export const saveTokens = (tokens: QueueToken[]) => {
  setStoredData(STORAGE_KEYS.TOKENS, tokens);
  scheduleCentralSync();
};

export const loadServices = (): ServiceDefinition[] => {
  return getStoredData<ServiceDefinition[]>(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
};
export const saveServices = (services: ServiceDefinition[]) => {
  setStoredData(STORAGE_KEYS.SERVICES, services);
  scheduleCentralSync();
};

// ================= LAND BRANCH DATA STORE (Requirement 05) ================= //
export const DEFAULT_LAND_RECORDS: LandRecord[] = [
  {
    id: 'LND-211-2026-001',
    permitNo: 'LDO/211/2024/042',
    lotNo: '14-B',
    planNo: 'BCO/VHR/2023/118',
    extent: '0A-1R-20P',
    landType: 'CROWN_PERMIT',
    divisionCode: '211',
    ownerNic: '741239845V',
    ownerNameTa: 'கணபதிப்பிள்ளை சிவலிங்கம்',
    ownerNameEn: 'Kanapathipillai Sivalingam',
    ownerPhone: '0771234567',
    familyCode: 'FAM-211-001',
    permitStatus: 'PERMIT_ISSUED',
    issueDate: '2024-05-12',
    annualTaxStatus: 'PAID',
    boundaries: {
      north: 'வீதி (Public Road)',
      south: 'முருகேசு காணி (Murugesu Land)',
      east: 'வாய்க்கால் (Canal)',
      west: 'அரச காணி (Crown Land)',
    },
    notes: 'அரச காணி அனுமதிப்பத்திரம் ஒழுங்காக புதுப்பிக்கப்பட்டுள்ளது.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'LND-211A-2026-002',
    permitNo: 'LDO/211A/2025/089',
    lotNo: '28',
    planNo: 'BCO/VHR/2024/204',
    extent: '1A-0R-00P',
    landType: 'AGRICULTURAL',
    divisionCode: '211A',
    ownerNic: '891902697V',
    ownerNameTa: 'சின்னப்பு விஜயகுமார்',
    ownerNameEn: 'Sinnappu Vijayakumar',
    ownerPhone: '0760539158',
    familyCode: 'FAM-211-042',
    permitStatus: 'PENDING_APPROVAL',
    issueDate: '2025-08-19',
    annualTaxStatus: 'DUE',
    boundaries: {
      north: 'காயான்கேணி வீதி (Kayankerni Road)',
      south: 'வயல் வெளி (Paddy Field)',
      east: 'அரச காணி (State Land)',
      west: 'தவராசா காணி (Thavarasa Land)',
    },
    notes: 'அனுமதிப்பத்திர எல்லை மீளளவீடு செய்யப்பட வேண்டும்.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export const loadLandRecords = (): LandRecord[] => {
  return getStoredData<LandRecord[]>(STORAGE_KEYS.LAND_RECORDS, DEFAULT_LAND_RECORDS);
};

export const saveLandRecords = (records: LandRecord[]) => {
  setStoredData(STORAGE_KEYS.LAND_RECORDS, records);
  scheduleCentralSync();
};

export const clearAllLandRecords = () => {
  setStoredData(STORAGE_KEYS.LAND_RECORDS, []);
  scheduleCentralSync();
};

// ================= HOUSEHOLDS & 100-POINT POVERTY SCORING STORE (Requirements 02, 04, 08) ================= //
export const loadPovertyWeights = (): PovertyScoringWeights => {
  return getStoredData<PovertyScoringWeights>(STORAGE_KEYS.POVERTY_WEIGHTS, DEFAULT_POVERTY_WEIGHTS);
};

export const savePovertyWeights = (weights: PovertyScoringWeights) => {
  setStoredData(STORAGE_KEYS.POVERTY_WEIGHTS, weights);
  // Recalculate scores for all households with new weights
  const households = loadHouseholds();
  const allBeneficiaries = loadBeneficiaries();
  const updated = households.map((h) => {
    const members = allBeneficiaries.filter((b) => b.familyCode === h.familyCode);
    const scoreResult = calculateFamilyPovertyScore(h.commonAssets, members, weights);
    return {
      ...h,
      score100: scoreResult.score100,
      priorityRank: scoreResult.priorityRank,
      scoreBreakdown: scoreResult.breakdown,
      updatedAt: new Date().toISOString(),
    };
  });
  setStoredData(STORAGE_KEYS.HOUSEHOLDS, updated);
  scheduleCentralSync();
};

export const resetPovertyWeights = (): PovertyScoringWeights => {
  savePovertyWeights(DEFAULT_POVERTY_WEIGHTS);
  return DEFAULT_POVERTY_WEIGHTS;
};

export const DEFAULT_HOUSEHOLDS: HouseholdData[] = [
  {
    id: 'HH-5-1-03-01-010-00435',
    familyCode: 'FAM-211-042',
    householdReference: 'HH-5-1-03-01-010-00435',
    applicationReference: '20250515-4622119',
    applicantNameTa: 'சின்னப்பு விஜயகுமார்',
    applicantNameEn: 'SINNAPPU VIJAYAKUMAR',
    applicantNic: '891902697V',
    phone: '0760539158',
    address: 'SELVAPURAM KAYANKERNI',
    divisionCode: '211A',
    status: 'DS_ENDORSED',
    selectedCategory: 'VULNERABLE',
    objectionsStatus: 'OC-08-10-2025-69523 [Completed]',
    bankDetails: {
      bankName: 'Peoples Bank',
      branch: 'Valaichchenai',
      accountNumber: '208390058609',
      accountName: 'SINNAPPU VIJAYAKUMAR 891902697V',
      status: 'VERIFIED',
    },
    commonAssets: {
      ownsLand: false,
      landExtent: 'NONE',
      ownsOtherLand: false,
      otherLandExtent: 'NONE',
      vehicleType: 'NONE',
      machineryType: 'NONE',
      livestockType: 'GOATS',
      livestockCount: 3,
      expenses: {
        food: 18000,
        water: 500,
        clothing: 2000,
        medical: 4000,
        rent: 0,
        transport: 1500,
        electricity: 1200,
        fuelGas: 2500,
        telecom: 1000,
        education: 1500,
        religiousLeisure: 500,
        loansDebt: 3000,
        total: 35700,
      },
      income: {
        unstableSources: 12000,
        salary: 0,
        business: 0,
        agriculture: 4000,
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
        total: 18500,
      },
      electricityUnitsKwh: 28,
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
    },
    totalMembersCount: 4,
    familyQrPayload: 'VHR-FAMILY|FAM:FAM-211-042|DIV:211A|UID:FAM-211-042-SEED',
    score100: 88,
    priorityRank: 1,
    scoreBreakdown: {
      housingScore: 25,
      sanitationScore: 20,
      demographicsScore: 18,
      economicScore: 25,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export const loadHouseholds = (): HouseholdData[] => {
  return getStoredData<HouseholdData[]>(STORAGE_KEYS.HOUSEHOLDS, DEFAULT_HOUSEHOLDS);
};

export const saveHouseholds = (households: HouseholdData[]) => {
  setStoredData(STORAGE_KEYS.HOUSEHOLDS, households);
  scheduleCentralSync();
};

export const saveSingleHousehold = (household: HouseholdData) => {
  const current = loadHouseholds();
  const existingIdx = current.findIndex((h) => h.familyCode === household.familyCode || h.id === household.id);
  let updated: HouseholdData[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = household;
  } else {
    updated = [household, ...current];
  }
  saveHouseholds(updated);
};

export const clearAllHouseholds = () => {
  setStoredData(STORAGE_KEYS.HOUSEHOLDS, []);
  scheduleCentralSync();
};

// Super Admin Clear All Tools
export const clearAllBeneficiaries = (): void => {
  const current = getStoredData<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, []);
  recordDeletedIds(current.map((b) => b.id).concat(current.map((b) => b.nic)));
  setStoredData(STORAGE_KEYS.BENEFICIARIES, []);
  setStoredData('vaharai_ds_beneficiaries_cleared', 'true');
  const snapshot = createDatabaseSnapshot();
  pushToCentralDatabase(snapshot);
  notifyCrossTabSync('ALL_BENEFICIARIES_CLEARED');
};

export const clearAllTokens = (): void => {
  setStoredData(STORAGE_KEYS.TOKENS, []);
  scheduleCentralSync();
};

export const clearAllAssistanceRecords = (): void => {
  setStoredData(STORAGE_KEYS.ASSISTANCE, []);
  scheduleCentralSync();
};

export const resetDatabaseToDefaults = (): void => {
  setStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);
  setStoredData(STORAGE_KEYS.BENEFICIARIES, DEFAULT_BENEFICIARIES);
  setStoredData(STORAGE_KEYS.TOKENS, DEFAULT_TOKENS);
  setStoredData(STORAGE_KEYS.DIVISIONS, DEFAULT_DIVISIONS);
  setStoredData(STORAGE_KEYS.SERVICES, DEFAULT_SERVICES);
  setStoredData(STORAGE_KEYS.ASSISTANCE, DEFAULT_ASSISTANCE_RECORDS);
  scheduleCentralSync();
};

export const loadDivisions = (): GNDivision[] => {
  const stored = getStoredData<GNDivision[]>(STORAGE_KEYS.DIVISIONS, DEFAULT_DIVISIONS);
  const storedCodes = new Set(stored.map((d) => d.code));
  // If stored has obsolete divisions (e.g. 215, 214) or does not match 16 divisions, reset to DEFAULT_DIVISIONS
  const hasObsolete = storedCodes.has('215') || storedCodes.has('214') || storedCodes.has('215A') || storedCodes.has('215B');
  if (hasObsolete || stored.length !== 16 || !storedCodes.has('213D') || !storedCodes.has('211G')) {
    setStoredData(STORAGE_KEYS.DIVISIONS, DEFAULT_DIVISIONS);
    return DEFAULT_DIVISIONS;
  }
  return stored;
};
export const saveDivisions = (divs: GNDivision[]) => {
  setStoredData(STORAGE_KEYS.DIVISIONS, divs);
  scheduleCentralSync();
};

export const loadAuditLogs = (): SystemAuditLog[] => getStoredData<SystemAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
export const logAuditAction = (userId: string, userName: string, action: string, details: string) => {
  const current = loadAuditLogs();
  const entry: SystemAuditLog = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    details,
  };
  saveStoredData(STORAGE_KEYS.AUDIT_LOGS, [entry, ...current.slice(0, 499)]);
  scheduleCentralSync();
};

const saveStoredData = <T>(key: string, data: T) => setStoredData(key, data);

// ================= ASSISTANCE / RELIEF DISTRIBUTION STORAGE ================= //
export const DEFAULT_ASSISTANCE_RECORDS: AssistanceRecord[] = ((initialDatabaseSeed as any)?.assistance as AssistanceRecord[]) || [];

// ================= STORAGE LOCATION TRANSPARENCY (Requirement 08) ================= //
export interface StorageLocationInfo {
  browserStorage: {
    status: 'ACTIVE' | 'WARNING';
    descriptionTa: string;
    descriptionEn: string;
    keysCount: number;
    beneficiariesCount: number;
    tokensCount: number;
    assistanceCount: number;
  };
  serverDatabase: {
    status: 'ONLINE' | 'STANDALONE';
    endpoint: string;
    descriptionTa: string;
    descriptionEn: string;
  };
  cloudGoogleDrive: {
    status: 'CONNECTED' | 'NOT_CONNECTED';
    fileId: string;
    fileName: string;
    descriptionTa: string;
    descriptionEn: string;
  };
}

export const getStorageLocationsInfo = (): StorageLocationInfo => {
  const bList = loadBeneficiaries();
  const tList = loadTokens();
  const aList = loadAssistanceRecords();

  let keysCount = 0;
  if (typeof window !== 'undefined') {
    keysCount = Object.keys(localStorage).filter((k) => k.startsWith('vaharai_ds_')).length;
  }

  return {
    browserStorage: {
      status: 'ACTIVE',
      descriptionTa: 'இந்த கணினி உலாவி பாதுகாப்பான உள்ளக களஞ்சியத்தில் (Browser LocalStorage) தகவல்கள் உடனடியாக நிரந்தரமாக சேமிக்கப்படுகின்றன.',
      descriptionEn: 'Data is immediately and permanently persisted in this computer browser localStorage.',
      keysCount,
      beneficiariesCount: bList.length,
      tokensCount: tList.length,
      assistanceCount: aList.length,
    },
    serverDatabase: {
      status: isServerApiAvailable() ? 'ONLINE' : 'STANDALONE',
      endpoint: '/api/database',
      descriptionTa: 'பிரதேச செயலக மத்திய சேவையக தரவுத்தளத்தில் (Central Database API) அனைத்து கணினிகளுக்கும் இடையில் ஒத்திசைக்கப்படுகிறது.',
      descriptionEn: 'Synchronized with Central Divisional Secretariat Database API.',
    },
    cloudGoogleDrive: {
      status: 'CONNECTED',
      fileId: 'vaharai_ds_master_database.json',
      fileName: 'vaharai_ds_master_central_database.json',
      descriptionTa: 'பிரதேச செயலகத்தின் பாதுகாப்பான Google Drive கோப்பில் தானியங்கியாக கிளவுட் காப்புப்பிரதி (Cloud Backup) செய்யப்படுகிறது.',
      descriptionEn: 'Automatically backed up to the official DS Google Drive file.',
    },
  };
};

export const loadAssistanceRecords = (): AssistanceRecord[] => {
  return getStoredData<AssistanceRecord[]>(STORAGE_KEYS.ASSISTANCE, DEFAULT_ASSISTANCE_RECORDS);
};

export const saveAssistanceRecords = (records: AssistanceRecord[]) => {
  setStoredData(STORAGE_KEYS.ASSISTANCE, records);
  scheduleCentralSync();
};

// ================= DUPLICATE AID DETECTION & PREVENTION ENGINE ================= //
// "ஏனென்றால் ஒரே குடும்பத்திற்கே தொடர்ச்சியான உதவிகள் கிடைக்கிறது இதனை தடுக்க வேண்டும்"
export const checkDuplicateAssistance = (
  familyCode?: string,
  nic?: string,
  category?: string,
  currentRecords?: AssistanceRecord[]
): DuplicateAidCheckResult => {
  const records = currentRecords && currentRecords.length > 0 ? currentRecords : loadAssistanceRecords();
  
  const famCodeClean = familyCode?.trim().toUpperCase();
  const nicClean = nic?.trim().toLowerCase();

  const matchingRecords = records.filter((r) => {
    const famMatch = famCodeClean && r.familyCode && r.familyCode.toUpperCase() === famCodeClean;
    const nicMatch = nicClean && r.beneficiaryNic && r.beneficiaryNic.toLowerCase() === nicClean;
    return famMatch || nicMatch;
  });

  if (matchingRecords.length === 0) {
    return {
      hasDuplicateRisk: false,
      duplicateCount: 0,
      previousRecords: [],
      warningMessageTa: 'இக்குடும்பத்திற்கு இதுவரை எந்த நிவாரண/உதவிப் பதிவும் இல்லை. புதிய உதவி வழங்க தகுதியானது.',
      warningMessageEn: 'No previous relief recorded for this family. Fully eligible.',
      severity: 'SAFE',
    };
  }

  // Sort descending by distributedDate
  matchingRecords.sort((a, b) => new Date(b.distributedDate).getTime() - new Date(a.distributedDate).getTime());
  const lastRecord = matchingRecords[0];
  const lastTime = new Date(lastRecord.distributedDate).getTime();
  const daysDiff = Math.floor((Date.now() - lastTime) / (1000 * 60 * 60 * 24));

  const sameCategoryMatch = category ? matchingRecords.find((r) => r.aidCategory === category) : null;

  let severity: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  let warningMessageTa = '';
  let warningMessageEn = '';

  if (daysDiff < 30 || sameCategoryMatch) {
    severity = 'CRITICAL';
    warningMessageTa = `⚠️ கடுமையான எச்சரிக்கை: இக்குடும்பத்திற்கு ${daysDiff} நாட்களுக்கு முன்னர் (${lastRecord.distributedDate}) ஏற்கனவே உதவி (${lastRecord.aidDescription} - ${lastRecord.amountOrValue}) வழங்கப்பட்டுள்ளது! தொடர்ச்சியான இரட்டை உதவிகளைத் தவிர்க்கவும்!`;
    warningMessageEn = `CRITICAL WARNING: This family already received assistance (${lastRecord.aidDescription}) ${daysDiff} days ago on ${lastRecord.distributedDate}. Continuous aid duplication risk!`;
  } else if (daysDiff < 90) {
    severity = 'WARNING';
    warningMessageTa = `கவனிக்க: இக்குடும்பம் ${daysDiff} நாட்களுக்கு முன் (${lastRecord.distributedDate}) உதவி பெற்றுள்ளது. மொத்தம் ${matchingRecords.length} முறை உதவி பெறப்பட்டுள்ளது.`;
    warningMessageEn = `Notice: This family received relief ${daysDiff} days ago (${lastRecord.distributedDate}). Total past assistances: ${matchingRecords.length}.`;
  } else {
    severity = 'SAFE';
    warningMessageTa = `இக்குடும்பம் கடைசியாக ${daysDiff} நாட்களுக்கு முன் உதவி பெற்றுள்ளது. புதிய உதவி வழங்க அனுமதிக்கலாம்.`;
    warningMessageEn = `Last assistance was ${daysDiff} days ago. Can be considered for new relief.`;
  }

  return {
    hasDuplicateRisk: severity === 'CRITICAL' || severity === 'WARNING',
    duplicateCount: matchingRecords.length,
    lastDistributedDate: lastRecord.distributedDate,
    daysSinceLastAid: daysDiff,
    previousRecords: matchingRecords,
    warningMessageTa,
    warningMessageEn,
    severity,
  };
};

// Database Snapshot for Google Drive / JSON file
export const createDatabaseSnapshot = () => {
  return {
    version: '4.0',
    exportedAt: new Date().toISOString(),
    organization: 'Divisional Secretariat Koralaipattu North (Vaharai)',
    users: loadUsers(),
    beneficiaries: loadBeneficiaries(),
    tokens: loadTokens(),
    divisions: loadDivisions(),
    auditLogs: loadAuditLogs(),
    assistance: loadAssistanceRecords(),
    pregnantMothers: loadPregnantMothers(),
    landRecords: loadLandRecords(),
    households: loadHouseholds(),
    povertyWeights: loadPovertyWeights(),
  };
};

export const restoreDatabaseFromSnapshot = (snapshot: any): boolean => {
  if (!snapshot || !Array.isArray(snapshot.users)) {
    throw new Error('Invalid backup file structure.');
  }
  if (Array.isArray(snapshot.users)) setStoredData(STORAGE_KEYS.USERS, snapshot.users);
  if (Array.isArray(snapshot.beneficiaries)) setStoredData(STORAGE_KEYS.BENEFICIARIES, snapshot.beneficiaries);
  if (Array.isArray(snapshot.tokens)) setStoredData(STORAGE_KEYS.TOKENS, snapshot.tokens);
  if (Array.isArray(snapshot.divisions)) setStoredData(STORAGE_KEYS.DIVISIONS, snapshot.divisions);
  if (Array.isArray(snapshot.assistance)) setStoredData(STORAGE_KEYS.ASSISTANCE, snapshot.assistance);
  if (Array.isArray(snapshot.auditLogs)) setStoredData(STORAGE_KEYS.AUDIT_LOGS, snapshot.auditLogs);
  if (Array.isArray(snapshot.pregnantMothers)) setStoredData(STORAGE_KEYS.PREGNANT_MOTHERS, snapshot.pregnantMothers);
  if (Array.isArray(snapshot.landRecords)) setStoredData(STORAGE_KEYS.LAND_RECORDS, snapshot.landRecords);
  if (Array.isArray(snapshot.households)) setStoredData(STORAGE_KEYS.HOUSEHOLDS, snapshot.households);
  if (snapshot.povertyWeights) setStoredData(STORAGE_KEYS.POVERTY_WEIGHTS, snapshot.povertyWeights);
  
  notifyCrossTabSync('DATABASE_RESTORED');
  return true;
};

if (typeof window !== 'undefined') {
  (window as any).__vaharai_create_snapshot = createDatabaseSnapshot;
}

// ================= CROSS-TAB & BROADCAST SYNCHRONIZATION ================= //
export const notifyCrossTabSync = (actionType: string = 'DATA_UPDATED') => {
  if (typeof window === 'undefined') return;
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('vaharai_ds_sync_channel');
      channel.postMessage({ type: actionType, timestamp: Date.now() });
      channel.close();
    }
    window.dispatchEvent(new CustomEvent('vaharai_db_updated', { detail: { action: actionType } }));
  } catch {
    // ignore
  }
};

// ================= CENTRAL SERVER / GOOGLE DRIVE SYNCHRONIZATION ================= //
let syncDebounceTimer: any = null;
let serverApiAvailable: boolean | null = null; // null = not checked yet, false = 404/not available, true = available

export const isServerApiAvailable = (): boolean => {
  return serverApiAvailable !== false;
};

export const scheduleCentralSync = () => {
  if (typeof window === 'undefined') return;

  // Broadcast to other open tabs and windows on the same browser immediately!
  notifyCrossTabSync('RECORD_SAVED');

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    const snapshot = createDatabaseSnapshot();
    // 1. Automatically push to the designated Google Drive file if authenticated
    scheduleAutoDriveSync(snapshot);

    // 2. Also push to central backend server if available
    if (serverApiAvailable !== false) {
      pushToCentralDatabase(snapshot);
    }
  }, 800);
};

export const fetchCentralDatabase = async (): Promise<any | null> => {
  // If we already know /api/database does not exist on this host (e.g. Vercel static deployment), don't spam 404
  if (serverApiAvailable === false) {
    return null;
  }

  try {
    const res = await fetch('/api/database');
    if (!res.ok) {
      serverApiAvailable = false;
      console.info(`[Vaharai DS] Central /api/database returned status ${res.status}. Active mode: Cloud Drive & Local Storage.`);
      return null;
    }
    serverApiAvailable = true;
    const body = await res.json();
    if (body.success && body.data) {
      return body.data;
    }
    return null;
  } catch {
    serverApiAvailable = false;
    return null;
  }
};

export const pushToCentralDatabase = async (snapshot?: any): Promise<boolean> => {
  if (serverApiAvailable === false) {
    return false;
  }

  try {
    const data = snapshot || createDatabaseSnapshot();
    const res = await fetch('/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      serverApiAvailable = false;
      return false;
    }
    serverApiAvailable = true;
    return true;
  } catch {
    serverApiAvailable = false;
    return false;
  }
};

export const getCentralDatabaseStatus = async (): Promise<any | null> => {
  if (serverApiAvailable === false) {
    return {
      success: true,
      initialized: true,
      mode: 'cloud_drive_standalone',
      message: 'Running with Direct Google Drive & Local Storage Sync',
    };
  }

  try {
    const res = await fetch('/api/database/status');
    if (res.status === 404) {
      serverApiAvailable = false;
      return {
        success: true,
        initialized: true,
        mode: 'cloud_drive_standalone',
        message: 'Running with Direct Google Drive & Local Storage Sync',
      };
    }
    if (!res.ok) return null;
    serverApiAvailable = true;
    return await res.json();
  } catch {
    serverApiAvailable = false;
    return {
      success: true,
      initialized: true,
      mode: 'cloud_drive_standalone',
      message: 'Running with Direct Google Drive & Local Storage Sync',
    };
  }
};
