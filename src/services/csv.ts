import { 
  Beneficiary, 
  User, 
  GNDivision, 
  Role, 
  WelfareScheme, 
  ChronicIllness, 
  WelfareStatus,
  AssistanceRecord,
  AidCategory,
  FamilyCsvRecord,
  FamilyRelationship,
  PregnantMotherRecord,
  DisabilityCause,
  LandRecord,
  LandType,
  LandPermitStatus,
} from '../types';
import { 
  generateSystemCitizenId, 
  generateProvisionalNic, 
  generateUniqueFamilyCode,
  generateUniqueFamilyQrPayload, 
  checkDuplicateAssistance,
  calculateAge,
  calculateTenMonthsDate,
  createDefaultMonthlyCollections,
} from './storage';
import { parseSriLankanNic } from '../utils/nicParser';

// Normalize date string from DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD to YYYY-MM-DD
export const normalizeDateString = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) return '';
  const s = dateStr.trim();
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s;
};

// Derive DOB & Gender accurately: tries extracting from Sri Lankan NIC first if valid
export const resolveDobAndGender = (
  rawDob: string | undefined,
  nic: string | undefined,
  defaultYear: number = 1995
): { dob: string; gender?: 'MALE' | 'FEMALE'; age: number } => {
  const normalized = normalizeDateString(rawDob);
  const nicParsed = nic ? parseSriLankanNic(nic) : null;

  // If valid NIC exists, prioritize NIC extracted DOB when provided DOB is missing or default
  if (nicParsed && nicParsed.isValid && nicParsed.birthDate) {
    if (!normalized || normalized.startsWith('1990-01-01') || normalized.startsWith('1995-01-01') || normalized.startsWith('2000-01-01') || normalized.startsWith('1954-01-01') || normalized.startsWith('1985-01-01') || normalized.startsWith('2005-01-01')) {
      return {
        dob: nicParsed.birthDate,
        gender: nicParsed.gender,
        age: nicParsed.age ?? calculateAge(nicParsed.birthDate, nic),
      };
    }
  }

  const finalDob = normalized || (nicParsed?.isValid && nicParsed.birthDate ? nicParsed.birthDate : `${defaultYear}-01-01`);
  const finalAge = calculateAge(finalDob, nic);
  return {
    dob: finalDob,
    gender: nicParsed?.isValid ? nicParsed.gender : undefined,
    age: finalAge,
  };
};

// UTF-8 BOM so Excel opens Tamil Unicode characters accurately without question marks or mojibake
const UTF8_BOM = '\uFEFF';

export const downloadCsvFile = (content: string, filename: string) => {
  const blob = new Blob([UTF8_BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Robust CSV Line Parser
export const parseCsvContent = (csvText: string): string[][] => {
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  const lines = cleanText.split(/\r\n|\n|\r/);

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const row: string[] = [];
    let insideQuotes = false;
    let entry = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          entry += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    rows.push(row);
  }

  return rows;
};

// ================= RELATIONSHIP & WELFARE CHECKLIST HELPERS ================= //

export const parseRelationshipString = (raw: string | undefined): FamilyRelationship => {
  if (!raw) return 'OTHER';
  const s = raw.trim().toUpperCase();
  if (s.includes('FATHER') || s.includes('தந்தை') || s.includes('அப்பா')) return 'FATHER';
  if (s.includes('MOTHER') || s.includes('தாய்') || s.includes('அம்மா')) return 'MOTHER';
  if (s.includes('SON') || s.includes('மகன்')) return 'SON';
  if (s.includes('DAUGHTER') || s.includes('மகள்')) return 'DAUGHTER';
  if (s.includes('HUSBAND') || s.includes('கணவன்')) return 'HUSBAND';
  if (s.includes('WIFE') || s.includes('மனைவி')) return 'WIFE';
  if (s.includes('GRANDFATHER') || s.includes('தாத்தா') || s.includes('பாட்டன்')) return 'GRANDFATHER';
  if (s.includes('GRANDMOTHER') || s.includes('பாட்டி') || s.includes('அம்மாச்சி')) return 'GRANDMOTHER';
  if (s.includes('GRANDSON') || s.includes('பேரன்')) return 'GRANDSON';
  if (s.includes('GRANDDAUGHTER') || s.includes('பேத்தி')) return 'GRANDDAUGHTER';
  if (s.includes('HEAD') || s.includes('தலைவர்')) return 'HEAD';
  if (s.includes('CAREGIVER') || s.includes('பராமரிப்பாளர்')) return 'CAREGIVER';
  return 'OTHER';
};

export const getRelationshipTamilLabel = (rel?: FamilyRelationship): string => {
  switch (rel) {
    case 'FATHER': return 'தந்தை (Father)';
    case 'MOTHER': return 'தாய் (Mother)';
    case 'SON': return 'மகன் (Son)';
    case 'DAUGHTER': return 'மகள் (Daughter)';
    case 'HUSBAND': return 'கணவன் (Husband)';
    case 'WIFE': return 'மனைவி (Wife)';
    case 'GRANDFATHER': return 'தாத்தா (Grandfather)';
    case 'GRANDMOTHER': return 'பாட்டி (Grandmother)';
    case 'GRANDSON': return 'பேரன் (Grandson)';
    case 'GRANDDAUGHTER': return 'பேத்தி (Granddaughter)';
    case 'HEAD': return 'குடும்பத் தலைவர் (Head)';
    case 'CAREGIVER': return 'பராமரிப்பாளர் (Caregiver)';
    case 'OTHER': default: return 'உறவினர் (Relative)';
  }
};

export const parseWelfareChecklistString = (raw: string | undefined): WelfareScheme[] => {
  if (!raw) return [];
  const parts = raw.split(/[;,|+]/).map((p) => p.trim()).filter(Boolean);
  const schemes: WelfareScheme[] = [];

  for (const part of parts) {
    const u = part.toUpperCase();
    if (u.includes('EXTREME') || (u.includes('அஸ்வெசும') && u.includes('மிக ஏழ்மை'))) schemes.push('ASWESUMA_EXTREME');
    else if (u.includes('POOR') || (u.includes('அஸ்வெசும') && u.includes('ஏழ்மை'))) schemes.push('ASWESUMA_POOR');
    else if (u.includes('VULNERABLE') || (u.includes('அஸ்வெசும') && u.includes('இடர்பட'))) schemes.push('ASWESUMA_VULNERABLE');
    else if (u.includes('TRANSITIONAL') || (u.includes('அஸ்வெசும') && u.includes('இடைக்கால'))) schemes.push('ASWESUMA_TRANSITIONAL');
    else if (u.includes('ASWESUMA') || u.includes('அஸ்வெசும')) schemes.push('ASWESUMA_POOR');
    else if (u.includes('SAMURDHI') || u.includes('சமுர்த்தி')) schemes.push('SAMURDHI');
    else if (u.includes('ELDERLY') || u.includes('முதியோர்')) schemes.push('ELDERLY');
    else if (u.includes('DISABILITY') || u.includes('மாற்றுத்திறனாளி') || u.includes('அங்கவீனர்')) schemes.push('DISABILITY');
    else if (u.includes('PREGNANT') || u.includes('NUTRITION') || u.includes('கர்ப்பிணி') || u.includes('போசணை') || u.includes('முத்திரை')) schemes.push('PREGNANT_NUTRITION');
    else if (u.includes('KIDNEY') || u.includes('சிறுநீரகம்')) schemes.push('CHRONIC_KIDNEY');
    else if (u.includes('FARM') || u.includes('விவசாயம்') || u.includes('உரம்')) schemes.push('FARMER_SUBSIDY');
    else if (u.includes('FISH') || u.includes('கடற்றொழில்') || u.includes('மீனவர்') || u.includes('மண்ணெண்ணெய்')) schemes.push('FISHERY_AID');
    else if (u.includes('DISASTER') || u.includes('அனர்த்த') || u.includes('வெள்ளம்')) schemes.push('DISASTER_RELIEF');
    else if (u.includes('EDU') || u.includes('கல்வி') || u.includes('பாடசாலை')) schemes.push('EDUCATION_AID');
    else if (u.includes('SELF') || u.includes('LIVELIHOOD') || u.includes('வாழ்வாதார') || u.includes('சுயதொழில்')) schemes.push('SELF_EMPLOYMENT');
  }

  return Array.from(new Set(schemes));
};

export const formatWelfareChecklistString = (schemes?: WelfareScheme[], primary?: WelfareScheme): string => {
  const list = schemes && schemes.length > 0 ? schemes : (primary && primary !== 'NONE' ? [primary] : []);
  if (list.length === 0) return 'NONE';
  return list.join('; ');
};

// ================= BENEFICIARIES / CITIZENS CSV ================= //
export const BENEFICIARIES_CSV_HEADERS = [
  'System_ID',
  'Family_Code',
  'Family_Relationship',
  'NIC',
  'Name_Tamil',
  'Name_English',
  'Gender',
  'DOB',
  'Phone',
  'Address',
  'Division_Code',
  'Family_Head',
  'Household_No',
  'Chronic_Illness',
  'Welfare_Aids_Checklist',
  'Notes'
];

const BENICIARY_HEADER_LINE = BENEFICIARIES_CSV_HEADERS.join(',');

export const generateBeneficiarySampleCsv = (): string => {
  const sampleRows = [
    BENICIARY_HEADER_LINE,
    'VHR-211-2026-0001,FAM-211-042,FATHER,198421500321,முருகேசு தர்மலிங்கம்,Murugesu Tharmalingam,MALE,1984-05-12,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,YES,HH-211-042,CKD_KIDNEY,"ASWESUMA_EXTREME; FARMER_SUBSIDY",சிறுநீரக நோயாளி மற்றும் தீவிர வறுமை உதவி',
    'VHR-211-2026-0002,FAM-211-042,MOTHER,198871200456,தர்மலிங்கம் சரஸ்வதி,Tharmalingam Saraswathi,FEMALE,1988-09-22,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,NO,HH-211-042,NONE,"PREGNANT_NUTRITION; SAMURDHI",கர்ப்பிணித் தாய் போசணை முத்திரை',
    'VHR-211-2026-0003,FAM-211-042,SON,TNIC-211-2026-10492,தர்மலிங்கம் கஜன்,Tharmalingam Kajan,MALE,2010-03-14,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,NO,HH-211-042,NONE,EDUCATION_AID,16 வயது பூர்த்தி (NIC விண்ணப்பத்திற்கு)',
    'VHR-211-2026-0004,FAM-211-042,GRANDMOTHER,195281400112,முருகேசு வள்ளியம்மை,Murugesu Valliyammai,FEMALE,1952-04-18,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,NO,HH-211-042,HEART_DISEASE,ELDERLY,70+ வயது முதியோர் கொடுப்பனவு',
    'VHR-212A-2026-0005,FAM-212A-088,MOTHER,199074500812,கனகரத்தினம் கமலாதேவி,Kanagarathnam Kamaladevi,FEMALE,1990-11-20,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",212A,YES,HH-212A-088,NONE,"SAMURDHI; SELF_EMPLOYMENT",பெண்தலைமைத்துவ குடும்பம் - சுயதொழில் தையல் இயந்திர உதவி',
    'VHR-211A-2026-0006,FAM-211A-102,FATHER,197519000451,இராசையா நகுலேஸ்வரன்,Rasiah Naguleswaran,MALE,1975-07-09,0772345678,"பள்ளிக்குடா, காயான்கேணி",211A,YES,HH-211A-102,CANCER,"FISHERY_AID; DISASTER_RELIEF",புற்றுநோய் சிகிச்சை மற்றும் கடற்றொழிலாளர் உதவி'
  ];
  return sampleRows.join('\n');
};

export const parseBeneficiariesFromCsv = (csvText: string): { items: Beneficiary[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { items: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  const items: Beneficiary[] = [];
  const errors: string[] = [];

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const hasFamilyCodeCol = headers.some((h) => h.includes('family_code') || h.includes('fam'));
  const hasRelCol = headers.some((h) => h.includes('relationship') || h.includes('rel'));

  // Detect column mapping intelligently
  const colIndex = {
    id: headers.findIndex((h) => h.includes('system') || h.includes('id')),
    familyCode: headers.findIndex((h) => h.includes('family_code') || h === 'fam_code' || h === 'family_qr'),
    rel: headers.findIndex((h) => h.includes('relationship') || h.includes('rel') || h.includes('role')),
    nic: headers.findIndex((h) => h.includes('nic')),
    nameTa: headers.findIndex((h) => h.includes('name_tamil') || h.includes('tamil') || h === 'name'),
    nameEn: headers.findIndex((h) => h.includes('name_english') || h.includes('english')),
    gender: headers.findIndex((h) => h.includes('gender') || h.includes('sex')),
    dob: headers.findIndex((h) => h.includes('dob') || h.includes('birth')),
    phone: headers.findIndex((h) => h.includes('phone') || h.includes('mobile')),
    address: headers.findIndex((h) => h.includes('address')),
    division: headers.findIndex((h) => h.includes('division')),
    head: headers.findIndex((h) => h.includes('family_head') || h.includes('head')),
    household: headers.findIndex((h) => h.includes('household')),
    illness: headers.findIndex((h) => h.includes('illness') || h.includes('chronic')),
    welfare: headers.findIndex((h) => h.includes('welfare') || h.includes('scheme') || h.includes('aid')),
    notes: headers.findIndex((h) => h.includes('note') || h.includes('remark')),
  };

  const startIndex = (colIndex.nic !== -1 || colIndex.id !== -1 || colIndex.nameTa !== -1) ? 1 : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((cell) => cell.trim())) continue;

    const divisionCode = (colIndex.division !== -1 ? row[colIndex.division] : row[8])?.trim() || '211';
    let id = (colIndex.id !== -1 ? row[colIndex.id] : row[0])?.trim();
    if (!id || id.length < 3) {
      id = generateSystemCitizenId(divisionCode, i + 1);
    }

    let nic = (colIndex.nic !== -1 ? row[colIndex.nic] : row[1])?.trim() || '';
    let isProvisional = false;

    if (!nic) {
      nic = generateProvisionalNic(divisionCode);
      isProvisional = true;
    } else if (nic.startsWith('TNIC') || nic.startsWith('TEMP')) {
      isProvisional = true;
    }

    const nameTa = (colIndex.nameTa !== -1 ? row[colIndex.nameTa] : row[2])?.trim() || '';
    const nameEn = (colIndex.nameEn !== -1 ? row[colIndex.nameEn] : row[3])?.trim() || nameTa;
    const genderRaw = ((colIndex.gender !== -1 ? row[colIndex.gender] : row[4]) || '').toUpperCase();
    const rawDob = (colIndex.dob !== -1 ? row[colIndex.dob] : row[5])?.trim();
    const resolved = resolveDobAndGender(rawDob, nic, 1995);
    const dob = resolved.dob;
    const gender = genderRaw.startsWith('M') ? 'MALE' : genderRaw.startsWith('F') ? 'FEMALE' : (resolved.gender || 'OTHER');
    const phone = (colIndex.phone !== -1 ? row[colIndex.phone] : row[6])?.trim() || '';
    const address = (colIndex.address !== -1 ? row[colIndex.address] : row[7])?.trim() || '';

    // Family Code & Relationship
    let familyCode = (colIndex.familyCode !== -1 ? row[colIndex.familyCode] : '')?.trim().toUpperCase();
    if (!familyCode) {
      familyCode = `FAM-${divisionCode}-${String(Math.floor(Math.random() * 900 + 100))}`;
    }
    const relRaw = colIndex.rel !== -1 ? row[colIndex.rel] : '';
    const familyRelationship = parseRelationshipString(relRaw);

    const headVal = colIndex.head !== -1 ? row[colIndex.head] : row[9];
    const familyHead = (headVal || '').toUpperCase() === 'YES' || headVal === '1' || (headVal || '').toUpperCase() === 'TRUE' || familyRelationship === 'HEAD' || familyRelationship === 'FATHER';
    const householdNo = (colIndex.household !== -1 ? row[colIndex.household] : row[10])?.trim() || `HH-${divisionCode}-${i}`;
    
    // Chronic Illness parsing
    const illnessRaw = ((colIndex.illness !== -1 ? row[colIndex.illness] : row[11]) || '').toUpperCase();
    let chronicIllness: ChronicIllness = 'NONE';
    if (illnessRaw.includes('CKD') || illnessRaw.includes('KIDNEY') || illnessRaw.includes('சிறுநீரகம்')) chronicIllness = 'CKD_KIDNEY';
    else if (illnessRaw.includes('CANCER') || illnessRaw.includes('புற்று')) chronicIllness = 'CANCER';
    else if (illnessRaw.includes('THALASSEMIA') || illnessRaw.includes('தலசீமியா')) chronicIllness = 'THALASSEMIA';
    else if (illnessRaw.includes('HEART') || illnessRaw.includes('இதயம்')) chronicIllness = 'HEART_DISEASE';
    else if (illnessRaw.includes('DIABETES') || illnessRaw.includes('நீரிழிவு')) chronicIllness = 'DIABETES_CHRONIC';
    else if (illnessRaw.includes('DISABILITY') || illnessRaw.includes('ஊனம்')) chronicIllness = 'DISABILITY_PHYSICAL';
    else if (illnessRaw.includes('MENTAL') || illnessRaw.includes('மனநலம்')) chronicIllness = 'MENTAL_HEALTH';
    else if (illnessRaw !== 'NONE' && illnessRaw.length > 2) chronicIllness = 'OTHER_CHRONIC';

    // Welfare scheme checklist parsing (Requirement 02)
    const welfareRaw = ((colIndex.welfare !== -1 ? row[colIndex.welfare] : row[12]) || '').toUpperCase();
    const welfareSchemes = parseWelfareChecklistString(welfareRaw);
    const welfareScheme: WelfareScheme = welfareSchemes.length > 0 ? welfareSchemes[0] : 'NONE';

    const notes = (colIndex.notes !== -1 ? row[colIndex.notes] : row[13])?.trim() || '';

    if (!nameTa && !nameEn) {
      errors.push(`Row ${i + 1}: Skipped due to missing Name.`);
      continue;
    }

    const barcode = nic || id;
    const qrPayload = `VHR-DS|ID:${id}|NIC:${nic}|DIV:${divisionCode}|MED:${chronicIllness}|${welfareScheme}`;
    const familyQrPayload = generateUniqueFamilyQrPayload(familyCode, divisionCode);

    // Derive special flags
    const isPregnant = welfareSchemes.includes('PREGNANT_NUTRITION') || notes.includes('கர்ப்பிணி');
    const isElderly = welfareSchemes.includes('ELDERLY') || calculateAge(dob) >= 60;
    const isDisability = welfareSchemes.includes('DISABILITY') || chronicIllness === 'DISABILITY_PHYSICAL';
    const isSamurdhi = welfareSchemes.includes('SAMURDHI');

    items.push({
      id,
      nic,
      isProvisionalNic: isProvisional,
      nameTa,
      nameEn,
      gender,
      dob,
      phone,
      address,
      divisionCode,
      familyHead,
      householdNo,
      familyCode,
      familyRelationship,
      welfareScheme,
      welfareSchemes,
      welfareStatus: 'ACTIVE',
      chronicIllness,
      isPregnantMother: isPregnant,
      pregnancyStageMonths: isPregnant ? 6 : undefined,
      isElderly,
      elderlyAllowanceStatus: isElderly ? 'RECEIVING' : undefined,
      isPersonWithDisability: isDisability,
      disabilityNature: isDisability ? 'உடல் ஊனம் (Physical Disability)' : undefined,
      isSamurdhiBeneficiary: isSamurdhi,
      barcode,
      qrPayload,
      familyQrPayload,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { items, errors };
};

export const exportBeneficiariesToCsv = (items: Beneficiary[]): string => {
  const lines = [BENICIARY_HEADER_LINE];
  for (const b of items) {
    const row = [
      escapeCsv(b.id),
      escapeCsv(b.familyCode || `FAM-${b.divisionCode}-001`),
      escapeCsv(b.familyRelationship || (b.familyHead ? 'HEAD' : 'OTHER')),
      escapeCsv(b.nic),
      escapeCsv(b.nameTa),
      escapeCsv(b.nameEn),
      b.gender,
      b.dob,
      escapeCsv(b.phone),
      escapeCsv(b.address),
      escapeCsv(b.divisionCode),
      b.familyHead ? 'YES' : 'NO',
      escapeCsv(b.householdNo),
      escapeCsv(b.chronicIllness),
      escapeCsv(formatWelfareChecklistString(b.welfareSchemes, b.welfareScheme)),
      escapeCsv(b.notes || '')
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
};

// ================= USERS / STAFF CSV ================= //
export const USERS_CSV_HEADERS = ['User_ID', 'Password', 'Name', 'Role', 'Division', 'Status', 'Created_At'];

export const generateUsersSampleCsv = (): string => {
  const sampleRows = [
    'User_ID,Password,Name,Role,Division,Status,Created_At',
    '123,123,a (GN Vaharai North),GRAMANIILATHARI,211,ACTIVE,2026-01-10',
    '456,123,b (Admin 1),ADMIN 1,ALL,ACTIVE,2026-01-10',
    '457,123,b2 (Admin 2),ADMIN 2,ALL,ACTIVE,2026-01-10',
    '789,123,c (Super Admin),SUPERADMIN,ALL,ACTIVE,2026-01-10',
    '1112,123,d (Data Entry),DATAENRY OFFCER,ALL,ACTIVE,2026-01-10',
    '555,123,e (Reception),Reception Registrar,Front Desk,ACTIVE,2026-01-10',
    '999,123,TV Display Screen,NORMAL,ALL,ACTIVE,2026-01-10'
  ];
  return sampleRows.join('\n');
};

export const parseUsersFromCsv = (csvText: string): { items: User[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { items: [], errors: ['Staff CSV is empty.'] };
  }

  const items: User[] = [];
  const errors: string[] = [];
  const startIndex = rows[0][0]?.toLowerCase().includes('user') ? 1 : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    const id = row[0]?.trim();
    const password = row[1]?.trim() || '123456';
    const name = row[2]?.trim() || `Officer ${id}`;
    const roleRaw = (row[3] || 'GRAMANIILATHARI').trim().toUpperCase();

    let role: Role = 'GRAMANIILATHARI';
    if (roleRaw.includes('SUPER')) role = 'SUPERADMIN';
    else if (roleRaw.includes('ADMIN 2') || roleRaw.includes('ADMIN 02') || roleRaw.includes('ADMIN2')) role = 'ADMIN 2';
    else if (roleRaw.includes('ADMIN 1') || roleRaw.includes('ADMIN 01') || roleRaw.includes('ADMIN1')) role = 'ADMIN 1';
    else if (roleRaw.includes('NORMAL')) role = 'NORMAL';
    else if (roleRaw.includes('DATA')) role = 'DATAENRY OFFCER';
    else if (roleRaw.includes('RECEPT')) role = 'Reception Registrar';

    const division = row[4]?.trim() || (role === 'GRAMANIILATHARI' ? '211' : 'ALL');
    const status = (row[5]?.trim().toUpperCase() === 'INACTIVE') ? 'INACTIVE' : 'ACTIVE';
    const createdAt = row[6]?.trim() || new Date().toISOString();

    if (!id) {
      errors.push(`Row ${i + 1}: Skipped due to missing User_ID.`);
      continue;
    }

    items.push({
      id,
      password,
      name,
      role,
      division,
      status,
      createdAt,
    });
  }

  return { items, errors };
};

export const exportUsersToCsv = (users: User[]): string => {
  const lines = [USERS_CSV_HEADERS.join(',')];
  for (const u of users) {
    lines.push([
      escapeCsv(u.id),
      escapeCsv(u.password),
      escapeCsv(u.name),
      u.role,
      escapeCsv(u.division || 'ALL'),
      u.status,
      escapeCsv(u.createdAt)
    ].join(','));
  }
  return lines.join('\n');
};

// ================= GN DIVISIONS CSV ================= //
export const DIVISIONS_CSV_HEADERS = ['Division_Code', 'Name_Tamil', 'Name_English', 'GN_Officer_Name', 'Population', 'Households'];

export const generateDivisionsSampleCsv = (): string => {
  const sampleRows = [
    DIVISIONS_CSV_HEADERS.join(','),
    '213,கதிரவெளி,KATHIRAVELI,A. Balamurugan,2750,690',
    '213B,கட்டுமுறிவு,KADDUMURIVU,M. Sivalingam,1420,360',
    '211C,பனிச்சங்கேணி,PANICHCHANKERNI,V. Suresh,2310,580',
    '211D,வட்டவான்,VADDAVAAN,T. Karunakaran,1530,380',
    '211A,காயான்கேணி,KAYANKERNI,S. Pathmanathan,2600,650',
    '212B,உரியன்கட்டு,UOORIYANKADDU,K. Raveendran,1390,350',
    '211E,மதுரங்கேணிக்குளம்,MATHURANKERNIKULAM,N. Loganathan,1180,290',
    '212,வாகரை மத்தி,VAHARAI CENTRAL,R. Tharmarajah,1920,480',
    '211F,கிரிமிச்சை,KIRIMICHCHI,R. Senthil,1720,430',
    '212A,வாகரை வடக்கு,VAHARAI NORTH,K. Sivakumar,2450,610',
    '211,மாங்கேணி மத்தி,MANKERNI CENTRAL,T. Krishnarajah,2890,720',
    '213D,அம்மந்தனாவெளி,AMMANTHANAAVELI,G. Mohan,1840,460',
    '213C,புச்சக்கேணி,PUCHCHAKKERNI,V. Vasanthan,1260,320',
    '211B,புனானை கிழக்கு,PUNAANAI EAST,P. Vijayan,1650,410',
    '213A,பால்சேனை,PAALCHENAI,S. Mahendran,2180,540',
    '211G,மாங்கேணி தெற்கு,MANKERNI SOUTH,M. Yogarajah,1980,510'
  ];
  return sampleRows.join('\n');
};

export const exportDivisionsToCsv = (divs: GNDivision[]): string => {
  const lines = [DIVISIONS_CSV_HEADERS.join(',')];
  for (const d of divs) {
    lines.push([
      escapeCsv(d.code),
      escapeCsv(d.nameTa),
      escapeCsv(d.nameEn),
      escapeCsv(d.gnOfficerName || ''),
      d.population || 0,
      d.households || 0
    ].join(','));
  }
  return lines.join('\n');
};

// ================= FAMILIES CSV (குடும்பப் பதிவு மாதிரி & அப்லோட் - தாய், தந்தை, மகன், மகள்) ================= //
export const FAMILIES_CSV_HEADERS = [
  'Family_Code',
  'Family_Relationship',
  'NIC',
  'Name_Tamil',
  'Name_English',
  'Gender',
  'DOB',
  'Phone',
  'Address',
  'Division_Code',
  'Household_No',
  'Welfare_Aids_Checklist',
  'Chronic_Illness',
  'Notes'
];

export const generateFamiliesSampleCsv = (): string => {
  const sampleRows = [
    FAMILIES_CSV_HEADERS.join(','),
    // Family 01: Complete 5-Member Household connected by FAM-211-042
    'FAM-211-042,FATHER,198421500321,முருகேசு தர்மலிங்கம்,Murugesu Tharmalingam,MALE,1984-05-12,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,HH-211-042,"ASWESUMA_EXTREME; FARMER_SUBSIDY",CKD_KIDNEY,தந்தை - குடும்பத் தலைவர்',
    'FAM-211-042,MOTHER,198871200456,தர்மலிங்கம் சரஸ்வதி,Tharmalingam Saraswathi,FEMALE,1988-09-22,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,HH-211-042,"PREGNANT_NUTRITION; SAMURDHI",NONE,தாய் - கர்ப்பிணித் தாய் போசணை முத்திரை',
    'FAM-211-042,SON,TNIC-211-2026-10492,தர்மலிங்கம் கஜன்,Tharmalingam Kajan,MALE,2010-03-14,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,HH-211-042,EDUCATION_AID,NONE,மகன் - 16 வயது பூர்த்தி (NIC விண்ணப்பம்)',
    'FAM-211-042,DAUGHTER,TNIC-211-2026-10493,தர்மலிங்கம் தாரணி,Tharmalingam Tharanie,FEMALE,2016-08-10,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,HH-211-042,DISABILITY,DISABILITY_PHYSICAL,மகள் - உடல் ஊனம் (பாடசாலை மாணவி)',
    'FAM-211-042,GRANDMOTHER,195281400112,முருகேசு வள்ளியம்மை,Murugesu Valliyammai,FEMALE,1952-04-18,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,HH-211-042,ELDERLY,HEART_DISEASE,பாட்டி - 70+ முதியோர் கொடுப்பனவு',

    // Family 02: 3-Member Household connected by FAM-212A-088
    'FAM-212A-088,MOTHER,199074500812,கனகரத்தினம் கமலாதேவி,Kanagarathnam Kamaladevi,FEMALE,1990-11-20,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",212A,HH-212A-088,"SAMURDHI; SELF_EMPLOYMENT",NONE,தாய் - பெண் தலைமைத்துவ குடும்பம்',
    'FAM-212A-088,SON,TNIC-212A-2026-08121,கனகரத்தினம் சுபாஷ்,Kanagarathnam Subash,MALE,2012-04-05,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",212A,HH-212A-088,EDUCATION_AID,NONE,மகன் - மாணவர்',
    'FAM-212A-088,DAUGHTER,TNIC-212A-2026-08122,கனகரத்தினம் சுபத்திரா,Kanagarathnam Subathra,FEMALE,2015-09-12,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",212A,HH-212A-088,EDUCATION_AID,NONE,மகள் - மாணவி',

    // Family 03: 2-Member Senior Citizen Household connected by FAM-212-019
    'FAM-212-019,FATHER,195531200194,பொன்னம்பலம் செல்லையா,Ponnambalam Chelliah,MALE,1955-03-14,0714567890,"கோவில் வீதி, வாகரை மத்தி",212,HH-212-019,ELDERLY,HEART_DISEASE,தாத்தா / தந்தை - முதியோர் கொடுப்பனவு',
    'FAM-212-019,MOTHER,195881400213,செல்லையா பார்வதி,Chelliah Parvathy,FEMALE,1958-07-20,0714567890,"கோவில் வீதி, வாகரை மத்தி",212,HH-212-019,ELDERLY,DIABETES_CHRONIC,பாட்டி / தாய் - முதியோர் கொடுப்பனவு'
  ];
  return sampleRows.join('\n');
};

export const parseFamiliesFromCsv = (
  csvText: string,
  existingBeneficiaries: Beneficiary[]
): { items: Beneficiary[]; errors: string[]; familyCount: number } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { items: [], errors: ['CSV file is empty or missing data rows.'], familyCount: 0 };
  }

  const items: Beneficiary[] = [];
  const errors: string[] = [];
  const processedFamilyCodes = new Set<string>();

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = {
    familyCode: headers.findIndex((h) => h.includes('family_code') || h === 'fam_code' || h === 'family_qr'),
    rel: headers.findIndex((h) => h.includes('relationship') || h.includes('rel') || h.includes('role')),
    nic: headers.findIndex((h) => h.includes('nic')),
    nameTa: headers.findIndex((h) => h.includes('name_tamil') || h.includes('tamil') || h === 'head_name_tamil' || h === 'name'),
    nameEn: headers.findIndex((h) => h.includes('name_english') || h.includes('english') || h === 'head_name_english'),
    gender: headers.findIndex((h) => h.includes('gender') || h.includes('sex')),
    dob: headers.findIndex((h) => h.includes('dob') || h.includes('birth')),
    phone: headers.findIndex((h) => h.includes('phone') || h.includes('mobile')),
    address: headers.findIndex((h) => h.includes('address')),
    division: headers.findIndex((h) => h.includes('division')),
    household: headers.findIndex((h) => h.includes('household')),
    welfare: headers.findIndex((h) => h.includes('welfare') || h.includes('scheme') || h.includes('aid')),
    illness: headers.findIndex((h) => h.includes('illness') || h.includes('chronic')),
    notes: headers.findIndex((h) => h.includes('note') || h.includes('remark')),
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((cell) => cell.trim())) continue;

    const divisionCode = (colIndex.division !== -1 ? row[colIndex.division] : row[1])?.trim() || '211';
    const familyCode = (colIndex.familyCode !== -1 ? row[colIndex.familyCode] : row[0])?.trim().toUpperCase() || `FAM-${divisionCode}-${Math.floor(Math.random() * 900 + 100)}`;
    const relRaw = colIndex.rel !== -1 ? row[colIndex.rel] : '';
    const familyRelationship = parseRelationshipString(relRaw);

    let nic = (colIndex.nic !== -1 ? row[colIndex.nic] : row[3])?.trim() || '';
    let isProvisional = false;
    if (!nic) {
      nic = generateProvisionalNic(divisionCode);
      isProvisional = true;
    } else if (nic.startsWith('TNIC') || nic.startsWith('TEMP')) {
      isProvisional = true;
    }

    const nameTa = (colIndex.nameTa !== -1 ? row[colIndex.nameTa] : row[4])?.trim() || 'பெயர் குறிப்பிடப்படவில்லை';
    const nameEn = (colIndex.nameEn !== -1 ? row[colIndex.nameEn] : row[5])?.trim() || nameTa;
    const genderRaw = ((colIndex.gender !== -1 ? row[colIndex.gender] : row[6]) || '').toUpperCase();
    const rawDob = (colIndex.dob !== -1 ? row[colIndex.dob] : row[7])?.trim();
    const resolved = resolveDobAndGender(rawDob, nic, 1990);
    const dob = resolved.dob;
    const isFemaleRel = familyRelationship === 'MOTHER' || familyRelationship === 'DAUGHTER' || familyRelationship === 'WIFE' || familyRelationship === 'GRANDMOTHER';
    const gender = genderRaw.startsWith('F') || isFemaleRel ? 'FEMALE' : (resolved.gender || (genderRaw.startsWith('M') ? 'MALE' : 'MALE'));
    const phone = (colIndex.phone !== -1 ? row[colIndex.phone] : row[8])?.trim() || '';
    const address = (colIndex.address !== -1 ? row[colIndex.address] : row[9])?.trim() || `வாகரை (${divisionCode})`;
    const householdNo = (colIndex.household !== -1 ? row[colIndex.household] : row[2])?.trim() || `HH-${divisionCode}-001`;

    const welfareRaw = (colIndex.welfare !== -1 ? row[colIndex.welfare] : '') || '';
    const welfareSchemes = parseWelfareChecklistString(welfareRaw);
    const welfareScheme: WelfareScheme = welfareSchemes.length > 0 ? welfareSchemes[0] : 'NONE';

    const illnessRaw = ((colIndex.illness !== -1 ? row[colIndex.illness] : '') || '').toUpperCase();
    let chronicIllness: ChronicIllness = 'NONE';
    if (illnessRaw.includes('CKD') || illnessRaw.includes('KIDNEY') || illnessRaw.includes('சிறுநீரகம்')) chronicIllness = 'CKD_KIDNEY';
    else if (illnessRaw.includes('CANCER') || illnessRaw.includes('புற்று')) chronicIllness = 'CANCER';
    else if (illnessRaw.includes('DISABILITY') || illnessRaw.includes('ஊனம்')) chronicIllness = 'DISABILITY_PHYSICAL';
    else if (illnessRaw.includes('HEART') || illnessRaw.includes('இதயம்')) chronicIllness = 'HEART_DISEASE';
    else if (illnessRaw.includes('DIABETES') || illnessRaw.includes('நீரிழிவு')) chronicIllness = 'DIABETES_CHRONIC';
    else if (illnessRaw !== 'NONE' && illnessRaw.length > 2) chronicIllness = 'OTHER_CHRONIC';

    const isHead = familyRelationship === 'HEAD' || familyRelationship === 'FATHER' || (!processedFamilyCodes.has(familyCode) && items.filter(m => m.familyCode === familyCode).length === 0);
    const familyQrPayload = generateUniqueFamilyQrPayload(familyCode, divisionCode);
    const systemId = generateSystemCitizenId(divisionCode, existingBeneficiaries.length + items.length + 1);

    const isPregnant = welfareSchemes.includes('PREGNANT_NUTRITION') || (row.join(' ').includes('கர்ப்பிணி'));
    const isElderly = welfareSchemes.includes('ELDERLY') || calculateAge(dob) >= 60;
    const isDisability = welfareSchemes.includes('DISABILITY') || chronicIllness === 'DISABILITY_PHYSICAL';
    const isSamurdhi = welfareSchemes.includes('SAMURDHI');

    const notes = (colIndex.notes !== -1 ? row[colIndex.notes] : row[row.length - 1])?.trim() || `${getRelationshipTamilLabel(familyRelationship)} - குடும்ப பதிவு`;

    items.push({
      id: systemId,
      nic,
      isProvisionalNic: isProvisional,
      nameTa,
      nameEn,
      gender,
      dob,
      phone,
      address,
      divisionCode,
      familyHead: isHead,
      householdNo,
      familyCode,
      familyRelationship,
      welfareScheme,
      welfareSchemes,
      welfareStatus: 'ACTIVE',
      chronicIllness,
      isPregnantMother: isPregnant,
      pregnancyStageMonths: isPregnant ? 6 : undefined,
      isElderly,
      elderlyAllowanceStatus: isElderly ? 'RECEIVING' : undefined,
      isPersonWithDisability: isDisability,
      disabilityNature: isDisability ? 'உடல் ஊனம் (Physical Disability)' : undefined,
      isSamurdhiBeneficiary: isSamurdhi,
      barcode: nic,
      qrPayload: `ID:${systemId}|NIC:${nic}|DIV:${divisionCode}|FAM:${familyCode}|REL:${familyRelationship}`,
      familyQrPayload,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    processedFamilyCodes.add(familyCode);
  }

  return { items, errors, familyCount: processedFamilyCodes.size };
};

// ================= 1. ELDERLY CSV (முதியோர் பதிவு மாதிரி & அப்லோட்) ================= //
export const ELDERLY_CSV_HEADERS = [
  'Family_Code',
  'Family_Relationship',
  'NIC',
  'Name_Tamil',
  'Name_English',
  'Gender',
  'DOB',
  'Phone',
  'Address',
  'Division_Code',
  'Allowance_Status',
  'Living_Status',
  'Mobility_Status',
  'Caretaker_Name',
  'Caretaker_Phone',
  'Chronic_Illness',
  'Welfare_Aids_Checklist',
  'Notes'
];

export const generateElderlySampleCsv = (): string => {
  const sampleRows = [
    ELDERLY_CSV_HEADERS.join(','),
    'FAM-212-019,GRANDFATHER,195531200194,பொன்னம்பலம் செல்லையா,Ponnambalam Chelliah,MALE,1955-03-14,0714567890,"கோவில் வீதி, வாகரை மத்தி",212,RECEIVING,WITH_FAMILY,NORMAL,செல்லையா கஜன்,0771234567,HEART_DISEASE,"ELDERLY; ASWESUMA_POOR",70+ முதியோர் கொடுப்பனவு பெறுகிறார்',
    'FAM-212-019,GRANDMOTHER,195881400213,செல்லையா பார்வதி,Chelliah Parvathy,FEMALE,1958-07-20,0714567890,"கோவில் வீதி, வாகரை மத்தி",212,RECEIVING,WITH_FAMILY,WALKER_CANE,செல்லையா கஜன்,0771234567,DIABETES_CHRONIC,ELDERLY,வாக்கர் ஊன்றுகோல் பயன்படுத்துகிறார்',
    'FAM-211-042,GRANDMOTHER,195281400112,முருகேசு வள்ளியம்மை,Murugesu Valliyammai,FEMALE,1952-04-18,0771234567,"பிரதான வீதி, மாங்கேணி",211,WAITLIST,WITH_FAMILY,BEDRIDDEN,முருகேசு தர்மலிங்கம்,0771234567,NONE,"ELDERLY; CHRONIC_KIDNEY",படுக்கை நோயாளி - விசேட மருத்துவ கொடுப்பனவு காத்திருப்பு',
    'FAM-213-088,FATHER,196021500334,கந்தையா மாணிக்கம்,Kandiah Manickam,MALE,1960-01-10,0776543210,"கதிரவெளி மெயின் ரோடு",213,RECEIVING,ALONE,NORMAL,சுரேஷ்,0778899001,NONE,ELDERLY,தனியாக வசிக்கும் முதியவர்'
  ];
  return sampleRows.join('\n');
};

export const parseElderlyFromCsv = (
  csvText: string,
  existingBeneficiaries: Beneficiary[]
): { items: Beneficiary[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) return { items: [], errors: ['CSV file is empty or missing data rows.'] };

  const items: Beneficiary[] = [];
  const errors: string[] = [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const colIndex = {
    familyCode: headers.findIndex((h) => h.includes('family') || h.includes('fam')),
    rel: headers.findIndex((h) => h.includes('relationship') || h.includes('rel')),
    nic: headers.findIndex((h) => h.includes('nic')),
    nameTa: headers.findIndex((h) => h.includes('name_tamil') || h.includes('tamil') || h === 'name'),
    nameEn: headers.findIndex((h) => h.includes('name_english') || h.includes('english')),
    gender: headers.findIndex((h) => h.includes('gender')),
    dob: headers.findIndex((h) => h.includes('dob') || h.includes('birth')),
    phone: headers.findIndex((h) => h.includes('phone')),
    address: headers.findIndex((h) => h.includes('address')),
    division: headers.findIndex((h) => h.includes('division')),
    allowance: headers.findIndex((h) => h.includes('allowance')),
    living: headers.findIndex((h) => h.includes('living')),
    mobility: headers.findIndex((h) => h.includes('mobility')),
    caretakerName: headers.findIndex((h) => h.includes('caretaker_name')),
    caretakerPhone: headers.findIndex((h) => h.includes('caretaker_phone')),
    illness: headers.findIndex((h) => h.includes('illness')),
    welfare: headers.findIndex((h) => h.includes('welfare') || h.includes('aid')),
    notes: headers.findIndex((h) => h.includes('note')),
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((c) => c.trim())) continue;

    const divisionCode = (colIndex.division !== -1 ? row[colIndex.division] : row[9])?.trim() || '211';
    const familyCode = (colIndex.familyCode !== -1 ? row[colIndex.familyCode] : row[0])?.trim().toUpperCase() || `FAM-${divisionCode}-${Math.floor(Math.random() * 900 + 100)}`;
    const relRaw = colIndex.rel !== -1 ? row[colIndex.rel] : '';
    const familyRelationship = parseRelationshipString(relRaw || 'GRANDFATHER');

    let nic = (colIndex.nic !== -1 ? row[colIndex.nic] : row[2])?.trim() || '';
    let isProvisional = false;
    if (!nic) {
      nic = generateProvisionalNic(divisionCode);
      isProvisional = true;
    }

    const nameTa = (colIndex.nameTa !== -1 ? row[colIndex.nameTa] : row[3])?.trim() || 'முதியோர் பிரஜை';
    const nameEn = (colIndex.nameEn !== -1 ? row[colIndex.nameEn] : row[4])?.trim() || nameTa;
    const genderRaw = ((colIndex.gender !== -1 ? row[colIndex.gender] : row[5]) || '').toUpperCase();
    const rawDob = (colIndex.dob !== -1 ? row[colIndex.dob] : row[6])?.trim();
    const resolved = resolveDobAndGender(rawDob, nic, 1954);
    const dob = resolved.dob;
    const gender = genderRaw.startsWith('F') || familyRelationship === 'GRANDMOTHER' || familyRelationship === 'MOTHER' ? 'FEMALE' : (resolved.gender || 'MALE');
    const phone = (colIndex.phone !== -1 ? row[colIndex.phone] : row[7])?.trim() || '';
    const address = (colIndex.address !== -1 ? row[colIndex.address] : row[8])?.trim() || `வாகரை (${divisionCode})`;

    const allowanceRaw = ((colIndex.allowance !== -1 ? row[colIndex.allowance] : row[10]) || '').toUpperCase();
    const elderlyAllowanceStatus = allowanceRaw.includes('WAIT') ? 'WAITLIST' : allowanceRaw.includes('NOT') ? 'NOT_APPLIED' : 'RECEIVING';

    const livingRaw = ((colIndex.living !== -1 ? row[colIndex.living] : row[11]) || '').toUpperCase();
    const elderlyLivingStatus = livingRaw.includes('ALONE') ? 'ALONE' : livingRaw.includes('HOME') ? 'ELDER_CARE_HOME' : 'WITH_FAMILY';

    const mobilityRaw = ((colIndex.mobility !== -1 ? row[colIndex.mobility] : row[12]) || '').toUpperCase();
    const elderlyMobilityStatus = mobilityRaw.includes('BED') ? 'BEDRIDDEN' : mobilityRaw.includes('WHEEL') ? 'WHEELCHAIR' : mobilityRaw.includes('CANE') || mobilityRaw.includes('WALKER') ? 'WALKER_CANE' : 'NORMAL';

    const elderlyCaretakerName = (colIndex.caretakerName !== -1 ? row[colIndex.caretakerName] : row[13])?.trim() || '';
    const elderlyCaretakerPhone = (colIndex.caretakerPhone !== -1 ? row[colIndex.caretakerPhone] : row[14])?.trim() || '';

    const illnessRaw = ((colIndex.illness !== -1 ? row[colIndex.illness] : row[15]) || '').toUpperCase();
    let chronicIllness: ChronicIllness = 'NONE';
    if (illnessRaw.includes('CKD') || illnessRaw.includes('KIDNEY')) chronicIllness = 'CKD_KIDNEY';
    else if (illnessRaw.includes('CANCER')) chronicIllness = 'CANCER';
    else if (illnessRaw.includes('HEART')) chronicIllness = 'HEART_DISEASE';
    else if (illnessRaw.includes('DIABETES')) chronicIllness = 'DIABETES_CHRONIC';
    else if (illnessRaw.includes('DISABILITY')) chronicIllness = 'DISABILITY_PHYSICAL';

    const welfareRaw = (colIndex.welfare !== -1 ? row[colIndex.welfare] : row[16]) || 'ELDERLY';
    let welfareSchemes = parseWelfareChecklistString(welfareRaw);
    if (!welfareSchemes.includes('ELDERLY')) welfareSchemes.unshift('ELDERLY');

    const notes = (colIndex.notes !== -1 ? row[colIndex.notes] : row[17])?.trim() || 'முதியோர் CSV பதிவு';
    const systemId = generateSystemCitizenId(divisionCode, existingBeneficiaries.length + items.length + 1);

    items.push({
      id: systemId,
      nic,
      isProvisionalNic: isProvisional,
      nameTa,
      nameEn,
      gender,
      dob,
      phone,
      address,
      divisionCode,
      familyHead: familyRelationship === 'HEAD' || familyRelationship === 'FATHER',
      householdNo: `HH-${divisionCode}-001`,
      familyCode,
      familyRelationship,
      isElderly: true,
      elderlyAllowanceStatus,
      elderlyLivingStatus,
      elderlyMobilityStatus,
      elderlyCaretakerName,
      elderlyCaretakerPhone,
      welfareScheme: 'ELDERLY',
      welfareSchemes,
      welfareStatus: 'ACTIVE',
      chronicIllness,
      barcode: nic,
      qrPayload: `ID:${systemId}|NIC:${nic}|DIV:${divisionCode}|FAM:${familyCode}|ROLE:ELDERLY`,
      familyQrPayload: generateUniqueFamilyQrPayload(familyCode, divisionCode),
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { items, errors };
};

export const exportElderlyToCsv = (items: Beneficiary[]): string => {
  const lines = [ELDERLY_CSV_HEADERS.join(',')];
  for (const b of items) {
    if (!b.isElderly && calculateAge(b.dob) < 60 && b.welfareScheme !== 'ELDERLY') continue;
    lines.push([
      escapeCsv(b.familyCode || `FAM-${b.divisionCode}-001`),
      escapeCsv(b.familyRelationship || 'GRANDFATHER'),
      escapeCsv(b.nic),
      escapeCsv(b.nameTa),
      escapeCsv(b.nameEn),
      b.gender,
      b.dob,
      escapeCsv(b.phone),
      escapeCsv(b.address),
      escapeCsv(b.divisionCode),
      escapeCsv(b.elderlyAllowanceStatus || 'RECEIVING'),
      escapeCsv(b.elderlyLivingStatus || 'WITH_FAMILY'),
      escapeCsv(b.elderlyMobilityStatus || 'NORMAL'),
      escapeCsv(b.elderlyCaretakerName || ''),
      escapeCsv(b.elderlyCaretakerPhone || ''),
      escapeCsv(b.chronicIllness),
      escapeCsv(formatWelfareChecklistString(b.welfareSchemes, 'ELDERLY')),
      escapeCsv(b.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};

// ================= 2. PREGNANT MOTHERS CSV (கர்ப்பிணித் தாய்மார் பதிவு மாதிரி & அப்லோட்) ================= //
export const PREGNANT_MOTHERS_CSV_HEADERS = [
  'Family_Code',
  'Family_Relationship',
  'NIC',
  'Name_Tamil',
  'Division_Code',
  'Phone',
  'Registration_Date',
  'Pregnancy_Number',
  'Stamp_No',
  'Stamp_Value',
  'Welfare_Aids_Checklist',
  'Notes'
];

export const generatePregnantMothersSampleCsv = (): string => {
  const today = new Date().toISOString().slice(0, 10);
  const sampleRows = [
    PREGNANT_MOTHERS_CSV_HEADERS.join(','),
    `FAM-211-042,MOTHER,198871200456,தர்மலிங்கம் சரஸ்வதி,211,0771234567,${today},2,STAMP-211-042,4500,"PREGNANT_NUTRITION; SAMURDHI",2வது பிரசவம் - போசணை முத்திரை பெறுநர்`,
    `FAM-213-015,MOTHER,199462100492,செல்வராசா கவிதா,213,0779988776,${today},1,STAMP-213-015,4500,"PREGNANT_NUTRITION; ASWESUMA_POOR",1வது பிரசவம் - மாதாந்த போசாக்கு முத்திரை`,
    `FAM-212A-088,WIFE,199654300982,சிவராசா துஷிதா,212A,0776543210,${today},3,STAMP-212A-088,4500,PREGNANT_NUTRITION,3வது குழந்தை பதிவு - காத்திருப்பு வரிசை`,
    `FAM-211A-102,MOTHER,199187600321,ஜெயகுமார் மாலினி,211A,0772233445,${today},1,STAMP-211A-102,4500,"PREGNANT_NUTRITION; FISHERY_AID",கடற்றொழிலாளர் குடும்பம் - போசணைப் பொதி`
  ];
  return sampleRows.join('\n');
};

export const parsePregnantMothersFromCsv = (
  csvText: string,
  existingBeneficiaries: Beneficiary[]
): {
  beneficiaries: Beneficiary[];
  pregnantMothers: PregnantMotherRecord[];
  errors: string[];
} => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) return { beneficiaries: [], pregnantMothers: [], errors: ['CSV file is empty or missing data rows.'] };

  const beneficiaries: Beneficiary[] = [];
  const pregnantMothers: PregnantMotherRecord[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((c) => c.trim())) continue;

    const [
      familyCodeRaw,
      relRaw,
      nicRaw,
      nameRaw,
      divisionRaw,
      phoneRaw,
      regDateRaw,
      pregnancyNumRaw,
      stampNoRaw,
      stampValueRaw,
      welfareRaw,
      notesRaw
    ] = row;

    const divisionCode = divisionRaw?.trim() || '211';
    const familyCode = familyCodeRaw?.trim().toUpperCase() || `FAM-${divisionCode}-${Math.floor(Math.random() * 900 + 100)}`;
    const familyRelationship = parseRelationshipString(relRaw || 'MOTHER');
    const nic = nicRaw?.trim() || generateProvisionalNic(divisionCode);
    const name = nameRaw?.trim() || 'கர்ப்பிணித் தாய்';
    const phone = phoneRaw?.trim() || '';
    const regDate = regDateRaw?.trim() || new Date().toISOString().slice(0, 10);
    const pregnancyNumber = parseInt(pregnancyNumRaw?.trim() || '1') || 1;
    const stampNo = stampNoRaw?.trim() || `STAMP-${divisionCode}-${i}`;
    const stampValue = parseFloat(stampValueRaw?.trim() || '4500') || 4500;
    const notes = notesRaw?.trim() || 'கர்ப்பிணித் தாய் CSV பதிவு';

    let welfareSchemes = parseWelfareChecklistString(welfareRaw);
    if (!welfareSchemes.includes('PREGNANT_NUTRITION')) welfareSchemes.unshift('PREGNANT_NUTRITION');

    // Create PregnantMotherRecord
    const expectedCompletionDate = calculateTenMonthsDate(regDate);
    const monthlyCollections = createDefaultMonthlyCollections();

    const motherRecord: PregnantMotherRecord = {
      id: `MAT-${divisionCode}-${Date.now().toString().slice(-4)}-${i}`,
      name,
      nic,
      divisionCode,
      phone,
      familyCode,
      familyRelationship,
      welfareSchemes,
      registrationDate: regDate,
      expectedCompletionDate,
      stampIssueDate: regDate,
      stampNumber: stampNo,
      stampValue,
      pregnancyNumber,
      monthlyCollections,
      isCompleted: false,
      status: stampNo ? 'ACTIVE_COLLECTING' : 'WAITING_STAMP',
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pregnantMothers.push(motherRecord);

    const systemId = generateSystemCitizenId(divisionCode, i);
    const resolvedMother = resolveDobAndGender(undefined, nic, 1995);
    const beneficiaryRecord: Beneficiary = {
      id: systemId,
      nic,
      isProvisionalNic: nic.startsWith('TNIC'),
      nameTa: name,
      nameEn: name,
      gender: 'FEMALE',
      dob: resolvedMother.dob,
      phone,
      address: `வாகரை (${divisionCode})`,
      divisionCode,
      familyHead: false,
      householdNo: `HH-${divisionCode}-001`,
      familyCode,
      familyRelationship,
      isPregnantMother: true,
      pregnancyStageMonths: 5,
      welfareScheme: 'PREGNANT_NUTRITION',
      welfareSchemes,
      welfareStatus: 'ACTIVE',
      chronicIllness: 'NONE',
      barcode: nic,
      qrPayload: `ID:${systemId}|NIC:${nic}|DIV:${divisionCode}|FAM:${familyCode}|ROLE:PREGNANT`,
      familyQrPayload: generateUniqueFamilyQrPayload(familyCode, divisionCode),
      notes: `${notes} · முத்திரை: ${stampNo} (ரூ. ${stampValue})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    beneficiaries.push(beneficiaryRecord);
  }

  return { beneficiaries, pregnantMothers, errors };
};

export const exportPregnantMothersToCsv = (mothers: PregnantMotherRecord[]): string => {
  const lines = [PREGNANT_MOTHERS_CSV_HEADERS.join(',')];
  for (const m of mothers) {
    lines.push([
      escapeCsv(m.familyCode || `FAM-${m.divisionCode}-001`),
      escapeCsv(m.familyRelationship || 'MOTHER'),
      escapeCsv(m.nic),
      escapeCsv(m.name),
      escapeCsv(m.divisionCode),
      escapeCsv(m.phone),
      escapeCsv(m.registrationDate),
      m.pregnancyNumber,
      escapeCsv(m.stampNumber || ''),
      m.stampValue,
      escapeCsv(formatWelfareChecklistString(m.welfareSchemes, 'PREGNANT_NUTRITION')),
      escapeCsv(m.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};

// ================= 3. DISABILITY CSV (அங்கவீனர் / மாற்றுத்திறனாளி பதிவு மாதிரி & அப்லோட்) ================= //
export const DISABILITY_CSV_HEADERS = [
  'Family_Code',
  'Family_Relationship',
  'NIC',
  'Name_Tamil',
  'Name_English',
  'Gender',
  'DOB',
  'Phone',
  'Address',
  'Division_Code',
  'Disability_Nature',
  'Disability_Cause',
  'Chronic_Illness',
  'Welfare_Aids_Checklist',
  'Notes'
];

export const generateDisabilitySampleCsv = (): string => {
  const sampleRows = [
    DISABILITY_CSV_HEADERS.join(','),
    'FAM-211-042,DAUGHTER,TNIC-211-2026-10493,தர்மலிங்கம் தாரணி,Tharmalingam Tharanie,FEMALE,2016-08-10,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,"உடல் ஊனம் (Physical Disability)",BIRTH,DISABILITY_PHYSICAL,"DISABILITY; ASWESUMA_EXTREME",மகளுக்கு மாற்றுத்திறனாளி கொடுப்பனவு',
    'FAM-211A-102,SON,TNIC-211A-2026-0045,நகுலேஸ்வரன் பிரவீன்,Naguleswaran Praveen,MALE,2008-03-12,0772345678,"பள்ளிக்குடா, காயான்கேணி",211A,"செவிப்புலன் / பேச்சு குறைபாடு (Hearing & Speech)",BIRTH,NONE,"DISABILITY; EDUCATION_AID",கேள்வி குறைபாடுள்ள மாணவர்',
    'FAM-212A-088,FATHER,197031200115,மாணிக்கம் இராசதுரை,Manickam Rasadurai,MALE,1970-05-18,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",212A,"பார்வை குறைபாடு (Visual Impairment)",ILLNESS,NONE,"DISABILITY; SAMURDHI",கண் பார்வை குறைபாடு - தந்தை',
    'FAM-213-055,SON,199821400678,கணேசன் ரவிகுமார்,Ganeshan Ravikumar,MALE,1998-11-04,0775544332,"ஆலடி வீதி, கதிரவெளி",213,"பலதரப்பட்ட குறைபாடு (Multiple Disabilities)",ACCIDENT,DISABILITY_PHYSICAL,DISABILITY,விபத்தினால் ஏற்பட்ட ஊனம்'
  ];
  return sampleRows.join('\n');
};

export const parseDisabilityFromCsv = (
  csvText: string,
  existingBeneficiaries: Beneficiary[]
): { items: Beneficiary[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) return { items: [], errors: ['CSV file is empty or missing data rows.'] };

  const items: Beneficiary[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((c) => c.trim())) continue;

    const [
      familyCodeRaw,
      relRaw,
      nicRaw,
      nameTaRaw,
      nameEnRaw,
      genderRaw,
      dobRaw,
      phoneRaw,
      addressRaw,
      divisionRaw,
      natureRaw,
      causeRaw,
      illnessRaw,
      welfareRaw,
      notesRaw
    ] = row;

    const divisionCode = divisionRaw?.trim() || '211';
    const familyCode = familyCodeRaw?.trim().toUpperCase() || `FAM-${divisionCode}-${Math.floor(Math.random() * 900 + 100)}`;
    const familyRelationship = parseRelationshipString(relRaw || 'CHILD');

    let nic = nicRaw?.trim() || '';
    let isProvisional = false;
    if (!nic) {
      nic = generateProvisionalNic(divisionCode);
      isProvisional = true;
    }

    const nameTa = nameTaRaw?.trim() || 'மாற்றுத்திறனாளி பிரஜை';
    const nameEn = nameEnRaw?.trim() || nameTa;
    const resolvedDis = resolveDobAndGender(dobRaw, nic, 2005);
    const dob = resolvedDis.dob;
    const gender = (genderRaw?.trim().toUpperCase() === 'FEMALE' || familyRelationship === 'DAUGHTER' || familyRelationship === 'MOTHER') ? 'FEMALE' : (resolvedDis.gender || 'MALE');
    const phone = phoneRaw?.trim() || '';
    const address = addressRaw?.trim() || `வாகரை (${divisionCode})`;
    const disabilityNature = natureRaw?.trim() || 'உடல் ஊனம் (Physical Disability)';
    const disabilityCause = (causeRaw?.trim().toUpperCase().includes('WAR') ? 'WAR' : causeRaw?.trim().toUpperCase().includes('ACC') ? 'ACCIDENT' : causeRaw?.trim().toUpperCase().includes('ILL') ? 'ILLNESS' : 'BIRTH') as DisabilityCause;

    let welfareSchemes = parseWelfareChecklistString(welfareRaw);
    if (!welfareSchemes.includes('DISABILITY')) welfareSchemes.unshift('DISABILITY');

    const notes = notesRaw?.trim() || 'அங்கவீனர் CSV பதிவு';
    const systemId = generateSystemCitizenId(divisionCode, existingBeneficiaries.length + items.length + 1);

    items.push({
      id: systemId,
      nic,
      isProvisionalNic: isProvisional,
      nameTa,
      nameEn,
      gender,
      dob,
      phone,
      address,
      divisionCode,
      familyHead: familyRelationship === 'HEAD' || familyRelationship === 'FATHER',
      householdNo: `HH-${divisionCode}-001`,
      familyCode,
      familyRelationship,
      isPersonWithDisability: true,
      disabilityNature,
      disabilityType: disabilityNature,
      disabilityCause,
      disabilityRegistrationDate: new Date().toISOString().slice(0, 10),
      welfareScheme: 'DISABILITY',
      welfareSchemes,
      welfareStatus: 'ACTIVE',
      chronicIllness: 'DISABILITY_PHYSICAL',
      barcode: nic,
      qrPayload: `ID:${systemId}|NIC:${nic}|DIV:${divisionCode}|FAM:${familyCode}|ROLE:DISABILITY`,
      familyQrPayload: generateUniqueFamilyQrPayload(familyCode, divisionCode),
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { items, errors };
};

export const exportDisabilityToCsv = (items: Beneficiary[]): string => {
  const lines = [DISABILITY_CSV_HEADERS.join(',')];
  for (const b of items) {
    if (!b.isPersonWithDisability && b.chronicIllness !== 'DISABILITY_PHYSICAL' && b.welfareScheme !== 'DISABILITY') continue;
    lines.push([
      escapeCsv(b.familyCode || `FAM-${b.divisionCode}-001`),
      escapeCsv(b.familyRelationship || 'CHILD'),
      escapeCsv(b.nic),
      escapeCsv(b.nameTa),
      escapeCsv(b.nameEn),
      b.gender,
      b.dob,
      escapeCsv(b.phone),
      escapeCsv(b.address),
      escapeCsv(b.divisionCode),
      escapeCsv(b.disabilityNature || b.disabilityType || 'உடல் ஊனம்'),
      escapeCsv(b.disabilityCause || 'BIRTH'),
      escapeCsv(b.chronicIllness),
      escapeCsv(formatWelfareChecklistString(b.welfareSchemes, 'DISABILITY')),
      escapeCsv(b.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};

// ================= 4. ASWESUMA CSV (அஸ்வெசும நலன்புரி பதிவு மாதிரி & அப்லோட்) ================= //
export const ASWESUMA_CSV_HEADERS = [
  'Family_Code',
  'Family_Relationship',
  'NIC',
  'Name_Tamil',
  'Name_English',
  'Gender',
  'DOB',
  'Phone',
  'Address',
  'Division_Code',
  'Household_No',
  'Aswesuma_Category',
  'Welfare_Aids_Checklist',
  'Notes'
];

export const generateAswesumaSampleCsv = (): string => {
  const sampleRows = [
    ASWESUMA_CSV_HEADERS.join(','),
    'FAM-211-042,FATHER,198421500321,முருகேசு தர்மலிங்கம்,Murugesu Tharmalingam,MALE,1984-05-12,0771234567,"பிரதான வீதி, மாங்கேணி மத்தி",211,HH-211-042,ASWESUMA_EXTREME,"ASWESUMA_EXTREME; FARMER_SUBSIDY",அஸ்வெசும மிக ஏழ்மை - ரூ. 15000 கொடுப்பனவு',
    'FAM-212A-088,MOTHER,199074500812,கனகரத்தினம் கமலாதேவி,Kanagarathnam Kamaladevi,FEMALE,1990-11-20,0777654321,"கடற்கரை வீதி, வாகரை வடக்கு",212A,HH-212A-088,ASWESUMA_POOR,"ASWESUMA_POOR; SAMURDHI",அஸ்வெசும ஏழ்மை பிரிவு - பெண் தலைமைத்துவம்',
    'FAM-213-022,FATHER,197821500984,கதிர்காமர் சிவலிங்கம்,Kathirkamar Sivalingam,MALE,1978-06-14,0773344556,"மெயின் ரோடு, கதிரவெளி",213,HH-213-022,ASWESUMA_VULNERABLE,"ASWESUMA_VULNERABLE; FISHERY_AID",அஸ்வெசும இடர்படக்கூடியோர் - மீனவர் உதவி',
    'FAM-211B-019,MOTHER,198571200331,இராமநாதன் தெய்வானை,Ramanathan Deivanai,FEMALE,1985-09-08,0778899112,"புனானை கிழக்கு",211B,HH-211B-019,ASWESUMA_TRANSITIONAL,ASWESUMA_TRANSITIONAL,அஸ்வெசும இடைக்கால உதவி'
  ];
  return sampleRows.join('\n');
};

export const parseAswesumaFromCsv = (
  csvText: string,
  existingBeneficiaries: Beneficiary[]
): { items: Beneficiary[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) return { items: [], errors: ['CSV file is empty or missing data rows.'] };

  const items: Beneficiary[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((c) => c.trim())) continue;

    const [
      familyCodeRaw,
      relRaw,
      nicRaw,
      nameTaRaw,
      nameEnRaw,
      genderRaw,
      dobRaw,
      phoneRaw,
      addressRaw,
      divisionRaw,
      householdRaw,
      categoryRaw,
      welfareRaw,
      notesRaw
    ] = row;

    const divisionCode = divisionRaw?.trim() || '211';
    const familyCode = familyCodeRaw?.trim().toUpperCase() || `FAM-${divisionCode}-${Math.floor(Math.random() * 900 + 100)}`;
    const familyRelationship = parseRelationshipString(relRaw || 'HEAD');

    let nic = nicRaw?.trim() || '';
    let isProvisional = false;
    if (!nic) {
      nic = generateProvisionalNic(divisionCode);
      isProvisional = true;
    }

    const nameTa = nameTaRaw?.trim() || 'அஸ்வெசும பயனாளி';
    const nameEn = nameEnRaw?.trim() || nameTa;
    const resolvedAsw = resolveDobAndGender(dobRaw, nic, 1985);
    const dob = resolvedAsw.dob;
    const gender = (genderRaw?.trim().toUpperCase() === 'FEMALE' || familyRelationship === 'MOTHER' || familyRelationship === 'WIFE') ? 'FEMALE' : (resolvedAsw.gender || 'MALE');
    const phone = phoneRaw?.trim() || '';
    const address = addressRaw?.trim() || `வாகரை (${divisionCode})`;
    const householdNo = householdRaw?.trim() || `HH-${divisionCode}-001`;

    const cat = (categoryRaw || '').toUpperCase();
    let primaryScheme: WelfareScheme = 'ASWESUMA_POOR';
    if (cat.includes('EXTREME')) primaryScheme = 'ASWESUMA_EXTREME';
    else if (cat.includes('VULNERABLE')) primaryScheme = 'ASWESUMA_VULNERABLE';
    else if (cat.includes('TRANSITIONAL')) primaryScheme = 'ASWESUMA_TRANSITIONAL';

    let welfareSchemes = parseWelfareChecklistString(welfareRaw);
    if (!welfareSchemes.includes(primaryScheme)) welfareSchemes.unshift(primaryScheme);

    const notes = notesRaw?.trim() || 'அஸ்வெசும CSV பதிவு';
    const systemId = generateSystemCitizenId(divisionCode, existingBeneficiaries.length + items.length + 1);

    items.push({
      id: systemId,
      nic,
      isProvisionalNic: isProvisional,
      nameTa,
      nameEn,
      gender,
      dob,
      phone,
      address,
      divisionCode,
      familyHead: familyRelationship === 'HEAD' || familyRelationship === 'FATHER',
      householdNo,
      familyCode,
      familyRelationship,
      welfareScheme: primaryScheme,
      welfareSchemes,
      welfareStatus: 'ACTIVE',
      chronicIllness: 'NONE',
      barcode: nic,
      qrPayload: `ID:${systemId}|NIC:${nic}|DIV:${divisionCode}|FAM:${familyCode}|SCHEME:${primaryScheme}`,
      familyQrPayload: generateUniqueFamilyQrPayload(familyCode, divisionCode),
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { items, errors };
};

export const exportAswesumaToCsv = (items: Beneficiary[]): string => {
  const lines = [ASWESUMA_CSV_HEADERS.join(',')];
  for (const b of items) {
    if (!b.welfareScheme.startsWith('ASWESUMA') && !b.welfareSchemes?.some((s) => s.startsWith('ASWESUMA'))) continue;
    const aswesumaCat = b.welfareSchemes?.find((s) => s.startsWith('ASWESUMA')) || b.welfareScheme;
    lines.push([
      escapeCsv(b.familyCode || `FAM-${b.divisionCode}-001`),
      escapeCsv(b.familyRelationship || 'HEAD'),
      escapeCsv(b.nic),
      escapeCsv(b.nameTa),
      escapeCsv(b.nameEn),
      b.gender,
      b.dob,
      escapeCsv(b.phone),
      escapeCsv(b.address),
      escapeCsv(b.divisionCode),
      escapeCsv(b.householdNo),
      escapeCsv(aswesumaCat),
      escapeCsv(formatWelfareChecklistString(b.welfareSchemes, aswesumaCat)),
      escapeCsv(b.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};


// ================= ASSISTANCE / RELIEF CSV (உதவி வழங்கல் மாதிரி & அப்லோட்) ================= //
export const ASSISTANCE_CSV_HEADERS = [
  'Aid_ID',
  'Family_Code',
  'Beneficiary_NIC',
  'Beneficiary_Name',
  'Division_Code',
  'Aid_Category',
  'Aid_Description',
  'Amount_Or_Value',
  'Donor_Or_Org',
  'Distribution_Date',
  'Officer_Name',
  'Notes'
];

export const generateAssistanceSampleCsv = (): string => {
  const today = new Date().toISOString().slice(0, 10);
  const sampleRows = [
    ASSISTANCE_CSV_HEADERS.join(','),
    `AID-2026-101,FAM-211-042,198421500321,முருகேசு தர்மலிங்கம்,211,DRY_RATIONS,"25kg உலர் உணவுப் பொதி",Rs. 7500,பிரதேச செயலக அனர்த்த நிவாரணம்,${today},அட்மின் 1 (Admin 1),வெள்ள அனர்த்த நிவாரணம்`,
    `AID-2026-102,FAM-211-088,199074500812,கனகரத்தினம் கமலாதேவி,211,LIVELIHOOD_TOOL,"மின்சார தையல் இயந்திரம்",Rs. 45000,சமுர்த்தி வாழ்வாதார நிதி,${today},சமுர்த்தி அலுவலர் (Samurdhi),சுயதொழில் ஊக்குவிப்பு`,
    `AID-2026-103,FAM-212-019,195531200194,பொன்னம்பலம் செல்லையா,212,MEDICAL_ASSISTANCE,"முதியோர் மருத்துவ உதவி",Rs. 10000,சமூக சேவைகள் பிரிவு,${today},அட்மின் 2 (Admin 2),மருத்துவ சிகிச்சை உதவி`,
    `AID-2026-104,FAM-213A-015,198862100492,செல்வராசா கவிதா,213A,OTHER,"கர்ப்பிணித் தாய் போசணை உணவுப் பொதி",Rs. 5000,ECDO சிறுவர் & மகளிர் பிரிவு,${today},ECDO அலுவலர்,போசணை மேம்பாட்டுத் திட்டம்`
  ];
  return sampleRows.join('\n');
};

export const parseAssistanceFromCsv = (
  csvText: string,
  existingAssistance: AssistanceRecord[],
  existingBeneficiaries: Beneficiary[],
  batchInfo?: {
    programBatchId?: string;
    programTitle?: string;
    donor?: string;
    date?: string;
    category?: AidCategory;
  }
): {
  validRecords: AssistanceRecord[];
  duplicateRecords: AssistanceRecord[];
  errors: string[];
} => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) {
    return { validRecords: [], duplicateRecords: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  const validRecords: AssistanceRecord[] = [];
  const duplicateRecords: AssistanceRecord[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((cell) => cell.trim())) continue;

    const [
      aidIdRaw,
      familyCodeRaw,
      nicRaw,
      nameRaw,
      divisionRaw,
      categoryRaw,
      descRaw,
      amountRaw,
      donorRaw,
      dateRaw,
      officerRaw,
      notesRaw
    ] = row;

    const familyCode = familyCodeRaw?.trim().toUpperCase() || '';
    const nic = nicRaw?.trim() || '';
    const divisionCode = divisionRaw?.trim() || '211';
    const aidCategory = (batchInfo?.category || categoryRaw?.trim().toUpperCase() || 'DRY_RATIONS') as AidCategory;
    const distributedDate = batchInfo?.date || dateRaw?.trim() || new Date().toISOString().slice(0, 10);
    
    // Auto-generate ID using batch ID if provided
    const id = batchInfo?.programBatchId
      ? `${batchInfo.programBatchId}-${String(i).padStart(3, '0')}`
      : (aidIdRaw?.trim() || `AID-${Date.now()}-${i}`);

    // Lookup beneficiary for auto-completion if name not given
    const matchedBeneficiary = existingBeneficiaries.find(
      (b) => (familyCode && b.familyCode?.toUpperCase() === familyCode) || (nic && b.nic === nic)
    );

    const beneficiaryName = nameRaw?.trim() || matchedBeneficiary?.nameTa || matchedBeneficiary?.nameEn || 'பயனாளி';
    const familyQrPayload = matchedBeneficiary?.familyQrPayload || generateUniqueFamilyQrPayload(familyCode, divisionCode);

    // Apply batch program title if provided
    const aidDescription = batchInfo?.programTitle || descRaw?.trim() || 'அத்தியாவசிய உதவி / நிவாரண விநியோகம்';
    const donorOrOrganization = batchInfo?.donor || donorRaw?.trim() || 'பிரதேச செயலகம் வாகரை';

    // Run Duplicate Prevention Engine on this row!
    const duplicateCheck = checkDuplicateAssistance(
      familyCode,
      nic,
      aidCategory,
      [...existingAssistance, ...validRecords]
    );

    const record: AssistanceRecord = {
      id,
      familyCode: familyCode || matchedBeneficiary?.familyCode || `FAM-${divisionCode}-001`,
      familyQrPayload,
      beneficiaryNic: nic || matchedBeneficiary?.nic || '',
      beneficiaryName,
      divisionCode,
      aidCategory,
      aidDescription,
      amountOrValue: amountRaw?.trim() || 'வழங்கப்பட்டது',
      donorOrOrganization,
      distributedDate,
      officerName: officerRaw?.trim() || 'நிவாரண அலுவலர்',
      officerId: 'OFFICER',
      status: duplicateCheck.hasDuplicateRisk ? 'REJECTED_DUPLICATE' : 'DISTRIBUTED',
      isDuplicate: duplicateCheck.hasDuplicateRisk,
      duplicateWarningReason: duplicateCheck.hasDuplicateRisk ? duplicateCheck.warningMessageTa : undefined,
      notes: notesRaw?.trim() || (batchInfo?.programBatchId ? `Batch: ${batchInfo.programBatchId}` : ''),
      createdAt: new Date().toISOString(),
    };

    if (duplicateCheck.hasDuplicateRisk) {
      duplicateRecords.push(record);
    } else {
      validRecords.push(record);
    }
  }

  return { validRecords, duplicateRecords, errors };
};

export const exportAssistanceToCsv = (records: AssistanceRecord[]): string => {
  const lines = [ASSISTANCE_CSV_HEADERS.join(',')];
  for (const r of records) {
    lines.push([
      escapeCsv(r.id),
      escapeCsv(r.familyCode),
      escapeCsv(r.beneficiaryNic),
      escapeCsv(r.beneficiaryName),
      escapeCsv(r.divisionCode),
      escapeCsv(r.aidCategory),
      escapeCsv(r.aidDescription),
      escapeCsv(r.amountOrValue),
      escapeCsv(r.donorOrOrganization),
      escapeCsv(r.distributedDate),
      escapeCsv(r.officerName),
      escapeCsv(r.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};

export const exportFamiliesToCsv = (beneficiaries: Beneficiary[]): string => {
  const lines = [FAMILIES_CSV_HEADERS.join(',')];
  // Sort by familyCode then by relationship
  const sorted = [...beneficiaries].sort((a, b) => {
    const famA = a.familyCode || '';
    const famB = b.familyCode || '';
    if (famA !== famB) return famA.localeCompare(famB);
    return (a.familyHead ? 0 : 1) - (b.familyHead ? 0 : 1);
  });

  for (const b of sorted) {
    lines.push([
      escapeCsv(b.familyCode || `FAM-${b.divisionCode}-001`),
      escapeCsv(b.familyRelationship || (b.familyHead ? 'HEAD' : 'OTHER')),
      escapeCsv(b.nic),
      escapeCsv(b.nameTa),
      escapeCsv(b.nameEn),
      b.gender,
      b.dob,
      escapeCsv(b.phone),
      escapeCsv(b.address),
      escapeCsv(b.divisionCode),
      escapeCsv(b.householdNo),
      escapeCsv(formatWelfareChecklistString(b.welfareSchemes, b.welfareScheme)),
      escapeCsv(b.chronicIllness),
      escapeCsv(b.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};

export function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ================= LAND BRANCH CSV (காணி கிளை மாதிரி & அப்லோட்) (Requirement 05) ================= //
export const LAND_CSV_HEADERS = [
  'Permit_No',
  'Lot_No',
  'Plan_No',
  'Extent',
  'Land_Type',
  'GN_Division',
  'Owner_NIC',
  'Owner_Name_Tamil',
  'Owner_Name_English',
  'Phone',
  'Family_Code',
  'Permit_Status',
  'Issue_Date',
  'Annual_Tax_Status',
  'North_Boundary',
  'South_Boundary',
  'East_Boundary',
  'West_Boundary',
  'Notes'
];

export const generateLandSampleCsv = (): string => {
  const sampleRows = [
    LAND_CSV_HEADERS.join(','),
    'LDO/211/2024/042,14-B,BCO/VHR/2023/118,0A-1R-20P,CROWN_PERMIT,211,741239845V,கணபதிப்பிள்ளை சிவலிங்கம்,Kanapathipillai Sivalingam,0771234567,FAM-211-001,PERMIT_ISSUED,2024-05-12,PAID,"வீதி (Public Road)","முருகேசு காணி","வாய்க்கால் (Canal)","அரச காணி (Crown Land)",அரச காணி அனுமதிப்பத்திரம் ஒழுங்காக புதுப்பிக்கப்பட்டுள்ளது',
    'LDO/211A/2025/089,28,BCO/VHR/2024/204,1A-0R-00P,AGRICULTURAL,211A,891902697V,சின்னப்பு விஜயகுமார்,Sinnappu Vijayakumar,0760539158,FAM-211-042,PENDING_APPROVAL,2025-08-19,DUE,"காயான்கேணி வீதி","வயல் வெளி","அரச காணி","தவராசா காணி",அனுமதிப்பத்திர எல்லை மீளளவீடு செய்யப்பட வேண்டும்',
    'LDO/212/2024/015,07,BCO/VHR/2022/054,0A-2R-10P,RESIDENTIAL,212,195531200194,பொன்னம்பலம் செல்லையா,Ponnambalam Chelliah,0714567890,FAM-212-019,PERMIT_ISSUED,2022-11-04,PAID,"கோவில் வீதி","பாடசாலை எல்லை","பொது ஒழுங்கை","சிதம்பரப்பிள்ளை காணி",குடியிருப்பு காணி உறுதி',
    'LDO/213/2025/112,45,BCO/VHR/2025/088,2A-0R-00P,PADDY_FIELD,213,197821500984,கதிர்காமர் சிவலிங்கம்,Kathirkamar Sivalingam,0773344556,FAM-213-022,SETTLEMENT_STAGE,2025-02-14,DUE,"பிரதான கால்வாய்","கதிரவெளி வயல்","அரச காணி","இராமலிங்கம் வயல்",காணி கச்சேரி தீர்வு நடவடிக்கை'
  ];
  return sampleRows.join('\n');
};

export const parseLandFromCsv = (
  csvText: string,
  existingLand: LandRecord[] = []
): { items: LandRecord[]; errors: string[] } => {
  const rows = parseCsvContent(csvText);
  if (rows.length < 2) return { items: [], errors: ['CSV file is empty or missing data rows.'] };

  const items: LandRecord[] = [];
  const errors: string[] = [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const colIndex = {
    permitNo: headers.findIndex((h) => h.includes('permit')),
    lotNo: headers.findIndex((h) => h.includes('lot')),
    planNo: headers.findIndex((h) => h.includes('plan')),
    extent: headers.findIndex((h) => h.includes('extent') || h.includes('area')),
    landType: headers.findIndex((h) => h.includes('type')),
    division: headers.findIndex((h) => h.includes('division') || h.includes('gn')),
    nic: headers.findIndex((h) => h.includes('nic')),
    nameTa: headers.findIndex((h) => h.includes('name_tamil') || h.includes('tamil') || h === 'name' || h === 'owner_name'),
    nameEn: headers.findIndex((h) => h.includes('name_english') || h.includes('english')),
    phone: headers.findIndex((h) => h.includes('phone') || h.includes('mobile')),
    familyCode: headers.findIndex((h) => h.includes('family') || h.includes('fam')),
    status: headers.findIndex((h) => h.includes('status')),
    issueDate: headers.findIndex((h) => h.includes('date')),
    taxStatus: headers.findIndex((h) => h.includes('tax')),
    north: headers.findIndex((h) => h.includes('north')),
    south: headers.findIndex((h) => h.includes('south')),
    east: headers.findIndex((h) => h.includes('east')),
    west: headers.findIndex((h) => h.includes('west')),
    notes: headers.findIndex((h) => h.includes('note') || h.includes('remark')),
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3 || !row.some((c) => c.trim())) continue;

    const divisionCode = (colIndex.division !== -1 ? row[colIndex.division] : row[5])?.trim() || '211';
    const permitNo = (colIndex.permitNo !== -1 ? row[colIndex.permitNo] : row[0])?.trim() || `LDO/${divisionCode}/${new Date().getFullYear()}/${String(existingLand.length + items.length + 1).padStart(3, '0')}`;
    const lotNo = (colIndex.lotNo !== -1 ? row[colIndex.lotNo] : row[1])?.trim() || `${i}`;
    const planNo = (colIndex.planNo !== -1 ? row[colIndex.planNo] : row[2])?.trim() || `BCO/VHR/${new Date().getFullYear()}/${String(i).padStart(3, '0')}`;
    const extent = (colIndex.extent !== -1 ? row[colIndex.extent] : row[3])?.trim() || '0A-1R-00P';
    
    const typeRaw = ((colIndex.landType !== -1 ? row[colIndex.landType] : row[4]) || '').toUpperCase();
    let landType: LandType = 'CROWN_PERMIT';
    if (typeRaw.includes('AGRI')) landType = 'AGRICULTURAL';
    else if (typeRaw.includes('RESIDEN')) landType = 'RESIDENTIAL';
    else if (typeRaw.includes('COMMERC')) landType = 'COMMERCIAL';
    else if (typeRaw.includes('PADDY') || typeRaw.includes('வயல்')) landType = 'PADDY_FIELD';
    else if (typeRaw.includes('DISPUT')) landType = 'DISPUTED_LAND';

    const ownerNic = (colIndex.nic !== -1 ? row[colIndex.nic] : row[6])?.trim() || '';
    const ownerNameTa = (colIndex.nameTa !== -1 ? row[colIndex.nameTa] : row[7])?.trim() || 'காணி உரிமையாளர்';
    const ownerNameEn = (colIndex.nameEn !== -1 ? row[colIndex.nameEn] : row[8])?.trim() || ownerNameTa;
    const ownerPhone = (colIndex.phone !== -1 ? row[colIndex.phone] : row[9])?.trim() || '';
    const familyCode = (colIndex.familyCode !== -1 ? row[colIndex.familyCode] : row[10])?.trim().toUpperCase() || `FAM-${divisionCode}-001`;

    const statusRaw = ((colIndex.status !== -1 ? row[colIndex.status] : row[11]) || '').toUpperCase();
    let permitStatus: LandPermitStatus = 'PERMIT_ISSUED';
    if (statusRaw.includes('PENDING') || statusRaw.includes('காத்திருப்பு')) permitStatus = 'PENDING_APPROVAL';
    else if (statusRaw.includes('DISPUT') || statusRaw.includes('பிணக்கு')) permitStatus = 'IN_DISPUTE';
    else if (statusRaw.includes('SETTLE') || statusRaw.includes('கச்சேரி') || statusRaw.includes('தீர்வு')) permitStatus = 'SETTLEMENT_STAGE';
    else if (statusRaw.includes('CANCEL')) permitStatus = 'CANCELLED';

    const issueDate = (colIndex.issueDate !== -1 ? row[colIndex.issueDate] : row[12])?.trim() || new Date().toISOString().slice(0, 10);
    const taxRaw = ((colIndex.taxStatus !== -1 ? row[colIndex.taxStatus] : row[13]) || '').toUpperCase();
    const annualTaxStatus = taxRaw.includes('DUE') ? 'DUE' : taxRaw.includes('EXEMPT') ? 'EXEMPT' : 'PAID';

    const north = (colIndex.north !== -1 ? row[colIndex.north] : row[14])?.trim() || '';
    const south = (colIndex.south !== -1 ? row[colIndex.south] : row[15])?.trim() || '';
    const east = (colIndex.east !== -1 ? row[colIndex.east] : row[16])?.trim() || '';
    const west = (colIndex.west !== -1 ? row[colIndex.west] : row[17])?.trim() || '';
    const notes = (colIndex.notes !== -1 ? row[colIndex.notes] : row[18])?.trim() || 'காணி கிளை CSV பதிவு';

    const id = `LND-${divisionCode}-${new Date().getFullYear()}-${String(existingLand.length + items.length + 1).padStart(3, '0')}`;

    items.push({
      id,
      permitNo,
      lotNo,
      planNo,
      extent,
      landType,
      divisionCode,
      ownerNic,
      ownerNameTa,
      ownerNameEn,
      ownerPhone,
      familyCode,
      permitStatus,
      issueDate,
      annualTaxStatus,
      boundaries: {
        north,
        south,
        east,
        west,
      },
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { items, errors };
};

export const exportLandToCsv = (records: LandRecord[]): string => {
  const lines = [LAND_CSV_HEADERS.join(',')];
  for (const r of records) {
    lines.push([
      escapeCsv(r.permitNo),
      escapeCsv(r.lotNo),
      escapeCsv(r.planNo),
      escapeCsv(r.extent),
      escapeCsv(r.landType),
      escapeCsv(r.divisionCode),
      escapeCsv(r.ownerNic),
      escapeCsv(r.ownerNameTa),
      escapeCsv(r.ownerNameEn),
      escapeCsv(r.ownerPhone || ''),
      escapeCsv(r.familyCode || ''),
      escapeCsv(r.permitStatus),
      escapeCsv(r.issueDate || ''),
      escapeCsv(r.annualTaxStatus || 'PAID'),
      escapeCsv(r.boundaries?.north || ''),
      escapeCsv(r.boundaries?.south || ''),
      escapeCsv(r.boundaries?.east || ''),
      escapeCsv(r.boundaries?.west || ''),
      escapeCsv(r.notes || '')
    ].join(','));
  }
  return lines.join('\n');
};
