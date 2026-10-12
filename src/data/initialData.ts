import { User, Letter } from '../types';

export const DIVISIONS = [
  'நிர்வாகப் பிரிவு (Administration)',
  'காணிப் பிரிவு (Land Division)',
  'திட்டமிடல் பிரிவு (Planning)',
  'சமூக சேவை (Social)',
  'சமுர்த்தி (Samurdhi)',
  'கிராம அபிவிருத்தி (Rural Development)',
  'கணக்குப் பிரிவு (Accounts & Finance)',
  'தேசிய அடையாள அட்டை பிரிவு (NIC)',
  'தபால் & ஆவணப் பிரிவு (Mail & Records)',
  'வெளிக்களம் (Field)',
  'சிறுவர் பிரிவு (Field)',
  'பதிவாளர் கிளை (Registrar Branch)',
];

export const migrateDivision = (division?: string): string => {
  if (!division) return '';
  const trimmed = division.trim();
  if (!trimmed) return '';
  if (DIVISIONS.includes(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.includes('admin') || lower.includes('நிர்வாக')) return 'நிர்வாகப் பிரிவு (Administration)';
  if (lower.includes('land') || lower.includes('காணி')) return 'காணிப் பிரிவு (Land Division)';
  if (lower.includes('plan') || lower.includes('திட்டமிடல்')) return 'திட்டமிடல் பிரிவு (Planning)';
  if (lower.includes('social') || lower.includes('சமூக')) return 'சமூக சேவை (Social)';
  if (lower.includes('samurdhi') || lower.includes('சமுர்த்தி')) return 'சமுர்த்தி (Samurdhi)';
  if (lower.includes('rural') || lower.includes('கிராம')) return 'கிராம அபிவிருத்தி (Rural Development)';
  if (lower.includes('account') || lower.includes('கணக்கு') || lower.includes('finance')) return 'கணக்குப் பிரிவு (Accounts & Finance)';
  if (lower.includes('nic') || lower.includes('அடையாள அட்டை') || lower.includes('identity')) return 'தேசிய அடையாள அட்டை பிரிவு (NIC)';
  if (lower.includes('mail') || lower.includes('record') || lower.includes('தபால்') || lower.includes('ஆவண')) return 'தபால் & ஆவணப் பிரிவு (Mail & Records)';
  if (lower.includes('child') || lower.includes('சிறுவர்')) return 'சிறுவர் பிரிவு (Field)';
  if (lower.includes('field') || lower.includes('வெளிக்களம்')) return 'வெளிக்களம் (Field)';
  if (lower.includes('regist') || lower.includes('பதிவாளர்')) return 'பதிவாளர் கிளை (Registrar Branch)';

  return '';
};

export const POST_TYPES = [
  'Registered Post',
  'Normal Post',
  'Express Mail',
  'Hand Delivery',
  'Government Special Mail',
];
export const INITIAL_USERS: User[] = [
  {
    User_ID: 'admin',
    Password: '123',
    Name: 'Super Admin - DS Office',
    Role: 'Super Admin',
    Division: 'நிர்வாகப் பிரிவு (Administration)',
    Status: 'Active',
    designation: 'System Administrator',
  },
  {
    User_ID: 'mega01',
    Password: '123',
    Name: 'Divisional Secretary (Mega)',
    Role: 'Mega',
    Division: 'நிர்வாகப் பிரிவு (Administration)',
    Status: 'Active',
    designation: 'Divisional Secretary',
  },
  {
    User_ID: 'mail01',
    Password: '123',
    Name: 'Mail Officer (கடித பதிவாளர்)',
    Role: 'Mail Officer',
    Division: 'தபால் & ஆவணப் பிரிவு (Mail & Records)',
    Status: 'Active',
    designation: 'Senior Postal & Registry Officer',
  },
  {
    User_ID: 'luxury01',
    Password: '123',
    Name: 'Luxury Officer 1 (காணி & திட்டமிடல்)',
    Role: 'Luxury',
    Division: 'காணிப் பிரிவு (Land Division)',
    Status: 'Active',
    designation: 'Executive Officer - Land & Planning',
    assignedDivisions: [
      'காணிப் பிரிவு (Land Division)',
      'திட்டமிடல் பிரிவு (Planning)',
    ],
  },
  {
    User_ID: 'luxury02',
    Password: '123',
    Name: 'Luxury Officer 2 (நிர்வாகம் & கணக்கு)',
    Role: 'Luxury',
    Division: 'கணக்குப் பிரிவு (Accounts & Finance)',
    Status: 'Active',
    designation: 'Executive Officer - Admin & Finance',
    assignedDivisions: [
      'நிர்வாகப் பிரிவு (Administration)',
      'கணக்குப் பிரிவு (Accounts & Finance)',
    ],
  },
  {
    User_ID: 'luxury03',
    Password: '123',
    Name: 'Luxury Officer 3 (சமூகம் & சமுர்த்தி)',
    Role: 'Luxury',
    Division: 'சமூக சேவை (Social)',
    Status: 'Active',
    designation: 'Executive Officer - Social Development',
    assignedDivisions: [
      'சமூக சேவை (Social)',
      'சமுர்த்தி (Samurdhi)',
      'கிராம அபிவிருத்தி (Rural Development)',
    ],
  },
  {
    User_ID: 'luxury04',
    Password: '123',
    Name: 'Luxury Executive (அனைத்து பிரிவுகளும்)',
    Role: 'Luxury',
    Division: 'நிர்வாகப் பிரிவு (Administration)',
    Status: 'Active',
    designation: 'Assistant Divisional Secretary',
    assignedDivisions: DIVISIONS,
  },
  {
    User_ID: 'officer_land',
    Password: '123',
    Name: 'Land Branch Head',
    Role: 'Normal',
    Division: 'காணிப் பிரிவு (Land Division)',
    Status: 'Active',
    designation: 'Colonization Officer',
  },
];

export const INITIAL_LETTERS: Letter[] = [
  {
    id: 'LTR-2026-001',
    originalNo: 'KPN/DS/2026/001',
    date: '2026-10-05',
    dispatchedDate: '2026-10-03',
    letterType: 'Registered Post',
    registeredPostNo: 'RP-482109',
    inwardNo: 'WBB/OPS/POL/04',
    fromWhom: 'நலன்புரி நன்மைகள் சபை (Welfare Benefits Board), நிதி அமைச்சு',
    subject: 'அஸ்வெசும நலன்புரி கொடுப்பனவு தொடர்பான வழிகாட்டல் மற்றும் தகுதியற்ற கொடுப்பனவுகளை இடைநிறுத்துதல்',
    division: 'சமூக சேவை (Social)',
    forwardedDivisions: ['சமூக சேவை (Social)', 'சமுர்த்தி (Samurdhi)'],
    forwardedTo: ['luxury03'],
    action: 'Action Taken',
    replyResponse: 'பிரிவு உத்தியோகத்தர்களுக்கு சுற்றறிக்கை அனுப்பி வைக்கப்பட்டு நடவடிக்கை எடுக்கப்பட்டது.',
    fileNo: 'KN/SOC/2026/ASW-01',
    registeredBy: 'mail01',
    registeredByName: 'Mail Officer (கடித பதிவாளர்)',
    createdAt: '2026-10-05T08:30:00Z',
  },
  {
    id: 'LTR-2026-002',
    originalNo: 'KPN/DS/2026/002',
    date: '2026-10-04',
    dispatchedDate: '2026-10-02',
    letterType: 'Registered Post',
    registeredPostNo: 'RP-712834',
    inwardNo: 'BT/LND/REG/112',
    fromWhom: 'மாவட்ட செயலகம் மட்டக்களப்பு (District Secretariat Batticaloa)',
    subject: 'வாகரை பிரதேச காணி சுவீகரிப்பு மற்றும் அனுமதியற்ற குடியிருப்புகள் தொடர்பான கள அறிக்கை சமர்ப்பித்தல்',
    division: 'காணிப் பிரிவு (Land Division)',
    forwardedDivisions: ['காணிப் பிரிவு (Land Division)'],
    forwardedTo: ['luxury01'],
    action: 'Under Investigation',
    replyResponse: 'கிராம சேவையாளர் மூலம் கள ஆய்வு மேற்கொள்ளப்பட்டு வருகின்றது.',
    fileNo: 'KN/LND/2026/ACQ-14',
    registeredBy: 'mail01',
    registeredByName: 'Mail Officer (கடித பதிவாளர்)',
    createdAt: '2026-10-04T09:15:00Z',
  },
  {
    id: 'LTR-2026-003',
    originalNo: 'KPN/DS/2026/003',
    date: '2026-10-02',
    dispatchedDate: '2026-10-01',
    letterType: 'Normal Post',
    registeredPostNo: 'No',
    inwardNo: 'MOF/EXP/2026/89',
    fromWhom: 'பொது நிதியமைச்சு மற்றும் திறைசேரி (Ministry of Finance)',
    subject: '2026 ஆம் ஆண்டிற்கான மூலதன செலவின நிதி ஒதுக்கீடு மற்றும் காலாண்டு நிதி அறிக்கை',
    division: 'கணக்குப் பிரிவு (Accounts & Finance)',
    forwardedDivisions: ['கணக்குப் பிரிவு (Accounts & Finance)', 'திட்டமிடல் பிரிவு (Planning)'],
    forwardedTo: ['luxury02'],
    action: 'Not Yet Viewed',
    replyResponse: '',
    fileNo: '',
    registeredBy: 'mail01',
    registeredByName: 'Mail Officer (கடித பதிவாளர்)',
    createdAt: '2026-10-02T10:00:00Z',
  },
];