/**
 * Sri Lankan National Identity Card (NIC) Parser
 * Handles both Old 9-digit format (e.g., 842150321V) and New 12-digit format (e.g., 198421500321)
 * Automatically extracts:
 * - Gender: MALE or FEMALE
 * - Date of Birth: YYYY-MM-DD
 * - Exact Age in years
 */

export interface NicParseResult {
  isValid: boolean;
  format: 'OLD' | 'NEW' | 'PROVISIONAL' | 'INVALID';
  gender?: 'MALE' | 'FEMALE';
  dob?: string; // YYYY-MM-DD
  birthDate?: string; // YYYY-MM-DD (alias)
  age?: number;
  year?: number;
  month?: number;
  day?: number;
  error?: string;
}

const MONTH_DAYS = [
  { month: 1, days: 31, name: 'January' },
  { month: 2, days: 29, name: 'February' }, // Sri Lanka NIC system counts Feb as 29 days
  { month: 3, days: 31, name: 'March' },
  { month: 4, days: 30, name: 'April' },
  { month: 5, days: 31, name: 'May' },
  { month: 6, days: 30, name: 'June' },
  { month: 7, days: 31, name: 'July' },
  { month: 8, days: 31, name: 'August' },
  { month: 9, days: 30, name: 'September' },
  { month: 10, days: 31, name: 'October' },
  { month: 11, days: 30, name: 'November' },
  { month: 12, days: 31, name: 'December' },
];

export const parseSriLankanNic = (nicRaw: string): NicParseResult => {
  if (!nicRaw) {
    return { isValid: false, format: 'INVALID', error: 'NIC is empty' };
  }

  // Strip internal spaces, hyphens, and whitespace
  const cleanNic = nicRaw.trim().replace(/[\s\-_]/g, '').toUpperCase();

  // If provisional computer generated NIC (e.g., TNIC-211-2026-...)
  if (cleanNic.startsWith('TNIC-') || cleanNic.startsWith('TEMP')) {
    return {
      isValid: true,
      format: 'PROVISIONAL',
    };
  }

  let year: number;
  let dayOfYear: number;
  let isOldFormat = false;

  // Old NIC: 9 digits + 'V' or 'X' (or 9 digits without suffix letter from manual typo)
  const oldRegex = /^([0-9]{2})([0-9]{3})([0-9]{4})([VX]?)$/;
  // New NIC: 12 digits
  const newRegex = /^([0-9]{4})([0-9]{3})([0-9]{5})$/;

  if (cleanNic.length <= 10 && oldRegex.test(cleanNic)) {
    isOldFormat = true;
    const match = cleanNic.match(oldRegex)!;
    const yy = parseInt(match[1], 10);
    // If yy is <= 26, it could be 2000s, otherwise 1900s
    year = yy <= 26 ? 2000 + yy : 1900 + yy;
    dayOfYear = parseInt(match[2], 10);
  } else if (cleanNic.length === 12 && newRegex.test(cleanNic)) {
    const match = cleanNic.match(newRegex)!;
    year = parseInt(match[1], 10);
    dayOfYear = parseInt(match[2], 10);
  } else {
    return {
      isValid: false,
      format: 'INVALID',
      error: 'Invalid Sri Lankan NIC pattern. Old format: 9 digits + V/X, New format: 12 digits.',
    };
  }

  // Determine Gender: If dayOfYear > 500 => Female
  let gender: 'MALE' | 'FEMALE' = 'MALE';
  let adjustedDay = dayOfYear;

  if (adjustedDay > 500) {
    gender = 'FEMALE';
    adjustedDay -= 500;
  }

  // Validate day range (1 to 366)
  if (adjustedDay < 1 || adjustedDay > 366) {
    return {
      isValid: false,
      format: isOldFormat ? 'OLD' : 'NEW',
      error: `Invalid day of year: ${dayOfYear}`,
    };
  }

  // Calculate Month & Day
  let remainingDays = adjustedDay;
  let month = 1;
  let day = 1;

  for (const m of MONTH_DAYS) {
    if (remainingDays <= m.days) {
      month = m.month;
      day = remainingDays;
      break;
    }
    remainingDays -= m.days;
  }

  // Format DOB YYYY-MM-DD
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dob = `${year}-${mm}-${dd}`;

  // Calculate accurate Age
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - year;
  const mDiff = today.getMonth() - (month - 1);
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < day)) {
    age--;
  }

  return {
    isValid: true,
    format: isOldFormat ? 'OLD' : 'NEW',
    gender,
    dob,
    birthDate: dob,
    age: age >= 0 ? age : 0,
    year,
    month,
    day,
  };
};
