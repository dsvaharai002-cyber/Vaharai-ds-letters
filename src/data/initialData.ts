import { User, Letter } from '../types';
import { ALL_OFFICIAL_LETTERS, ALL_OFFICIAL_USERS } from './allOfficialLetters';

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

export const SYSTEM_DEFAULT_USERS: User[] = [
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
    Name: 'Divisional Secretary (Mega Master)',
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
    designation: 'Senior Land & Planning Officer',
    assignedDivisions: ['காணிப் பிரிவு (Land Division)', 'திட்டமிடல் பிரிவு (Planning)', 'வெளிக்களம் (Field)'],
    assignedOfficers: ['officer_land', 'officer_planning'],
  },
];

// Combine system demo accounts and all 108 official users without duplicates
const seenUserIds = new Set<string>();
const mergedUsers: User[] = [];

for (const u of SYSTEM_DEFAULT_USERS) {
  const uid = u.User_ID.toLowerCase().trim();
  seenUserIds.add(uid);
  mergedUsers.push(u);
}

for (const u of ALL_OFFICIAL_USERS) {
  const uid = u.User_ID.toLowerCase().trim();
  if (!seenUserIds.has(uid)) {
    seenUserIds.add(uid);
    mergedUsers.push(u);
  }
}

export const INITIAL_USERS: User[] = mergedUsers;

export const INITIAL_LETTERS: Letter[] = ALL_OFFICIAL_LETTERS;
