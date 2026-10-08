import React, { useState, useEffect } from 'react';
import {
  Shield,
  PlusCircle,
  LogOut,
  Users,
  Search,
  Filter,
  FileText,
  Building2,
  RotateCcw,
  Sparkles,
  Calendar,
  CheckCircle,
  Mail,
  Printer,
  Crown,
  Layers,
  ArrowUpDown,
  X,
  UserCheck,
} from 'lucide-react';
import { User, Letter, UserRole, LetterAction } from './types';
import { INITIAL_USERS, INITIAL_LETTERS, DIVISIONS, migrateDivision } from './data/initialData';
import {
  printLandscapeReport,
  ensureStringArray,
  normalizeAction,
  isKnownActionValue,
  normalizeRegisteredPostNo,
  doesLetterMatchOfficer,
  getOfficerDisplayName,
} from './utils/helpers';
import { LoginScreen } from './components/LoginScreen';
import { DivisionActionChart } from './components/DivisionActionChart';
import { DateFoldersList } from './components/DateFoldersList';
import { LetterRegisterModal } from './components/LetterRegisterModal';
import { LetterDetailAndChatModal } from './components/LetterDetailAndChatModal';
import { UserManagementModal } from './components/UserManagementModal';
import { VaharaiLogo } from './components/VaharaiLogo';

// --- Google Sheets Cloud Integration Setup ---
const WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzbfOEJuI00Rkg5dg18mpPRKJN5j4-r2uKyK7hM2EUKmL3n417m14MxOTnQuplJ_GyzMw/exec';

type CloudPayload = Record<string, any>;

const safeJsonParse = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

const postViaXhr = (url: string, bodyStr: string): Promise<boolean> =>
  new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.timeout = 8000;
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 400);
      xhr.onerror = () => resolve(false);
      xhr.ontimeout = () => resolve(false);
      xhr.send(bodyStr);
    } catch {
      resolve(false);
    }
  });

const getViaXhr = (url: string): Promise<any | null> =>
  new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 8000;
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
          try {
            resolve(JSON.parse(xhr.responseText));
            return;
          } catch {
            resolve(null);
            return;
          }
        }
        resolve(null);
      };
      xhr.onerror = () => resolve(null);
      xhr.ontimeout = () => resolve(null);
      xhr.send();
    } catch {
      resolve(null);
    }
  });

const sendDataToGoogleCloud = async (payload: CloudPayload): Promise<boolean> => {
  try {
    const action = String(payload.action ?? '').trim();
    if (!action) return false;

    const safeLetterAction = normalizeAction(
      payload.actionStatus ||
        payload.letterAction ||
        payload.ActionStatus ||
        payload.Action ||
        payload.extraData?.action ||
        payload.extraData?.actionStatus ||
        'Not Yet Viewed'
    );

    const safeLetterType =
      String(
        payload.letterType ||
          payload.postType ||
          payload.PostType ||
          payload.extraData?.letterType ||
          'Registered Post'
      ).trim() || 'Registered Post';

    const safeRegPostNo = normalizeRegisteredPostNo(
      payload.registeredPostNo ??
        payload.RegisteredPostNo ??
        payload.regPostNo ??
        payload.extraData?.registeredPostNo ??
        payload.extraData?.RegisteredPostNo
    );

    const safeFileNo = String(
      payload.fileNo ??
        payload.FileNo ??
        payload.extraData?.fileNo ??
        payload.extraData?.FileNo ??
        ''
    ).trim();

    const safeDivision = String(
      payload.division ??
        payload.Division ??
        payload.extraData?.division ??
        payload.extraData?.Division ??
        ''
    ).trim();

    const safeFwdDivs = ensureStringArray(
      payload.forwardedDivisions ?? payload.extraData?.forwardedDivisions
    );
    const safeFwdTo = ensureStringArray(
      payload.forwardedTo ?? payload.extraData?.forwardedTo
    );
    const safeReply = String(
      payload.replyResponse ??
        payload.ReplyResponse ??
        payload.extraData?.replyResponse ??
        ''
    );

    const baseExtra =
      payload.extraData && typeof payload.extraData === 'object'
        ? payload.extraData
        : {};

    const enrichedExtraData = {
      ...baseExtra,
      id: String(payload.id ?? baseExtra.id ?? ''),
      originalNo: String(payload.originalNo ?? baseExtra.originalNo ?? ''),
      date: String(payload.date ?? baseExtra.date ?? ''),
      dispatchedDate: String(
        payload.dispatchedDate ?? baseExtra.dispatchedDate ?? payload.date ?? ''
      ),
      letterType: safeLetterType,
      postType: safeLetterType,
      registeredPostNo: safeRegPostNo,
      RegisteredPostNo: safeRegPostNo,
      inwardNo: String(payload.inwardNo ?? baseExtra.inwardNo ?? ''),
      fromWhom: String(payload.fromWhom ?? baseExtra.fromWhom ?? ''),
      subject: String(payload.subject ?? baseExtra.subject ?? ''),
      division: safeDivision,
      forwardedDivisions: safeFwdDivs,
      forwardedTo: safeFwdTo,
      action: safeLetterAction,
      actionStatus: safeLetterAction,
      ActionStatus: safeLetterAction,
      replyResponse: safeReply,
      fileNo: safeFileNo,
      FileNo: safeFileNo,
      updatedAt: new Date().toISOString(),
    };

    const bodyData = {
      action: action,
      id: String(payload.id ?? ''),
      ID: String(payload.id ?? ''),
      originalNo: String(payload.originalNo ?? ''),
      OriginalNo: String(payload.originalNo ?? ''),
      date: String(payload.date ?? ''),
      Date: String(payload.date ?? ''),
      dispatchedDate: String(payload.dispatchedDate ?? payload.date ?? ''),
      DispatchedDate: String(payload.dispatchedDate ?? payload.date ?? ''),
      letterType: safeLetterType,
      LetterType: safeLetterType,
      postType: safeLetterType,
      PostType: safeLetterType,
      Post_Type: safeLetterType,
      'Post Type': safeLetterType,
      registeredPostNo: safeRegPostNo,
      RegisteredPostNo: safeRegPostNo,
      regPostNo: safeRegPostNo,
      RegPostNo: safeRegPostNo,
      Registered_Post_No: safeRegPostNo,
      'Registered Post No': safeRegPostNo,
      inwardNo: String(payload.inwardNo ?? ''),
      InwardNo: String(payload.inwardNo ?? ''),
      fromWhom: String(payload.fromWhom ?? ''),
      FromWhom: String(payload.fromWhom ?? ''),
      subject: String(payload.subject ?? ''),
      Subject: String(payload.subject ?? ''),
      division: safeDivision,
      Division: safeDivision,
      forwardedDivisions: safeFwdDivs,
      ForwardedDivisions: safeFwdDivs.join(', '),
      forwardedTo: safeFwdTo,
      ForwardedTo: safeFwdTo.join(', '),
      actionStatus: safeLetterAction,
      ActionStatus: safeLetterAction,
      Action: safeLetterAction,
      letterAction: safeLetterAction,
      replyResponse: safeReply,
      ReplyResponse: safeReply,
      fileNo: safeFileNo,
      FileNo: safeFileNo,
      file_no: safeFileNo,
      File_No: safeFileNo,
      'File No': safeFileNo,
      Password: String(payload.Password ?? ''),
      Name: String(payload.Name ?? ''),
      Role: String(payload.Role ?? ''),
      Status: String(payload.Status ?? ''),
      User_ID: String(payload.User_ID ?? ''),
      assignedDivisions:
        payload.assignedDivisions ?? payload.extraData?.assignedDivisions ?? [],
      assignedOfficers:
        payload.assignedOfficers ?? payload.extraData?.assignedOfficers ?? [],
      extraData: enrichedExtraData,
      ExtraData: JSON.stringify(enrichedExtraData),
    };

    const jsonStr = JSON.stringify(bodyData);

    // 1. Try browser XHR (avoids window.fetch error hooks while directly updating Google Apps Script)
    const xhrOk = await postViaXhr(WEB_APP_URL, jsonStr);
    if (xhrOk) return true;

    // 2. Try server-side proxy fallback (/api/cloud-sync)
    try {
      const proxyRes = await fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
      });
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        if (proxyData?.ok) return true;
      }
    } catch {
      // Ignore proxy errors cleanly
    }

    // 3. Fire-and-forget sendBeacon fallback if available
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([jsonStr], { type: 'text/plain;charset=utf-8' });
        if (navigator.sendBeacon(WEB_APP_URL, blob)) {
          return true;
        }
      } catch {
        // Ignore sendBeacon errors
      }
    }

    return false;
  } catch {
    return false;
  }
};

const fetchCloudData = async (): Promise<{
  letters: any[][];
  users: any[][];
  offline?: boolean;
}> => {
  // 1. Try direct XHR in browser first (does not trigger window.fetch console errors on redirect/CORS)
  const directData = await getViaXhr(`${WEB_APP_URL}?type=get_all&t=${Date.now()}`);
  if (directData && (Array.isArray(directData.letters) || Array.isArray(directData.users))) {
    return {
      letters: Array.isArray(directData.letters) ? directData.letters : [],
      users: Array.isArray(directData.users) ? directData.users : [],
      offline: false,
    };
  }

  // 2. Fallback to local backend proxy (/api/cloud-sync) which always returns HTTP 200
  try {
    const response = await fetch(`/api/cloud-sync?t=${Date.now()}`);
    if (response.ok) {
      const data = await response.json();
      if (data && !data.offline && (Array.isArray(data.letters) || Array.isArray(data.users))) {
        return {
          letters: Array.isArray(data.letters) ? data.letters : [],
          users: Array.isArray(data.users) ? data.users : [],
          offline: false,
        };
      }
    }
  } catch {
    // Silent fallback to local cache
  }

  return { letters: [], users: [], offline: true };
};

const normalizeDateStr = (val: any): string => {
  if (!val) return '';
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  return str;
};

const findExtraData = (row: any[]): Record<string, any> => {
  if (!Array.isArray(row)) return {};

  // Check if both index 14 (original ADD_LETTER ExtraData column) and index 13 (shifted UPDATE_LETTER ExtraData column) contain JSON
  const raw13 = typeof row[13] === 'string' && row[13].trim().startsWith('{')
    ? safeJsonParse<Record<string, any>>(row[13], {})
    : {};
  const raw14 = typeof row[14] === 'string' && row[14].trim().startsWith('{')
    ? safeJsonParse<Record<string, any>>(row[14], {})
    : {};
  const raw15 = typeof row[15] === 'string' && row[15].trim().startsWith('{')
    ? safeJsonParse<Record<string, any>>(row[15], {})
    : {};

  // If a shifted UPDATE_LETTER wrote newer JSON to index 13 while index 14 kept the initial ADD_LETTER JSON,
  // merge them with raw13 taking precedence over raw14 so updated Action and FileNo are preserved!
  if (Object.keys(raw13).length > 0 || Object.keys(raw14).length > 0 || Object.keys(raw15).length > 0) {
    return {
      ...raw14,
      ...raw13,
      ...raw15,
    };
  }

  // Otherwise search from end for any serialized JSON object
  for (let i = row.length - 1; i >= 0; i--) {
    const val = row[i];
    if (typeof val === 'string' && val.trim().startsWith('{')) {
      const p = safeJsonParse<Record<string, any>>(val, {});
      if (p && typeof p === 'object' && (p.originalNo || p.id || p.subject || p.inwardNo)) {
        return p;
      }
    }
  }
  return {};
};

/**
 * Google Sheet Letters columns schema:
 * 0: ID
 * 1: OriginalNo
 * 2: Date
 * 3: DispatchedDate
 * 4: Post Type (letterType)
 * 5: RegisteredPostNo (defaults to 'No' if none)
 * 6: InwardNo
 * 7: FromWhom
 * 8: Subject
 * 9: Division
 * 10: ForwardedDivisions
 * 11: ForwardedTo
 * 12: ActionStatus
 * 13: ReplyResponse
 * 14: ExtraData (or FileNo)
 * 15: FileNo (or ExtraData)
 *
 * Also detects and auto-heals rows where columns 5..14 shifted left by 1 column
 * (e.g. if RegisteredPostNo was skipped during an older sheet update).
 */
const normalizeLetter = (row: any[]): Letter => {
  const extra = findExtraData(row);

  const row13IsJson = typeof row[13] === 'string' && row[13].trim().startsWith('{');
  const row12IsJson = typeof row[12] === 'string' && row[12].trim().startsWith('{');

  // Detect if columns starting at index 5 (RegisteredPostNo) shifted 1 position left
  const isShiftedLeftAt5 =
    row13IsJson || (isKnownActionValue(row[11]) && !isKnownActionValue(row[12]));

  const colPostType = row[4];
  const colRegPostNo = isShiftedLeftAt5 ? undefined : row[5];
  const colInwardNo = isShiftedLeftAt5 ? row[5] : row[6];
  const colFromWhom = isShiftedLeftAt5 ? row[6] : row[7];
  const colSubject = isShiftedLeftAt5 ? row[7] : row[8];
  const colDivision = isShiftedLeftAt5 ? row[8] : row[9];
  const colForwardedDivs = isShiftedLeftAt5 ? row[9] : row[10];
  const colForwardedTo = isShiftedLeftAt5 ? row[10] : row[11];
  const colActionStatus = isShiftedLeftAt5 ? row[11] : row[12];
  const colReplyResponse = isShiftedLeftAt5
    ? row12IsJson
      ? ''
      : row[12]
    : row13IsJson
    ? ''
    : row[13];

  const rawForwardedDivs =
    extra.forwardedDivisions !== undefined ? extra.forwardedDivisions : colForwardedDivs;
  let parsedForwardedDivisions = ensureStringArray(rawForwardedDivs)
    .map(migrateDivision)
    .filter(Boolean);

  const rawForwardedTo =
    extra.forwardedTo !== undefined ? extra.forwardedTo : colForwardedTo;
  const parsedForwardedTo = ensureStringArray(rawForwardedTo);

  const primaryDiv = migrateDivision(String(extra.division ?? colDivision ?? ''));
  if (parsedForwardedDivisions.length === 0 && primaryDiv) {
    parsedForwardedDivisions = [primaryDiv];
  }

  const dateVal = normalizeDateStr(extra.date ?? row[2] ?? '');
  const dispatchedVal = normalizeDateStr(extra.dispatchedDate ?? row[3] ?? dateVal);

  // Determine ActionStatus safely: prefer valid known action from column or extraData
  const extraActionCandidate = extra.action || extra.actionStatus || extra.ActionStatus;
  let resolvedAction: LetterAction = 'Not Yet Viewed';
  if (isKnownActionValue(extraActionCandidate) && isShiftedLeftAt5) {
    resolvedAction = normalizeAction(extraActionCandidate);
  } else if (isKnownActionValue(colActionStatus)) {
    resolvedAction = normalizeAction(colActionStatus);
  } else if (isKnownActionValue(extraActionCandidate)) {
    resolvedAction = normalizeAction(extraActionCandidate);
  } else {
    resolvedAction = normalizeAction(colActionStatus || extraActionCandidate || 'Not Yet Viewed');
  }

  // Extract FileNo from extraData or dedicated sheet column (index 14 or 15 if non-JSON)
  const sheetFileNoCol =
    row[15] && !String(row[15]).trim().startsWith('{')
      ? row[15]
      : row[14] && !String(row[14]).trim().startsWith('{')
      ? row[14]
      : '';

  return {
    ...extra,
    id: String(extra.id ?? row[0] ?? `LTR-${Date.now()}`),
    originalNo: String(extra.originalNo ?? row[1] ?? ''),
    date: dateVal,
    dispatchedDate: dispatchedVal,
    letterType: String(extra.letterType ?? colPostType ?? 'Registered Post').trim() || 'Registered Post',
    registeredPostNo: normalizeRegisteredPostNo(
      extra.registeredPostNo ?? extra.RegisteredPostNo ?? colRegPostNo
    ),
    inwardNo: String(extra.inwardNo ?? colInwardNo ?? ''),
    fromWhom: String(extra.fromWhom ?? colFromWhom ?? ''),
    subject: String(extra.subject ?? colSubject ?? ''),
    division: primaryDiv,
    forwardedDivisions: parsedForwardedDivisions,
    forwardedTo: parsedForwardedTo,
    action: resolvedAction,
    replyResponse: String(
      extra.replyResponse ?? extra.ReplyResponse ?? colReplyResponse ?? ''
    ),
    fileNo: String(extra.fileNo ?? extra.FileNo ?? sheetFileNoCol ?? '').trim(),
    registeredBy: String(extra.registeredBy ?? 'mail01'),
    registeredByName: String(extra.registeredByName ?? 'Mail Officer (கடித பதிவாளர்)'),
    createdAt: String(extra.createdAt ?? ''),
  };
};

/**
 * Google Sheet Users columns schema:
 * 0: User_ID, 1: Password, 2: Name, 3: Role, 4: Division, 5: Status, 6: AssignedDivisions, 7: AssignedOfficers, 8: ExtraData
 */
const normalizeUser = (row: any[]): User => {
  const extra = safeJsonParse<Record<string, any>>(row[8] || row[row.length - 1], {});
  const rawAssignedDivs = extra.assignedDivisions !== undefined ? extra.assignedDivisions : row[6];
  const assignedDivs = ensureStringArray(rawAssignedDivs).map(migrateDivision).filter(Boolean);
  const rawAssignedOffs = extra.assignedOfficers !== undefined ? extra.assignedOfficers : row[7];
  const assignedOffs = ensureStringArray(rawAssignedOffs);

  return {
    ...extra,
    User_ID: String(row[0] ?? extra.User_ID ?? ''),
    Password: String(row[1] ?? extra.Password ?? ''),
    Name: String(row[2] ?? extra.Name ?? ''),
    Role: (row[3] ?? extra.Role ?? 'User') as UserRole,
    Division: migrateDivision(String(row[4] ?? extra.Division ?? '')),
    Status: (row[5] ?? extra.Status ?? 'Active'),
    assignedDivisions: assignedDivs.length > 0 ? assignedDivs : undefined,
    assignedOfficers: assignedOffs.length > 0 ? assignedOffs : undefined,
  };
};

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('kpn_vaharai_users_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const uniqueUsers: User[] = [];
          for (const u of parsed) {
            if (!u || typeof u !== 'object') continue;
            const uid = (u.User_ID || '').trim().toLowerCase();
            if (uid && !seen.has(uid)) {
              seen.add(uid);
              const assignedDivs = ensureStringArray(u.assignedDivisions).map(migrateDivision).filter(Boolean);
              const assignedOffs = ensureStringArray(u.assignedOfficers);
              uniqueUsers.push({
                ...u,
                Division: migrateDivision(u.Division),
                assignedDivisions: assignedDivs.length > 0 ? assignedDivs : undefined,
                assignedOfficers: assignedOffs.length > 0 ? assignedOffs : undefined,
              });
            }
          }
          if (uniqueUsers.length > 0) return uniqueUsers;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return INITIAL_USERS;
  });

  const [letters, setLetters] = useState<Letter[]>(() => {
    try {
      const saved = localStorage.getItem('kpn_vaharai_letters_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seenIds = new Set<string>();
          const uniqueLetters: Letter[] = [];
          for (const l of parsed) {
            if (!l || typeof l !== 'object') continue;
            const lid = (l.id || `${l.originalNo}-${l.date}`).trim();
            if (lid && !seenIds.has(lid)) {
              seenIds.add(lid);
              const mappedDiv = migrateDivision(l.division);
              const fwdDivs = ensureStringArray(l.forwardedDivisions).map(migrateDivision).filter(Boolean);
              const fwdTo = ensureStringArray(l.forwardedTo);
              const mappedFwdDivs = fwdDivs.length > 0
                ? fwdDivs
                : (mappedDiv ? [mappedDiv] : []);

              uniqueLetters.push({
                ...l,
                letterType: String(l.letterType || 'Registered Post').trim() || 'Registered Post',
                registeredPostNo: normalizeRegisteredPostNo(l.registeredPostNo),
                action: normalizeAction(l.action),
                fileNo: String(l.fileNo ?? '').trim(),
                division: mappedDiv,
                forwardedDivisions: mappedFwdDivs,
                forwardedTo: fwdTo,
              });
            }
          }
          if (uniqueLetters.length > 0) return uniqueLetters;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return INITIAL_LETTERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('kpn_vaharai_current_user_v2');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          const assignedDivs = ensureStringArray(parsed.assignedDivisions).map(migrateDivision).filter(Boolean);
          const assignedOffs = ensureStringArray(parsed.assignedOfficers);
          return {
            ...parsed,
            Division: migrateDivision(parsed.Division),
            assignedDivisions: assignedDivs.length > 0 ? assignedDivs : undefined,
            assignedOfficers: assignedOffs.length > 0 ? assignedOffs : undefined,
          };
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return null;
  });

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [isLetterEditMode, setIsLetterEditMode] = useState(false);
  const [editingLetter, setEditingLetter] = useState<Letter | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('All');
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState<string>('All');
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('Google Sheets Cloud synchronization active.');

  useEffect(() => {
    try {
      localStorage.setItem('kpn_vaharai_users_v2', JSON.stringify(users));
    } catch {
      // Ignore storage write errors
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('kpn_vaharai_letters_v2', JSON.stringify(letters));
    } catch {
      // Ignore storage write errors
    }
  }, [letters]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('kpn_vaharai_current_user_v2', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('kpn_vaharai_current_user_v2');
      }
    } catch {
      // Ignore storage write errors
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;
    const loadCloud = async () => {
      setLoadingCloud(true);
      try {
        const result = await fetchCloudData();
        if (!mounted) return;

        if (result.offline) {
          setCloudMessage('Operating in offline local cache mode (Google Sheets sync ready).');
          return;
        }

        if (Array.isArray(result.letters) && result.letters.length > 1) {
          const cloudLetters = result.letters
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeLetter)
            .filter((letter: any) => letter.id || letter.originalNo)
            .reverse();

          const seenLetters = new Set<string>();
          const uniqueCloudLetters: Letter[] = [];
          for (const l of cloudLetters) {
            const key = l.id || `${l.originalNo}-${l.date}`;
            if (!seenLetters.has(key)) {
              seenLetters.add(key);
              uniqueCloudLetters.push(l);
            }
          }

          if (uniqueCloudLetters.length) setLetters(uniqueCloudLetters);
        }

        if (Array.isArray(result.users) && result.users.length > 1) {
          const cloudUsers = result.users
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeUser)
            .filter((user: any) => user.User_ID);

          const seenUsers = new Set<string>();
          const uniqueCloudUsers: User[] = [];
          for (const u of cloudUsers) {
            const key = (u.User_ID || '').trim().toLowerCase();
            if (key && !seenUsers.has(key)) {
              seenUsers.add(key);
              uniqueCloudUsers.push(u);
            }
          }

          if (uniqueCloudUsers.length) setUsers(uniqueCloudUsers);
        }

        setCloudMessage('Google Sheets cloud database synced successfully.');
      } catch {
        if (mounted) {
          setCloudMessage('Operating in offline local cache mode (Google Sheets fetch skipped).');
        }
      } finally {
        if (mounted) setLoadingCloud(false);
      }
    };

    loadCloud();
    return () => {
      mounted = false;
    };
  }, []);

  const cloudWrite = async (payload: CloudPayload) => {
    const ok = await sendDataToGoogleCloud(payload);
    if (!ok) setCloudMessage('Google Sheets sync warning: saved to local cache.');
    else setCloudMessage('Google Sheets sync updated successfully.');
    return ok;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedLetter(null);
    setEditingLetter(null);
  };

  const handleResetData = () => {
    if (confirm('Reset system data to official default demonstration records?')) {
      setUsers(INITIAL_USERS);
      setLetters(INITIAL_LETTERS);
      alert('System records successfully restored to demo baseline.');
    }
  };

  // Requirement 1 & 2: Mail Officer Registration with Excel & Cloud logging
  const handleSaveNewLetter = (newLetter: Letter) => {
    const safeLetterType = String(newLetter.letterType || 'Registered Post').trim() || 'Registered Post';
    const safeRegPostNo = normalizeRegisteredPostNo(newLetter.registeredPostNo);
    const safeFileNo = String(newLetter.fileNo ?? '').trim();
    const safeAction = normalizeAction(newLetter.action || 'Not Yet Viewed');

    const sanitized: Letter = {
      ...newLetter,
      letterType: safeLetterType,
      registeredPostNo: safeRegPostNo,
      action: safeAction,
      fileNo: safeFileNo,
      forwardedDivisions: ensureStringArray(newLetter.forwardedDivisions),
      forwardedTo: ensureStringArray(newLetter.forwardedTo),
    };
    setLetters((prev) => [sanitized, ...prev]);
    cloudWrite({
      action: 'ADD_LETTER',
      id: sanitized.id,
      originalNo: sanitized.originalNo,
      date: sanitized.date,
      dispatchedDate: sanitized.dispatchedDate || sanitized.date,
      letterType: sanitized.letterType,
      registeredPostNo: sanitized.registeredPostNo,
      inwardNo: sanitized.inwardNo,
      fromWhom: sanitized.fromWhom,
      subject: sanitized.subject,
      division: sanitized.division || DIVISIONS[0],
      forwardedDivisions: sanitized.forwardedDivisions || [],
      forwardedTo: sanitized.forwardedTo || [],
      actionStatus: sanitized.action,
      replyResponse: sanitized.replyResponse || '',
      fileNo: sanitized.fileNo || '',
      extraData: sanitized,
    });
    alert(`Mail Record (${sanitized.originalNo}) registered and synced successfully!`);
  };

  // Update existing letter (All information editable later by Mail Officer / Super Admin)
  const handleUpdateLetter = (updated: Letter) => {
    const safeLetterType = String(updated.letterType || 'Registered Post').trim() || 'Registered Post';
    const safeRegPostNo = normalizeRegisteredPostNo(updated.registeredPostNo);
    const safeFileNo = String(updated.fileNo ?? '').trim();
    const safeAction = normalizeAction(updated.action);

    const sanitized: Letter = {
      ...updated,
      letterType: safeLetterType,
      registeredPostNo: safeRegPostNo,
      action: safeAction,
      fileNo: safeFileNo,
      forwardedDivisions: ensureStringArray(updated.forwardedDivisions),
      forwardedTo: ensureStringArray(updated.forwardedTo),
    };
    setLetters((prev) => prev.map((l) => (l.id === sanitized.id ? sanitized : l)));
    if (selectedLetter && selectedLetter.id === sanitized.id) {
      setSelectedLetter(sanitized);
    }
    if (editingLetter && editingLetter.id === sanitized.id) {
      setEditingLetter(sanitized);
    }

    // Reset actionFilter if active so the updated letter remains visible on screen
    if (actionFilter !== 'All') {
      setActionFilter('All');
    }

    const letterCloudPayload = {
      id: sanitized.id,
      originalNo: sanitized.originalNo,
      date: sanitized.date,
      dispatchedDate: sanitized.dispatchedDate || sanitized.date,
      letterType: sanitized.letterType,
      registeredPostNo: sanitized.registeredPostNo,
      inwardNo: sanitized.inwardNo,
      fromWhom: sanitized.fromWhom,
      subject: sanitized.subject,
      division: sanitized.division || DIVISIONS[0],
      forwardedDivisions: sanitized.forwardedDivisions || [],
      forwardedTo: sanitized.forwardedTo || [],
      actionStatus: sanitized.action || 'Not Yet Viewed',
      replyResponse: sanitized.replyResponse || '',
      fileNo: sanitized.fileNo || '',
      extraData: sanitized,
    };

    // To prevent the Google Apps Script UPDATE_LETTER handler from shifting columns left
    // at RegisteredPostNo, we first delete the old row by ID and then write the full
    // 15-column aligned row via ADD_LETTER (where RegisteredPostNo is always filled, e.g. 'No').
    void (async () => {
      await sendDataToGoogleCloud({
        ...letterCloudPayload,
        action: 'DELETE_LETTER',
      });
      const ok = await sendDataToGoogleCloud({
        ...letterCloudPayload,
        action: 'ADD_LETTER',
      });
      if (!ok) setCloudMessage('Google Sheets sync warning: saved to local cache.');
      else setCloudMessage('Google Sheets sync updated successfully.');
    })();
  };

  const handleDeleteLetter = (letterId: string) => {
    if (!confirm('Are you sure you want to permanently delete this mail record?')) return;
    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    if (selectedLetter && selectedLetter.id === letterId) setSelectedLetter(null);
    if (editingLetter && editingLetter.id === letterId) setEditingLetter(null);

    cloudWrite({
      action: 'DELETE_LETTER',
      id: letterId,
    });
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.User_ID.trim().toLowerCase() !== newUser.User_ID.trim().toLowerCase()
      );
      return [...filtered, newUser];
    });
    cloudWrite({
      action: 'ADD_USER',
      User_ID: newUser.User_ID,
      Password: newUser.Password,
      Name: newUser.Name,
      Role: newUser.Role,
      Division: newUser.Division,
      Status: newUser.Status || 'Active',
      extraData: newUser,
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) =>
      prev.map((u) => (u.User_ID === updatedUser.User_ID ? updatedUser : u))
    );
    if (currentUser && currentUser.User_ID === updatedUser.User_ID) {
      setCurrentUser(updatedUser);
    }

    cloudWrite({
      action: 'UPDATE_USER',
      User_ID: updatedUser.User_ID,
      Password: updatedUser.Password,
      Name: updatedUser.Name,
      Role: updatedUser.Role,
      Division: updatedUser.Division,
      Status: updatedUser.Status || 'Active',
      extraData: updatedUser,
    });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setUsers((prev) => prev.filter((u) => u.User_ID !== userId));
    cloudWrite({
      action: 'DELETE_USER',
      User_ID: userId,
    });
  };

  if (!currentUser) {
    return <LoginScreen users={users} onLoginSuccess={setCurrentUser} />;
  }

  const usersMap = new Map<string, User>(users.map((u) => [u.User_ID, u]));

  // Requirement 3 & 5: Role-based filtering ensuring Mega forwarded mail reaches the division!
  const roleFilteredLetters = letters.filter((letter) => {
    // Super Admin, Mega, Mail Officer see all letters
    if (
      currentUser.Role === 'Super Admin' ||
      currentUser.Role === 'Mega' ||
      currentUser.Role === 'Mail Officer'
    ) {
      return true;
    }

    const fwdDivs = ensureStringArray(letter.forwardedDivisions);
    const fwdTo = ensureStringArray(letter.forwardedTo);
    const myId = currentUser.User_ID.trim().toLowerCase();
    const myName = currentUser.Name.trim().toLowerCase();

    // Multiple Luxury Roles see their assigned divisions or assigned officers
    if (currentUser.Role === 'Luxury') {
      const allowedDivs = ensureStringArray(currentUser.assignedDivisions);
      const allowedOfficers = ensureStringArray(currentUser.assignedOfficers).map((s) => s.trim().toLowerCase());

      // If no restrictions configured, Luxury user has executive oversight of all divisions
      if (allowedDivs.length === 0 && allowedOfficers.length === 0) {
        return true;
      }

      // Check if letter belongs to an assigned division
      const inAssignedDiv =
        allowedDivs.includes(letter.division) ||
        fwdDivs.some((d) => allowedDivs.includes(d));

      // Check if letter forwarded to an assigned officer or to luxury user themselves
      const inAssignedOfficer = fwdTo.some((uid) => {
        const clean = uid.trim().toLowerCase();
        if (clean === myId || clean === myName) return true;
        if (myId && clean.includes(myId)) return true;
        if (myName && (clean.includes(myName) || myName.includes(clean))) return true;
        if (allowedOfficers.includes(clean)) return true;
        return allowedOfficers.some((ao) => {
          const u = users.find(
            (usr) =>
              usr.User_ID.trim().toLowerCase() === ao ||
              usr.Name.trim().toLowerCase() === ao
          );
          return (
            u &&
            (u.User_ID.trim().toLowerCase() === clean ||
              u.Name.trim().toLowerCase() === clean ||
              clean.includes(u.User_ID.trim().toLowerCase()) ||
              clean.includes(u.Name.trim().toLowerCase()))
          );
        });
      });

      return inAssignedDiv || inAssignedOfficer;
    }

    // Requirement 3: Normal User (Division Head) MUST receive letters routed to their division!
    if (currentUser.Role === 'Normal') {
      const myDiv = (currentUser.Division || '').trim().toLowerCase();
      const letterDiv = (letter.division || '').trim().toLowerCase();
      const matchesDivision =
        letterDiv === myDiv ||
        fwdDivs.some((d) => d.trim().toLowerCase() === myDiv);

      const hasDivisionOfficer = fwdTo.some((uid) => {
        const clean = uid.trim().toLowerCase();
        const u = users.find(
          (usr) =>
            usr.User_ID.trim().toLowerCase() === clean ||
            usr.Name.trim().toLowerCase() === clean
        );
        return u && (u.Division || '').trim().toLowerCase() === myDiv;
      });

      const directlyForwarded = fwdTo.some((id) => {
        const clean = id.trim().toLowerCase();
        return (
          clean === myId ||
          clean === myName ||
          (myId && clean.includes(myId)) ||
          (myName && (clean.includes(myName) || myName.includes(clean)))
        );
      });

      return matchesDivision || hasDivisionOfficer || directlyForwarded;
    }

    // Field Officer (User Role): Letters directly forwarded to their ID or Name
    if (currentUser.Role === 'User') {
      return fwdTo.some((id) => {
        const clean = id.trim().toLowerCase();
        if (clean === myId || clean === myName) return true;
        if (myId && clean.includes(myId)) return true;
        if (myName && (clean.includes(myName) || myName.includes(clean))) return true;
        const resolved = users.find(
          (u) =>
            u.User_ID.trim().toLowerCase() === clean ||
            u.Name.trim().toLowerCase() === clean
        );
        return resolved?.User_ID.trim().toLowerCase() === myId;
      });
    }

    return false;
  });

  // Apply Search, Status Filter, Officer Filter & Division Filter
  const displayedLetters = roleFilteredLetters.filter((letter) => {
    // Status Filter (with bilingual safety via normalizeAction)
    if (actionFilter !== 'All') {
      const normLetterAction = normalizeAction(letter.action);
      const normFilter = normalizeAction(actionFilter);
      if (normLetterAction !== normFilter) return false;
    }

    const fwdDivs = ensureStringArray(letter.forwardedDivisions);
    const fwdTo = ensureStringArray(letter.forwardedTo);

    // Division Filter
    if (selectedDivisionFilter !== 'All') {
      const targetDiv = selectedDivisionFilter.trim().toLowerCase();
      const letterDiv = (letter.division || '').trim().toLowerCase();
      const matchesDiv =
        letterDiv === targetDiv ||
        fwdDivs.some((d) => d.trim().toLowerCase() === targetDiv) ||
        fwdTo.some((uid) => {
          const clean = uid.trim().toLowerCase();
          const u = users.find(
            (usr) =>
              usr.User_ID.trim().toLowerCase() === clean ||
              usr.Name.trim().toLowerCase() === clean
          );
          return (u?.Division || '').trim().toLowerCase() === targetDiv;
        });
      if (!matchesDiv) return false;
    }

    // Officer Filter (from toolbar dropdown)
    if (selectedOfficerFilter !== 'All') {
      const matchesSelectedOfficer = doesLetterMatchOfficer(letter, selectedOfficerFilter, users);
      if (!matchesSelectedOfficer) return false;
    }

    // Search Query (Comprehensive search by Officer Name / ID / Designation, Original No, Inward No, Subject, From, Dates, Division, Notes)
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const matchesOfficerSearch = doesLetterMatchOfficer(letter, q, users);

    const forwardedNames = fwdTo
      .map((id) => getOfficerDisplayName(id, users))
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      (letter.originalNo || '').toLowerCase().includes(q) ||
      (letter.inwardNo || '').toLowerCase().includes(q) ||
      (letter.fileNo || '').toLowerCase().includes(q) ||
      (letter.registeredPostNo || '').toLowerCase().includes(q) ||
      (letter.fromWhom || '').toLowerCase().includes(q) ||
      (letter.subject || '').toLowerCase().includes(q) ||
      (letter.date || '').toLowerCase().includes(q) ||
      (letter.dispatchedDate || '').toLowerCase().includes(q) ||
      (letter.division || '').toLowerCase().includes(q) ||
      (letter.replyResponse || '').toLowerCase().includes(q) ||
      forwardedNames.includes(q) ||
      matchesOfficerSearch
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-blue-900 bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <VaharaiLogo size="md" />
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white line-clamp-1">
                  Divisional Secretariat • Koralaipattu North (Vaharai)
                </h1>
                <p className="text-[11px] text-blue-200">
                  Mail Registration, Departmental Routing & Tracking System
                </p>
              </div>
            </div>

            {/* User Profile & Quick Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-bold text-white flex items-center gap-1">
                  {currentUser.Role === 'Luxury' && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                  {currentUser.Name}
                </span>
                <span className="text-blue-200 text-[11px]">
                  {currentUser.Division} &nbsp;|&nbsp;{' '}
                  <span className="rounded bg-blue-700 px-1.5 py-0.2 font-bold text-white uppercase text-[10px]">
                    {currentUser.Role}
                  </span>
                </span>
              </div>

              {/* Requirement 1: Mail Officer "+ Register Mail" button */}
              {(currentUser.Role === 'Mail Officer' || currentUser.Role === 'Super Admin') && (
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+ Register Mail</span>
                </button>
              )}

              {/* Requirement 5: Super Admin User Management */}
              {currentUser.Role === 'Super Admin' && (
                <button
                  type="button"
                  onClick={() => setIsUserMgmtOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-800 transition"
                >
                  <Users className="h-4 w-4" />
                  <span>User Management</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetData}
                title="Restore default demo records"
                className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Demo</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out of portal"
                className="flex items-center gap-1 rounded-xl bg-red-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Cloud Status Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-1.5 text-center text-xs text-blue-900 font-medium flex items-center justify-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{cloudMessage}</span>
      </div>

      {/* Role Context Bar */}
      <div className="border-b border-gray-200 bg-white px-4 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">Active Role Profile:</span>
            <span
              className={`rounded-full px-3 py-0.5 font-bold ${
                currentUser.Role === 'Super Admin'
                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                  : currentUser.Role === 'Mega'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : currentUser.Role === 'Luxury'
                  ? 'bg-amber-200 text-amber-950 border border-amber-400 font-black'
                  : currentUser.Role === 'Mail Officer'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : currentUser.Role === 'Normal'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {currentUser.Role === 'Luxury' && '👑 '}
              {currentUser.Role}
            </span>
            <span className="text-gray-500 font-medium">({currentUser.Division})</span>
          </div>

          <div className="text-gray-600 font-medium text-xs">
            {currentUser.Role === 'Super Admin' && (
              <span>🛡️ Super Admin: Full administrative privileges to edit all records and manage users.</span>
            )}
            {currentUser.Role === 'Mega' && (
              <span>📊 Mega User: Divisional Secretary level overview; route and forward mail across all branches.</span>
            )}
            {currentUser.Role === 'Luxury' && (
              <span>
                👑 Luxury Role: Permitted access to {currentUser.assignedDivisions?.length || 0} designated divisions & analytics.
              </span>
            )}
            {currentUser.Role === 'Mail Officer' && (
              <span>✉️ Mail Officer: Initial mail registration, full post-entry editing, and official dispatch logs.</span>
            )}
            {currentUser.Role === 'Normal' && (
              <span>🏢 Branch Head: Direct oversight of mail routed to {currentUser.Division}.</span>
            )}
            {currentUser.Role === 'User' && (
              <span>👤 Officer: Inbox for assigned tasks under ID {currentUser.User_ID}.</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Requirement 6: Division Status Analytics & Progress Graph for ALL divisions */}
        <DivisionActionChart
          letters={roleFilteredLetters}
          allUsers={users}
          currentUser={currentUser}
          onFilterByStatus={(st) => setActionFilter(st)}
          onFilterByDivision={(div) => setSelectedDivisionFilter(div)}
          currentStatusFilter={actionFilter}
        />

        {/* Toolbar: Search, Filters, Excel Export & 10pt Print */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input with Clear Button */}
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Officer Name (உத்தியோகத்தர்), No, Subject, Division..."
                className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-8 text-xs text-gray-900 focus:border-blue-700 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
                  title="Clear Search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Officer Filter Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-gray-700">Officer (உத்தியோகத்தர்):</span>
                <select
                  value={selectedOfficerFilter}
                  onChange={(e) => setSelectedOfficerFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:border-blue-700 focus:outline-hidden max-w-[180px] truncate"
                >
                  <option value="All">All Officers (அனைவரும்)</option>
                  {users.map((u) => (
                    <option key={u.User_ID} value={u.User_ID}>
                      {u.Name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="font-bold text-gray-700">Status:</span>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:border-blue-700 focus:outline-hidden"
                >
                  <option value="All">All Statuses (அனைத்தும்)</option>
                  <option value="Action Taken">Action Taken (முடிந்தது)</option>
                  <option value="Action Not Taken">Action Not Taken (நிலுவை)</option>
                  <option value="Under Investigation">Under Investigation (கள ஆய்வு)</option>
                  <option value="Not Yet Viewed">Not Yet Viewed (புதியவை)</option>
                </select>
              </div>

              {/* 10pt Print Report Button */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <button
                  type="button"
                  onClick={() =>
                    printLandscapeReport(
                      'Filtered Mail Register Log',
                      displayedLetters,
                      usersMap
                    )
                  }
                  title="Print Official A4 Landscape Report (10pt font) with Signature column"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-black transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print (10pt Font)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Indicators & Result Count */}
          {(actionFilter !== 'All' || selectedOfficerFilter !== 'All' || selectedDivisionFilter !== 'All' || searchQuery.trim()) && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-500">Active Filters:</span>
                {actionFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-bold text-blue-900 text-[11px]">
                    Status: {actionFilter}
                    <button
                      type="button"
                      onClick={() => setActionFilter('All')}
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedOfficerFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 font-bold text-purple-900 text-[11px]">
                    Officer: {getOfficerDisplayName(selectedOfficerFilter, users)}
                    <button
                      type="button"
                      onClick={() => setSelectedOfficerFilter('All')}
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedDivisionFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-900 text-[11px]">
                    Division: {selectedDivisionFilter}
                    <button
                      type="button"
                      onClick={() => setSelectedDivisionFilter('All')}
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-900 text-[11px]">
                    Search: &ldquo;{searchQuery}&rdquo;
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:text-red-700 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActionFilter('All');
                    setSelectedOfficerFilter('All');
                    setSelectedDivisionFilter('All');
                    setSearchQuery('');
                  }}
                  className="text-[11px] text-red-600 font-bold hover:underline ml-1"
                >
                  Clear All Filters (அனைத்தும் அழி)
                </button>
              </div>

              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                Matching: {displayedLetters.length} Mail {displayedLetters.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
          )}
        </div>

        {/* Requirement 7: 5-Day Folder Structure */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span>📁 Date-Wise Mail Folders (5-Day Batch Navigation)</span>
            </h2>
            <span className="text-xs text-gray-500">
              Each folder can be expanded or printed in 10pt A4 landscape layout.
            </span>
          </div>

          <DateFoldersList
            letters={displayedLetters}
            currentUser={currentUser}
            allUsers={users}
            onSelectLetter={(ltr) => {
              setSelectedLetter(ltr);
              setIsLetterEditMode(false);
            }}
            onEditLetter={(ltr) => {
              setSelectedLetter(ltr);
              setIsLetterEditMode(true);
            }}
            onDeleteLetter={handleDeleteLetter}
            onUpdateLetter={handleUpdateLetter}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        Divisional Secretariat • Koralaipattu North (Vaharai) &copy; {new Date().getFullYear()}. All Rights Reserved.
      </footer>

      {/* Mail Registration Modal (Mail Officer) */}
      <LetterRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSave={handleSaveNewLetter}
        currentUser={currentUser}
        allUsers={users}
        existingLetters={letters}
      />

      {/* Detail, Edit & Chat Modal */}
      <LetterDetailAndChatModal
        isOpen={!!selectedLetter}
        letter={selectedLetter}
        currentUser={currentUser}
        allUsers={users}
        initialEditMode={isLetterEditMode}
        onClose={() => {
          setSelectedLetter(null);
          setIsLetterEditMode(false);
        }}
        onUpdateLetter={handleUpdateLetter}
        onDeleteLetter={handleDeleteLetter}
      />

      {/* User & Role Management Modal (Super Admin) */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
        users={users}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
      />
    </div>
  );
}
