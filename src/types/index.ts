export type Role = 
  | 'SUPERADMIN' 
  | 'ADMIN 1' 
  | 'ADMIN 2' 
  | 'GRAMANIILATHARI' 
  | 'DATAENRY OFFCER' 
  | 'Reception Registrar' 
  | 'NORMAL' // Dedicated role for Public Live Counter Display TV screen
  | 'ECDO' // Early Childhood Development Officer (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)
  | 'MATERNITY_OFFICER' // கர்ப்பிணித் தாய்மார்கள் & முத்திரை பதிவாளர் (Pregnant Mothers & Nutrition Stamps Officer)
  | 'ELDERLY_OFFICER' // முதியோர் நலன்புரி உத்தியோகத்தர் (Senior Citizens Welfare Officer)
  | 'DISABILITY_OFFICER' // அங்கவீனர் பதிவாளர் (Disability Rights Officer)
  | 'WHH_OFFICER' // பெண் தலைமைத்துவ குடும்பங்கள் பதிவாளர் (Women-Headed Household Officer)
  | 'SAMURDHI_OFFICER' // சமுர்த்தி அபிவிருத்தி உத்தியோகத்தர் (Samurdhi Development Officer)
  | 'LAND_OFFICER'; // காணி உத்தியோகத்தர் (Land Branch Officer)

export type UserRole = Role;

export interface User {
  id: string; // e.g. "123", "456", "457", "789", "1112", "555", "999", "601", "602", "603", "604"
  password: string; // Unique password
  name: string;
  role: Role;
  division?: string; // GN Division code or "ALL"
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLogin?: string;
  email?: string;
}

export interface GNDivision {
  code: string; // e.g. "211", "211A", "212", etc.
  nameTa: string; // e.g. "வாகரை வடக்கு"
  nameEn: string; // e.g. "Vaharai North"
  gnOfficerName?: string;
  contactNumber?: string;
  population?: number;
  households?: number;
}

export type ChronicIllness = 
  | 'NONE'
  | 'CKD_KIDNEY'         // சிறுநீரக நோய் (Chronic Kidney Disease)
  | 'CANCER'             // புற்றுநோய்
  | 'THALASSEMIA'        // தலசீமியா
  | 'HEART_DISEASE'      // இதய நோய்
  | 'DIABETES_CHRONIC'   // தீவிர நீரிழிவு
  | 'DISABILITY_PHYSICAL'// உடல் ஊனம்
  | 'MENTAL_HEALTH'      // மனநலம்
  | 'OTHER_CHRONIC';     // ஏனைய நாள்பட்ட நோய்

export type WelfareScheme = 
  | 'NONE'
  | 'ASWESUMA_EXTREME'      // அஸ்வெசும - மிக ஏழ்மை (Extreme Poverty)
  | 'ASWESUMA_POOR'         // அஸ்வெசும - ஏழ்மை (Poverty)
  | 'ASWESUMA_VULNERABLE'   // அஸ்வெசும - இடர்படக்கூடியோர் (Vulnerable)
  | 'ASWESUMA_TRANSITIONAL' // அஸ்வெசும - இடைக்கால உதவி (Transitional)
  | 'SAMURDHI'              // சமுர்த்தி (Samurdhi)
  | 'ELDERLY'               // முதியோர் உதவிக்கொடுப்பனவு (Senior Citizen)
  | 'DISABILITY'            // மாற்றுத்திறனாளிகள் கொடுப்பனவு (Disability)
  | 'PREGNANT_NUTRITION'    // கர்ப்பிணித் தாய்மார் போசணை முத்திரை (Maternal Nutrition Stamp)
  | 'CHRONIC_KIDNEY'        // சிறுநீரக நோயாளர் நிதி உதவி (Kidney Patient Aid)
  | 'FARMER_SUBSIDY'        // விவசாய மானியம் & உரம் (Agrarian Subsidy)
  | 'FISHERY_AID'           // கடற்றொழிலாளர் உதவி & எரிபொருள் (Fishery Aid)
  | 'DISASTER_RELIEF'       // அனர்த்த நிவாரண உலர் உணவு (Disaster Relief)
  | 'EDUCATION_AID'         // கல்வி கற்றல் உபகரண உதவி (School Educational Aid)
  | 'SELF_EMPLOYMENT';      // சுயதொழில் வாழ்வாதார உதவி (Livelihood Grant)

export type WelfareStatus = 'ACTIVE' | 'PENDING' | 'WAITLIST' | 'REJECTED';

export type FamilyRelationship = 
  | 'FATHER'        // தந்தை (Father)
  | 'MOTHER'        // தாய் (Mother)
  | 'SON'           // மகன் (Son)
  | 'DAUGHTER'      // மகள் (Daughter)
  | 'HUSBAND'       // கணவன் (Husband)
  | 'WIFE'          // மனைவி (Wife)
  | 'GRANDFATHER'   // தாத்தா (Grandfather)
  | 'GRANDMOTHER'   // பாட்டி (Grandmother)
  | 'GRANDSON'      // பேரன் (Grandson)
  | 'GRANDDAUGHTER' // பேத்தி (Granddaughter)
  | 'CAREGIVER'     // பராமரிப்பாளர் (Caregiver)
  | 'HEAD'          // குடும்பத் தலைவர் (Head of Household)
  | 'SPOUSE'        // துணைவர் (Spouse)
  | 'CHILD'         // குழந்தை / பிள்ளை (Child)
  | 'PARENT'        // பெற்றோர் (Parent)
  | 'OTHER';        // ஏனைய உறவினர் (Other)

export const FAMILY_RELATIONSHIP_OPTIONS: { value: FamilyRelationship; labelTa: string; labelEn: string; icon: string }[] = [
  { value: 'FATHER', labelTa: 'தந்தை (Father)', labelEn: 'Father', icon: '👨' },
  { value: 'MOTHER', labelTa: 'தாய் (Mother)', labelEn: 'Mother', icon: '👩' },
  { value: 'SON', labelTa: 'மகன் (Son)', labelEn: 'Son', icon: '👦' },
  { value: 'DAUGHTER', labelTa: 'மகள் (Daughter)', labelEn: 'Daughter', icon: '👧' },
  { value: 'HUSBAND', labelTa: 'கணவன் (Husband)', labelEn: 'Husband', icon: '👨' },
  { value: 'WIFE', labelTa: 'மனைவி (Wife)', labelEn: 'Wife', icon: '👩' },
  { value: 'GRANDFATHER', labelTa: 'தாத்தா (Grandfather)', labelEn: 'Grandfather', icon: '👴' },
  { value: 'GRANDMOTHER', labelTa: 'பாட்டி (Grandmother)', labelEn: 'Grandmother', icon: '👵' },
  { value: 'GRANDSON', labelTa: 'பேரன் (Grandson)', labelEn: 'Grandson', icon: '👦' },
  { value: 'GRANDDAUGHTER', labelTa: 'பேத்தி (Granddaughter)', labelEn: 'Granddaughter', icon: '👧' },
  { value: 'HEAD', labelTa: 'குடும்பத் தலைவர் (Head)', labelEn: 'Family Head', icon: '👑' },
  { value: 'CAREGIVER', labelTa: 'பராமரிப்பாளர் (Caregiver)', labelEn: 'Caregiver', icon: '🤝' },
  { value: 'OTHER', labelTa: 'ஏனைய உறவினர் (Other Relative)', labelEn: 'Other Relative', icon: '👥' },
];

export interface WelfareSchemeItem {
  id: WelfareScheme;
  code: WelfareScheme;
  labelTa: string;
  labelEn: string;
  category: string;
  badgeColor: string;
  badgeClass: string;
}

export const ALL_WELFARE_SCHEMES_LIST: WelfareSchemeItem[] = [
  { id: 'ASWESUMA_EXTREME', code: 'ASWESUMA_EXTREME', labelTa: 'அஸ்வெசும - மிக ஏழ்மை (Extreme Poverty)', labelEn: 'Aswesuma Extreme Poverty', category: 'ASWESUMA', badgeColor: 'bg-red-100 text-red-800 border-red-200', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'ASWESUMA_POOR', code: 'ASWESUMA_POOR', labelTa: 'அஸ்வெசும - ஏழ்மை (Poverty)', labelEn: 'Aswesuma Poor', category: 'ASWESUMA', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'ASWESUMA_VULNERABLE', code: 'ASWESUMA_VULNERABLE', labelTa: 'அஸ்வெசும - இடர்படக்கூடியோர் (Vulnerable)', labelEn: 'Aswesuma Vulnerable', category: 'ASWESUMA', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'ASWESUMA_TRANSITIONAL', code: 'ASWESUMA_TRANSITIONAL', labelTa: 'அஸ்வெசும - இடைக்கால உதவி (Transitional)', labelEn: 'Aswesuma Transitional', category: 'ASWESUMA', badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'SAMURDHI', code: 'SAMURDHI', labelTa: 'சமுர்த்தி கொடுப்பனவு (Samurdhi)', labelEn: 'Samurdhi Allowance', category: 'SAMURDHI', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'ELDERLY', code: 'ELDERLY', labelTa: 'முதியோர் உதவிக்கொடுப்பனவு (Senior Citizen)', labelEn: 'Senior Citizen Allowance', category: 'ELDERLY', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'DISABILITY', code: 'DISABILITY', labelTa: 'மாற்றுத்திறனாளிகள் கொடுப்பனவு (Disability)', labelEn: 'Disability Allowance', category: 'DISABILITY', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'PREGNANT_NUTRITION', code: 'PREGNANT_NUTRITION', labelTa: 'கர்ப்பிணித் தாய்மார் போசணை முத்திரை (Nutrition Stamp)', labelEn: 'Pregnant Mother Nutrition Stamp', category: 'MATERNITY', badgeColor: 'bg-pink-100 text-pink-800 border-pink-200', badgeClass: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'CHRONIC_KIDNEY', code: 'CHRONIC_KIDNEY', labelTa: 'சிறுநீரக நோயாளர் நிதி உதவி (Kidney Patient Aid)', labelEn: 'Chronic Kidney Disease Aid', category: 'HEALTH', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200', badgeClass: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'FARMER_SUBSIDY', code: 'FARMER_SUBSIDY', labelTa: 'விவசாய மானியம் & உரம் (Agrarian Subsidy)', labelEn: 'Farmer Fertilizer & Agri Subsidy', category: 'LIVELIHOOD', badgeColor: 'bg-lime-100 text-lime-800 border-lime-200', badgeClass: 'bg-lime-100 text-lime-800 border-lime-200' },
  { id: 'FISHERY_AID', code: 'FISHERY_AID', labelTa: 'கடற்றொழிலாளர் உதவி & மண்ணெண்ணெய் (Fishery Aid)', labelEn: 'Fishery Fuel & Equipment Aid', category: 'LIVELIHOOD', badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200', badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'DISASTER_RELIEF', code: 'DISASTER_RELIEF', labelTa: 'அனர்த்த நிவாரண உலர் உணவு (Disaster Relief)', labelEn: 'Disaster Emergency Relief', category: 'EMERGENCY', badgeColor: 'bg-slate-100 text-slate-800 border-slate-200', badgeClass: 'bg-slate-100 text-slate-800 border-slate-200' },
  { id: 'EDUCATION_AID', code: 'EDUCATION_AID', labelTa: 'கல்வி கற்றல் உபகரண உதவி (School Stationery Aid)', labelEn: 'School Educational Aid', category: 'EDUCATION', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'SELF_EMPLOYMENT', code: 'SELF_EMPLOYMENT', labelTa: 'சுயதொழில் வாழ்வாதார உதவி (Livelihood Grant)', labelEn: 'Self-Employment Livelihood Grant', category: 'LIVELIHOOD', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200', badgeClass: 'bg-teal-100 text-teal-800 border-teal-200' },
];

export type CitizenStatus = 'ACTIVE' | 'DECEASED' | 'TRANSFERRED';

export type DisabilityCause = 'ACCIDENT' | 'BIRTH' | 'WAR' | 'ILLNESS' | 'OTHER';

export interface Beneficiary {
  id: string; // System-generated Citizen Registration Number (e.g. "VHR-211-2026-0042")
  nic: string; // Official NIC or Computer-generated Provisional NIC (e.g. "TNIC-211-2026-84920")
  isProvisionalNic: boolean; // Flag indicating computer-generated NIC for citizens without card
  nameTa: string;
  nameEn: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  phone: string;
  address: string;
  divisionCode: string; // e.g. "211", "212A", etc. or "GENERAL"
  familyHead: boolean;
  householdNo: string;
  familyCode?: string; // Unified Family / Household Group ID (e.g. "FAM-211-042")
  familyRelationship?: FamilyRelationship;
  status?: CitizenStatus; // 'ACTIVE' | 'DECEASED' (மரணப்பதிவு) | 'TRANSFERRED' (பதிவுமாற்றம்)
  deceasedDate?: string; // திகதி
  deathDate?: string; // திகதி (Deceased date alias)
  deathCertificateNo?: string; // இறப்பு சான்றிதழ் இலக்கம்
  deathRemarks?: string;
  transferDate?: string; // மாற்றம் செய்யப்பட்ட திகதி
  transferredDate?: string; // மாற்றம் செய்யப்பட்ட திகதி (Transfer date alias)
  transferDestination?: string; // இடமாற்றம் செய்யப்பட்ட பிரதேசம் / மாவட்டம்
  transferredToDivision?: string; // இடமாற்றம் செய்யப்பட்ட பிரதேசம் / மாவட்டம் (Transfer destination alias)
  transferReason?: string; // காரணங்கள்
  isPregnantMother?: boolean; // ECDO: கர்ப்பிணித் தாய்
  pregnancyStageMonths?: number; // கர்ப்ப காலம் (மாதங்கள் 1-9)
  isPersonWithDisability?: boolean; // அங்கவீனர் / மாற்றுத்திறனாளி
  disabilityType?: string; // ஊனத்தின் வகை / தன்மை
  disabilityNature?: string; // அங்கவீனத்தின் தன்மை (உடல் ஊனம், பார்வை, கேள்வி/பேச்சு, உள நலம், பலதரப்பட்ட)
  disabilityCause?: DisabilityCause; // உருவானது: விபத்து, பிறப்பு, யுத்தம், நோய், ஏனையவை
  disabilityRegistrationDate?: string;
  isWomanHeadedHousehold?: boolean; // பெண் தலைமைத்துவ குடும்பம்
  isSamurdhiBeneficiary?: boolean; // சமுர்த்தி பயனாளி
  isElderly?: boolean; // முதியோர் (Senior Citizen)
  elderlyAllowanceStatus?: 'RECEIVING' | 'WAITLIST' | 'NOT_APPLIED'; // முதியோர் கொடுப்பனவு நிலை
  elderlyLivingStatus?: 'WITH_FAMILY' | 'ALONE' | 'ELDER_CARE_HOME'; // வசிக்கும் நிலை
  elderlyCaretakerName?: string; // பராமரிப்பாளர் பெயர்
  elderlyCaretakerPhone?: string; // பராமரிப்பாளர் தொலைபேசி
  elderlyMobilityStatus?: 'NORMAL' | 'WALKER_CANE' | 'WHEELCHAIR' | 'BEDRIDDEN'; // இயங்குதிறன்
  manualQrCode?: string; // பயனரால் சுயமாக வழங்கப்படும் QR / அட்டை குறியீடு (Manual QR provided by officers)
  welfareScheme: WelfareScheme; // Primary scheme (for backwards compatibility)
  welfareSchemes?: WelfareScheme[]; // Multiple welfare aid checklist (Requirement 02)
  welfareStatus: WelfareStatus;
  chronicIllness: ChronicIllness;
  barcode: string; // Barcode representation of NIC or System ID
  qrPayload: string;
  familyQrPayload?: string; // Single Unified QR Payload shared by ALL members of this household
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDefinition {
  id: string; // e.g. "SRV-WELFARE", "SRV-LAND", or "SRV-CUSTOM-..."
  code: string; // e.g. "WELFARE_SCHEME", "LAND_PERMIT", "AGRI_PERMIT", etc.
  nameTa: string; // Service name in Tamil
  nameEn: string; // Service name in English
  counterNo: number; // Counter number e.g. 1-33
  prefix: string; // Token prefix e.g. "W", "L", "AG"
  defaultOfficerTa: string; // Default officer in Tamil
  defaultOfficerEn: string; // Default officer in English
  descriptionTa?: string;
  descriptionEn?: string;
  floor?: string;
  isActive: boolean;
  isCustom?: boolean;
  createdAt: string;
}

export type ServiceType = string;

export type TokenStatus = 'WAITING' | 'CALLING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';

export interface TokenForwardRecord {
  fromOfficer: string;
  toOfficer: string;
  forwardedAt: string;
  reason?: string;
}

export interface QueueToken {
  id: string;
  tokenNumber: string;
  serviceType: ServiceType;
  counterNo: number; // 01 to 33 based on office layout
  counterName?: string;
  floorLevel?: string; // 'Ground Floor (தரைத்தளம்)' | 'First Floor (முதலாம் மாடி)'
  officerToMeet: string; // யாரை பார்க்க வேண்டும்
  citizenName: string;
  citizenNic: string;
  citizenAddress?: string;
  citizenPhone?: string;
  divisionCode: string; // GN Division code or "GENERAL" (பொது)
  status: TokenStatus;
  issuedAt: string;
  calledAt?: string;
  completedAt?: string;
  notes?: string;
  barcode: string;
  forwardedFrom?: string;
  forwardHistory?: TokenForwardRecord[];
  servedByOfficerId?: string;
  servedByOfficerName?: string;
  rating?: number;
  ratingFeedback?: string;
  serviceDurationMinutes?: number;
  familyCode?: string;
  familyQrPayload?: string;
}

export interface DriveBackupItem {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  recordsCount?: number;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface AiReportResponse {
  success: boolean;
  report: string;
  note?: string;
}

// ================= ASSISTANCE / RELIEF DISTRIBUTION TYPES ================= //
export type AidCategory = 
  | 'DRY_RATIONS' // உலர் உணவுப் பொதி (Dry Rations)
  | 'CASH_GRANT' // பண உதவி (Cash Assistance)
  | 'AGRICULTURE_SEEDS' // விவசாய விதை / உரம் (Agriculture Seed/Fertilizer)
  | 'DISASTER_FLOOD' // அனர்த்த நிவாரணம் / வெள்ள நிவாரணம் (Disaster / Flood Relief)
  | 'HOUSING_REPAIR' // வீட்டு புனரமைப்பு உதவி (Housing Aid)
  | 'MEDICAL_ASSISTANCE' // மருத்துவ சிகிச்சை உதவி (Medical Aid)
  | 'EDUCATION_STATIONERY' // கல்வி கற்றல் உபகரணங்கள் (School Stationery)
  | 'LIVELIHOOD_TOOL' // வாழ்வாதார உபகரணங்கள் (தையல் இயந்திரம், படகு வலை)
  | 'OTHER';

export interface AssistanceRecord {
  id: string; // e.g. "AID-2026-0001"
  familyCode: string; // e.g. "FAM-211-042" (Unique family code)
  familyQrPayload: string; // Strictly unique Family QR payload
  beneficiaryNic: string;
  beneficiaryName: string;
  divisionCode: string;
  householdNo?: string;
  aidCategory: AidCategory;
  aidDescription: string; // e.g. "25kg உலர் உணவுப் பொதி (25kg Dry Rations)"
  amountOrValue: string; // e.g. "Rs. 7,500" or "1 Bag"
  donorOrOrganization: string; // e.g. "பிரதேச செயலக அனர்த்த நிவாரணப் பிரிவு"
  distributedDate: string; // YYYY-MM-DD
  officerName: string;
  officerId: string;
  status: 'DISTRIBUTED' | 'APPROVED' | 'REJECTED_DUPLICATE';
  isDuplicate?: boolean;
  duplicateWarningReason?: string;
  notes?: string;
  createdAt: string;
}

export interface DuplicateAidCheckResult {
  hasDuplicateRisk: boolean;
  duplicateCount: number;
  lastDistributedDate?: string;
  daysSinceLastAid?: number;
  previousRecords: AssistanceRecord[];
  warningMessageTa: string;
  warningMessageEn: string;
  severity: 'SAFE' | 'WARNING' | 'CRITICAL';
}

export interface FamilyCsvRecord {
  familyCode: string;
  uniqueFamilyQr: string;
  divisionCode: string;
  householdNo: string;
  familyHeadNic: string;
  familyHeadNameTa: string;
  familyHeadNameEn: string;
  phone: string;
  address: string;
  totalMembers: number;
  isWomanHeadedHousehold: boolean;
  isSamurdhiBeneficiary: boolean;
  hasPregnantMother: boolean;
  hasPersonWithDisability: boolean;
  notes?: string;
}

export interface MonthlyStampCollection {
  monthIndex: number; // 1 to 10
  monthLabelTa: string; // e.g. "மாதம் 01 (Month 1)"
  monthLabelEn: string; // e.g. "Month 01"
  collected: boolean;
  collectedDate?: string;
  collectedByOfficer?: string;
  notes?: string;
}

export interface PregnantMotherRecord {
  id: string; // e.g. "MAT-211-2026-001"
  name: string; // பெயர்
  nic: string; // தேசிய அடையாள அட்டை இலக்கம்
  divisionCode: string; // கிராம உத்தியோகத்தர் பிரிவு
  phone: string; // தொலைபேசி
  familyCode?: string; // குடும்ப QR / குறியீடு (Family Code)
  familyRelationship?: FamilyRelationship; // தாய் / மனைவி / etc.
  welfareSchemes?: WelfareScheme[]; // பல நலன்புரி உதவிகள் (Checklist)
  registrationDate: string; // பதிவு செய்த திகதி (YYYY-MM-DD)
  expectedCompletionDate: string; // முடிவடையும் திகதி 10 மாதங்களின் பின் (YYYY-MM-DD)
  stampIssueDate?: string; // முத்திரை வழங்கப்பட்ட திகதி
  stampNumber?: string; // முத்திரை இலக்கம்
  stampValue: number; // முத்திரையின் பெறுமதி (e.g. 4500)
  pregnancyNumber: number; // 01, 02, 03, 04 வது குழந்தை/பிரசவம்
  monthlyCollections: MonthlyStampCollection[]; // 10 மாதங்களும் முத்திரைக்கான பொருளை பெற்றதை அடையாளமிடும் இடம்
  isCompleted: boolean; // 10 மாதங்கள் அடையாளம் இட்ட பின் முடிவு பகுதிக்கு செல்லும் வசதி
  completedDate?: string;
  status: 'WAITING_STAMP' | 'ACTIVE_COLLECTING' | 'COMPLETED'; // காத்திருப்பு வரிசை / பொருட்கள் பெறும் நிலை / முடிவுற்றவை
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ================= LAND BRANCH MANAGEMENT TYPES (Requirement 05) ================= //
export type LandType = 
  | 'CROWN_PERMIT'      // அரச அனுமதிப்பத்திர காணி (LDO Permit Land)
  | 'AGRICULTURAL'      // விவசாய மானாவாரி / நீர்ப்பாசன காணி
  | 'RESIDENTIAL'       // குடியிருப்பு காணி
  | 'COMMERCIAL'        // வர்த்தக காணி
  | 'PADDY_FIELD'       // நன்செய் வயல் காணி
  | 'DISPUTED_LAND';    // பிணக்குக்குரிய காணி

export type LandPermitStatus = 
  | 'PERMIT_ISSUED'      // அனுமதிப்பத்திரம் வழங்கப்பட்டது (Permit Granted)
  | 'PENDING_APPROVAL'   // அனுமதிக்கு காத்திருப்பு (Pending DS Approval)
  | 'IN_DISPUTE'         // காணி பிணக்கு நிலுவையில் (Land Dispute Active)
  | 'SETTLEMENT_STAGE'   // காணி கச்சேரி / தீர்வு கட்டம் (Land Kachcheri Settlement)
  | 'CANCELLED';         // ரத்து செய்யப்பட்டது

export interface LandRecord {
  id: string; // e.g. "LND-211-2026-001"
  permitNo: string; // e.g. "LDO/211/2024/089"
  lotNo: string; // காணித் துண்டு இலக்கம்
  planNo: string; // வரைபட இலக்கம்
  extent: string; // விஸ்தீரணம் (e.g. "0A-1R-20P" or "0.5 Acres")
  landType: LandType;
  divisionCode: string; // GN Division e.g. "211"
  ownerNic: string; // உரிமையாளர் NIC
  ownerNameTa: string; // உரிமையாளர் பெயர் (தமிழ்)
  ownerNameEn: string; // உரிமையாளர் பெயர் (ஆங்கிலம்)
  ownerPhone?: string;
  familyCode?: string; // குடும்ப குறியீடு (FAM-xxx)
  permitStatus: LandPermitStatus;
  issueDate?: string;
  annualTaxStatus?: 'PAID' | 'DUE' | 'EXEMPT';
  boundaries?: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ================= HOUSEHOLD DATA & 100-POINT POVERTY SCORING ENGINE (Requirements 02, 04, 08) ================= //
export interface HouseholdCommonAssets {
  // Section 02: நிலம் மற்றும் கட்டிட சொத்துக்கள்
  ownsLand: boolean; // 2.1
  landExtent: 'LESS_THAN_HALF_ACRE' | 'MORE_THAN_HALF_ACRE' | 'NONE';
  ownsOtherLand: boolean; // 2.2
  otherLandExtent: 'LESS_THAN_ONE_ACRE' | 'MORE_THAN_ONE_ACRE' | 'NONE';

  // Section 03: பிற சொத்துக்கள்
  vehicleType: 'NONE' | 'MOTORCYCLE' | 'THREE_WHEELER' | 'CAR' | 'VAN_JEEP' | 'BUS' | 'LORRY' | 'HAND_TRACTOR' | 'FOUR_WHEEL_TRACTOR'; // 3.1
  machineryType: 'NONE' | 'MOTOR_BOAT' | 'NON_MOTOR_BOAT' | 'HARVESTER' | 'OTHER_EQUIPMENT'; // 3.2
  livestockType: 'NONE' | 'CATTLE' | 'GOATS' | 'PIGS' | 'POULTRY' | 'DUCKS' | 'OTHER'; // 3.3
  livestockCount: number;

  // Section 04: கடந்த மாத செலவுகள் (Expenses Rs.)
  expenses: {
    food: number;
    water: number;
    clothing: number;
    medical: number;
    rent: number;
    transport: number;
    electricity: number;
    fuelGas: number;
    telecom: number;
    education: number;
    religiousLeisure: number;
    loansDebt: number;
    total: number;
  };

  // Section 05: கடந்த மாத வருமானம் (Income Rs.)
  income: {
    unstableSources: number;
    salary: number;
    business: number;
    agriculture: number;
    rent: number;
    pension: number;
    samurdhi: number;
    elderlyAid: number;
    disabilityAid: number;
    ckdAid: number;
    foreignRemittance: number;
    localRemittance: number;
    otherGovAid: number;
    other: number;
    total: number;
  };

  // Section 06: மின்சார அலகுகள் (kWh)
  electricityUnitsKwh: number;

  // Section 07: வீடு பற்றிய விபரங்கள்
  unitType: 'SINGLE_1_STORY' | 'SINGLE_2_STORY' | 'ANNEX' | 'SLUM_SHACK' | 'LINE_ROOM' | 'OTHER'; // 7.1
  floorMaterial: 'CEMENT' | 'TILES' | 'CONCRETE' | 'CLAY' | 'SAND' | 'DILAPIDATED'; // 7.2
  roofMaterial: 'TILES' | 'ASBESTOS' | 'CONCRETE' | 'SHEET_ALUMINIUM' | 'THATCH_PALM' | 'DILAPIDATED'; // 7.3
  wallMaterial: 'BRICK' | 'CABOOK' | 'CEMENT_BLOCK' | 'CLAY_MUD' | 'PLANK' | 'PALM_LEAF' | 'DILAPIDATED'; // 7.4
  houseArea: 'LESS_THAN_500_SQFT' | 'MORE_THAN_500_SQFT'; // 7.5
  ownsCurrentHouse: boolean; // 8.1
  ownsOtherHouse: boolean; // 8.2

  // Section 09: ஒளி பெறும் முறை
  lightingSource: 'KEROSENE' | 'GRID_ELECTRICITY' | 'SOLAR' | 'GENERATOR_BATTERY';

  // Section 10: குடிநீர் ஆதாரம்
  waterSource: 'PROTECTED_WELL' | 'UNPROTECTED_WELL' | 'NWSDB_TAP' | 'COMMUNITY_TAP' | 'TUBE_WELL' | 'RIVER_TANK' | 'RAINWATER' | 'BOTTLED_RO';

  // Section 11 & 12: கழிப்பறை
  toiletLocation: 'INDOOR_EXCLUSIVE' | 'SHARED' | 'OUTDOOR_EXCLUSIVE' | 'PUBLIC' | 'OPEN_DEFECATION';
  toiletNature: 'WATER_SEAL_SEPTIC' | 'WATER_SEAL_PIT' | 'POUR_FLUSH' | 'DIRECT_PIT_SLAB' | 'OPEN_PIT_NO_SLAB' | 'NO_TOILET';

  // Section 13: தாய் அல்லது தந்தை மாத்திரம் உள்ள குடும்பம் (Single Parent)
  isSingleParent: boolean;
}

export interface BankDetails {
  bankName: string;
  branch: string;
  accountNumber: string;
  accountName: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
}

export interface HouseholdData {
  id: string; // e.g. "HH-5-1-03-01-010-00435"
  familyCode: string; // e.g. "FAM-211-042"
  householdReference: string; // Official reference
  applicationReference: string; // e.g. "20250515-4622119"
  applicantNameTa: string; // e.g. "சின்னப்பு விஜயகுமார்"
  applicantNameEn: string; // e.g. "SINNAPPU VIJAYAKUMAR"
  applicantNic: string; // e.g. "891902697V"
  phone: string; // e.g. "0760539158"
  address: string; // e.g. "SELVAPURAM KAYANKERNI"
  divisionCode: string; // e.g. "211A"
  status: 'DS_ENDORSED' | 'COMMITTEE_APPROVED' | 'GRIEVANCE_PENDING' | 'ACTIVE';
  selectedCategory: 'VULNERABLE' | 'EXTREME_POOR' | 'POOR' | 'TRANSITIONAL' | 'NON_VULNERABLE';
  objectionsStatus?: string; // e.g. "OC-08-10-2025-69523 [Completed]"
  appealsStatus?: string;
  bankDetails: BankDetails;
  commonAssets: HouseholdCommonAssets;
  totalMembersCount: number;
  familyQrPayload: string;
  // 100-Point Poverty Assessment Result
  score100: number; // 0 to 100
  priorityRank: 1 | 2 | 3 | 4; // 1 = Highest Priority (Emergency/Extreme), 4 = Non-vulnerable
  scoreBreakdown: {
    housingScore: number; // max 25
    sanitationScore: number; // max 20
    demographicsScore: number; // max 25
    economicScore: number; // max 30
  };
  createdAt: string;
  updatedAt: string;
}

// Configurable Poverty Weights Schema for Super Admin
export interface PovertyScoringWeights {
  housingMax: number; // default 25
  sanitationMax: number; // default 20
  demographicsMax: number; // default 25
  economicMax: number; // default 30
  // Item weights
  thatchRoofPoints: number; // 8
  mudWallPoints: number; // 7
  sandFloorPoints: number; // 5
  smallHouseAreaPoints: number; // 5
  noLandPoints: number; // 5
  noToiletPoints: number; // 8
  unprotectedWaterPoints: number; // 6
  keroseneLightingPoints: number; // 6
  singleParentPoints: number; // 8
  disabilityMemberPoints: number; // 7
  chronicIllnessPoints: number; // 5
  elderlyMemberPoints: number; // 5
  lowIncomePoints: number; // 15
  noVehiclePoints: number; // 5
  dailyWageLaborPoints: number; // 10
}

export const DEFAULT_POVERTY_WEIGHTS: PovertyScoringWeights = {
  housingMax: 25,
  sanitationMax: 20,
  demographicsMax: 25,
  economicMax: 30,
  thatchRoofPoints: 8,
  mudWallPoints: 7,
  sandFloorPoints: 5,
  smallHouseAreaPoints: 5,
  noLandPoints: 5,
  noToiletPoints: 8,
  unprotectedWaterPoints: 6,
  keroseneLightingPoints: 6,
  singleParentPoints: 8,
  disabilityMemberPoints: 7,
  chronicIllnessPoints: 5,
  elderlyMemberPoints: 5,
  lowIncomePoints: 15,
  noVehiclePoints: 5,
  dailyWageLaborPoints: 10,
};

// 100-Point Scoring Function
export const calculateFamilyPovertyScore = (
  common: HouseholdCommonAssets,
  members: Beneficiary[] = [],
  weights: PovertyScoringWeights = DEFAULT_POVERTY_WEIGHTS
): { score100: number; priorityRank: 1 | 2 | 3 | 4; breakdown: { housingScore: number; sanitationScore: number; demographicsScore: number; economicScore: number } } => {
  // 1. Housing & Living Conditions Score (Max weights.housingMax e.g. 25)
  let rawHousing = 0;
  if (common.roofMaterial === 'THATCH_PALM' || common.roofMaterial === 'DILAPIDATED') rawHousing += weights.thatchRoofPoints;
  else if (common.roofMaterial === 'SHEET_ALUMINIUM') rawHousing += Math.round(weights.thatchRoofPoints * 0.5);

  if (common.wallMaterial === 'CLAY_MUD' || common.wallMaterial === 'PALM_LEAF' || common.wallMaterial === 'DILAPIDATED') rawHousing += weights.mudWallPoints;
  else if (common.wallMaterial === 'PLANK') rawHousing += Math.round(weights.mudWallPoints * 0.5);

  if (common.floorMaterial === 'CLAY' || common.floorMaterial === 'SAND' || common.floorMaterial === 'DILAPIDATED') rawHousing += weights.sandFloorPoints;
  if (common.houseArea === 'LESS_THAN_500_SQFT') rawHousing += weights.smallHouseAreaPoints;
  if (!common.ownsLand || !common.ownsCurrentHouse) rawHousing += weights.noLandPoints;
  const housingScore = Math.min(weights.housingMax, rawHousing);

  // 2. Sanitation & Utilities Score (Max weights.sanitationMax e.g. 20)
  let rawSanitation = 0;
  if (common.toiletLocation === 'OPEN_DEFECATION' || common.toiletNature === 'NO_TOILET') rawSanitation += weights.noToiletPoints;
  else if (common.toiletLocation === 'SHARED' || common.toiletLocation === 'PUBLIC') rawSanitation += Math.round(weights.noToiletPoints * 0.5);

  if (common.waterSource === 'UNPROTECTED_WELL' || common.waterSource === 'RIVER_TANK') rawSanitation += weights.unprotectedWaterPoints;
  if (common.lightingSource === 'KEROSENE' || common.lightingSource === 'GENERATOR_BATTERY') rawSanitation += weights.keroseneLightingPoints;
  const sanitationScore = Math.min(weights.sanitationMax, rawSanitation);

  // 3. Demographics & Vulnerability Score (Max weights.demographicsMax e.g. 25)
  let rawDemo = 0;
  if (common.isSingleParent) rawDemo += weights.singleParentPoints;
  const hasDisability = members.some((m) => m.isPersonWithDisability || m.chronicIllness === 'DISABILITY_PHYSICAL');
  if (hasDisability) rawDemo += weights.disabilityMemberPoints;
  const hasChronic = members.some((m) => m.chronicIllness && m.chronicIllness !== 'NONE' && m.chronicIllness !== 'DISABILITY_PHYSICAL');
  if (hasChronic) rawDemo += weights.chronicIllnessPoints;
  const hasElderly = members.some((m) => m.isElderly);
  if (hasElderly) rawDemo += weights.elderlyMemberPoints;
  const demographicsScore = Math.min(weights.demographicsMax, rawDemo);

  // 4. Economic Profile Score (Max weights.economicMax e.g. 30)
  let rawEcon = 0;
  const totalIncome = common.income.total || (
    common.income.unstableSources + common.income.salary + common.income.agriculture + common.income.samurdhi
  );
  if (totalIncome <= 15000) rawEcon += weights.lowIncomePoints;
  else if (totalIncome <= 25000) rawEcon += Math.round(weights.lowIncomePoints * 0.6);

  if (common.vehicleType === 'NONE') rawEcon += weights.noVehiclePoints;
  if (common.income.unstableSources > 0 || common.machineryType === 'NONE') rawEcon += weights.dailyWageLaborPoints;
  const economicScore = Math.min(weights.economicMax, rawEcon);

  const totalScore = Math.min(100, Math.max(0, housingScore + sanitationScore + demographicsScore + economicScore));

  let priorityRank: 1 | 2 | 3 | 4 = 4;
  if (totalScore >= 80) priorityRank = 1;
  else if (totalScore >= 60) priorityRank = 2;
  else if (totalScore >= 40) priorityRank = 3;
  else priorityRank = 4;

  return {
    score100: totalScore,
    priorityRank,
    breakdown: {
      housingScore,
      sanitationScore,
      demographicsScore,
      economicScore,
    },
  };
};
