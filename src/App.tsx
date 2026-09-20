import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  LogOut,
  Users,
  Search,
  Filter,
  RotateCcw,
  Download,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';
import { User, Letter, UserRole } from './types';
import { INITIAL_USERS, INITIAL_LETTERS } from './data/initialData';
import { exportLettersToExcel, exportLettersToCsv, downloadDataBackupJson } from './utils/helpers';
import { LoginScreen } from './components/LoginScreen';
import { MegaActionChart } from './components/MegaActionChart';
import { DateFoldersList } from './components/DateFoldersList';
import { LetterRegisterModal } from './components/LetterRegisterModal';
import { LetterDetailAndChatModal } from './components/LetterDetailAndChatModal';
import { UserManagementModal } from './components/UserManagementModal';

// --- Google Sheets Cloud Integration Setup ---
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxJIP3bwiDNljAJGU2JRA2Ibj0lEuMwDfsx9Wm8DA3aIwKEhP3Kt1g7k0Xm5L8sPXb6cg/exec";

type CloudPayload = Record<string, any>;

const safeJsonParse = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
};

const sendDataToGoogleCloud = (payload: CloudPayload): boolean => {
  try {
    const action = String(payload.action ?? "").trim();
    if (!action) {
      throw new Error("Cloud action is missing.");
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = WEB_APP_URL + "?action=" + encodeURIComponent(action);
    form.target = "hidden_iframe";
    form.style.display = "none";

    const queryParams: Record<string, string> = {
      action: action,
      id: String(payload.id ?? ""),
      originalNo: String(payload.originalNo ?? ""),
      date: String(payload.date ?? ""),
      inwardNo: String(payload.inwardNo ?? ""),
      fromWhom: String(payload.fromWhom ?? ""),
      subject: String(payload.subject ?? ""),
      division: String(payload.division ?? ""),
      forwardedTo: JSON.stringify(payload.forwardedTo ?? []),
      actionStatus: String(payload.actionStatus ?? payload.action ?? "Pending"),
      Password: String(payload.Password ?? ""),
      Name: String(payload.Name ?? ""),
      Role: String(payload.Role ?? ""),
      Division: String(payload.Division ?? ""),
      Status: String(payload.Status ?? ""),
      extraData: JSON.stringify(payload.extraData ?? payload),
    };

    Object.entries(queryParams).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    let iframe = document.getElementById("hidden_iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "hidden_iframe";
      iframe.name = "hidden_iframe";
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => form.remove(), 1500);
    return true;
  } catch (error) {
    console.error("Cloud sync error:", error);
    return false;
  }
};

const fetchCloudData = async (): Promise<{ letters: any[][]; users: any[][] }> => {
  try {
    const response = await fetch(`${WEB_APP_URL}?type=get_all&t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Cloud fetch error:", error);
    throw error;
  }
};

const normalizeLetter = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[9], {});
  
  let parsedForwardedTo: any[] = [];
  const rawForwarded = row[7] ?? extra.forwardedTo;
  if (Array.isArray(rawForwarded)) {
    parsedForwardedTo = rawForwarded;
  } else {
    parsedForwardedTo = safeJsonParse<any[]>(rawForwarded, []);
  }

  return {
    ...extra,
    id: String(row[0] ?? extra.id ?? ""),
    originalNo: String(row[1] ?? extra.originalNo ?? ""),
    date: String(row[2] ?? extra.date ?? ""),
    inwardNo: String(row[3] ?? extra.inwardNo ?? ""),
    fromWhom: String(row[4] ?? extra.fromWhom ?? ""),
    subject: String(row[5] ?? extra.subject ?? ""),
    division: String(row[6] ?? extra.division ?? "General"),
    forwardedTo: parsedForwardedTo,
    action: String(row[8] ?? extra.action ?? "Pending"),
    fileReferenceNo: String(extra.fileReferenceNo ?? ""),
  };
};

const normalizeUser = (row: any[]): any => {
  const extra = safeJsonParse<Record<string, any>>(row[6], {});
  return {
    ...extra,
    User_ID: String(row[0] ?? extra.User_ID ?? ""),
    Password: String(row[1] ?? extra.Password ?? ""),
    Name: String(row[2] ?? extra.Name ?? ""),
    Role: row[3] as UserRole,
    Division: String(row[4] ?? extra.Division ?? ""),
    Status: String(row[5] ?? extra.Status ?? "Active"),
  };
};

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('kpn_vaharai_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS;
  });

  const [letters, setLetters] = useState<Letter[]>(() => {
    try {
      const saved = localStorage.getItem('kpn_vaharai_letters');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LETTERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('kpn_vaharai_current_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [cloudMessage, setCloudMessage] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('kpn_vaharai_users', JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('kpn_vaharai_letters', JSON.stringify(letters));
    } catch (e) {
      console.error(e);
    }
  }, [letters]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('kpn_vaharai_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('kpn_vaharai_current_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const loadCloud = async () => {
      setLoadingCloud(true);
      try {
        const result = await fetchCloudData();
        if (!mounted) return;

        if (Array.isArray(result.letters) && result.letters.length > 1) {
          const cloudLetters = result.letters
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeLetter)
            .filter((letter: any) => letter.id || letter.originalNo)
            .reverse();

          if (cloudLetters.length) setLetters(cloudLetters);
        }

        if (Array.isArray(result.users) && result.users.length > 1) {
          const cloudUsers = result.users
            .slice(1)
            .filter((row: any[]) => row && row.length)
            .map(normalizeUser)
            .filter((user: any) => user.User_ID);

          if (cloudUsers.length) setUsers(cloudUsers);
        }

        setCloudMessage("Google Sheets தரவு வெற்றிகரமாக இணைக்கப்பட்டது.");
      } catch (error) {
        console.error(error);
        setCloudMessage("Google Sheets தரவைப் பெற முடியவில்லை. உள்ளூர் தரவு (Local) பயன்படுத்தப்படுகிறது.");
      } finally {
        if (mounted) setLoadingCloud(false);
      }
    };

    loadCloud();
    return () => {
      mounted = false;
    };
  }, []);

  const cloudWrite = (payload: CloudPayload) => {
    const ok = sendDataToGoogleCloud(payload);
    if (!ok) setCloudMessage("Google Sheets அனுப்பலில் பிழை ஏற்பட்டது.");
    else setCloudMessage("Google Sheets sync அனுப்பப்பட்டது.");
    return ok;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedLetter(null);
  };

  const handleResetData = () => {
    if (confirm('அனைத்து தரவுகளையும் மாதிரி ஆரம்ப நிலைக்கு மீட்டமைக்க விரும்புகிறீர்களா?')) {
      setUsers(INITIAL_USERS);
      setLetters(INITIAL_LETTERS);
      alert('தரவுகள் வெற்றிகரமாக மீட்டமைக்கப்பட்டன.');
    }
  };

  const handleSaveNewLetter = (newLetter: Letter) => {
    setLetters((prev) => [newLetter, ...prev]);
    cloudWrite({
      action: "ADD_LETTER",
      id: newLetter.id,
      originalNo: newLetter.originalNo,
      date: newLetter.date,
      inwardNo: newLetter.inwardNo,
      fromWhom: newLetter.fromWhom,
      subject: newLetter.subject,
      division: newLetter.division || "General",
      forwardedTo: newLetter.forwardedTo || [],
      actionStatus: newLetter.action || "Pending",
      extraData: newLetter,
    });
    alert(`கடிதம் (${newLetter.originalNo}) வெற்றிகரமாக பதிவு செய்யப்பட்டது!`);
  };

  const handleUpdateLetter = (updated: Letter) => {
    setLetters((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (selectedLetter && selectedLetter.id === updated.id) {
      setSelectedLetter(updated);
    }

    cloudWrite({
      action: "UPDATE_LETTER",
      id: updated.id,
      originalNo: updated.originalNo,
      date: updated.date,
      inwardNo: updated.inwardNo,
      fromWhom: updated.fromWhom,
      subject: updated.subject,
      division: updated.division || "General",
      forwardedTo: updated.forwardedTo || [],
      actionStatus: updated.action || "Pending",
      extraData: updated,
    });
  };

  const handleDeleteLetter = (letterId: string) => {
    if (!confirm("இந்தக் கடிதத்தை நீக்க வேண்டுமா?")) return;
    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    if (selectedLetter && selectedLetter.id === letterId) {
      setSelectedLetter(null);
    }

    cloudWrite({
      action: "DELETE_LETTER",
      id: letterId,
    });
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    cloudWrite({
      action: "ADD_USER",
      User_ID: newUser.User_ID,
      Password: newUser.Password,
      Name: newUser.Name,
      Role: newUser.Role,
      Division: newUser.Division,
      Status: newUser.Status || "Active",
      extraData: newUser,
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.User_ID === updatedUser.User_ID ? updatedUser : u)));
    if (currentUser && currentUser.User_ID === updatedUser.User_ID) {
      setCurrentUser(updatedUser);
    }

    cloudWrite({
      action: "UPDATE_USER",
      User_ID: updatedUser.User_ID,
      Password: updatedUser.Password,
      Name: updatedUser.Name,
      Role: updatedUser.Role,
      Division: updatedUser.Division,
      Status: updatedUser.Status || "Active",
      extraData: updatedUser,
    });
  };

  if (!currentUser) {
    return <LoginScreen users={users} onLoginSuccess={setCurrentUser} />;
  }

  const usersMap = new Map<string, User>(users.map((u) => [u.User_ID, u]));

  const roleFilteredLetters = letters.filter((letter) => {
    if (currentUser.Role === 'Super Admin' || currentUser.Role === 'Mega' || currentUser.Role === 'Mail Officer') {
      return true;
    }

    if (currentUser.Role === 'Normal') {
      const hasDivisionUser = letter.forwardedTo.some((uid) => {
        const u = usersMap.get(uid);
        return u && u.Division === currentUser.Division;
      });
      return hasDivisionUser;
    }

    if (currentUser.Role === 'User') {
      return letter.forwardedTo.includes(currentUser.User_ID);
    }

    return false;
  });

  const displayedLetters = roleFilteredLetters.filter((letter) => {
    if (actionFilter !== 'All' && letter.action !== actionFilter) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const forwardedNames = (Array.isArray(letter.forwardedTo) ? letter.forwardedTo : [])
      .map((id) => usersMap.get(id)?.Name || id)
      .join(' ')
      .toLowerCase();

    return (
      letter.originalNo.toLowerCase().includes(q) ||
      letter.inwardNo.toLowerCase().includes(q) ||
      letter.fromWhom.toLowerCase().includes(q) ||
      letter.subject.toLowerCase().includes(q) ||
      letter.date.toLowerCase().includes(q) ||
      (letter.fileReferenceNo && letter.fileReferenceNo.toLowerCase().includes(q)) ||
      forwardedNames.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-blue-900 bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/vaharai_logo.jpg"
                alt="கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலக முத்திரை"
                className="h-11 w-11 rounded-full bg-white object-contain p-0.5 shadow-sm border border-white/40 shrink-0"
              />
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white line-clamp-1">
                  கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம்
                </h1>
                <p className="text-[11px] text-blue-200">
                  கடித மேலாண்மை அமைப்பு (DS Office Mail Management)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-bold text-white">{currentUser.Name}</span>
                <span className="text-blue-200 text-[11px]">
                  {currentUser.Division} &nbsp;|&nbsp;{' '}
                  <span className="rounded bg-blue-700 px-1.5 py-0.2 font-bold text-white">
                    {currentUser.Role}
                  </span>
                </span>
              </div>

              {currentUser.Role === 'Mail Officer' && (
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>+ புதிய கடிதம் பதிவு</span>
                </button>
              )}

              {currentUser.Role === 'Super Admin' && (
                <button
                  type="button"
                  onClick={() => setIsUserMgmtOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-800 transition"
                >
                  <Users className="h-4 w-4" />
                  <span>பயனர்கள் முகாமைத்துவம்</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetData}
                title="மாதிரி தரவுகளுக்கு மீட்டமை"
                className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="h-3 w-3" />
                <span>மீட்டமை</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="வெளியேறு (Logout)"
                className="flex items-center gap-1 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">வெளியேறு</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-blue-50 border-b border-blue-200 px-4 py-1.5 text-center text-xs text-blue-800 font-medium">
        {loadingCloud ? "Google Sheets இலிருந்து தரவுகள் பெறப்படுகின்றன..." : cloudMessage}
      </div>

      <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">தற்போதைய பயனர் நிலை:</span>
            <span className="rounded-full px-3 py-0.5 font-bold bg-blue-100 text-blue-800">
              {currentUser.Role}
            </span>
            <span className="text-gray-500">({currentUser.Division})</span>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {currentUser.Role === 'Mega' && (
          <MegaActionChart letters={letters} allUsers={users} />
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px] max-w-lg">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Original No, Inward No, கோப்பு இலக்கம், விடயம் தேடுக..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentUser.Role !== 'Mail Officer' && (
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold text-gray-700">நிலை வடிகட்டி:</span>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="All">அனைத்து நிலைகளும்</option>
                    <option value="நடவடிக்கை எடுக்கப்பட்டது">நடவடிக்கை எடுக்கப்பட்டது</option>
                    <option value="நடவடிக்கை எடுக்கப்படவில்லை">நடவடிக்கை எடுக்கப்படவில்லை</option>
                    <option value="கள ஆய்வில்">கள ஆய்வில்</option>
                    <option value="இன்னும் பார்க்கவில்லை">இன்னும் பார்க்கவில்லை</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                <button
                  type="button"
                  onClick={() => exportLettersToExcel(displayedLetters, usersMap, 'Report')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportLettersToCsv(displayedLetters, usersMap, 'Report')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 transition"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadDataBackupJson(letters, users)}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  <Download className="h-3.5 w-3.5 text-gray-600" />
                  <span>காப்புப்பதிவு</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>📁 திகதி அடிப்படையிலான கடிதப் போல்டர்கள் (Date-wise Folders)</span>
            </h2>
          </div>

          <DateFoldersList
            letters={displayedLetters}
            currentUser={currentUser}
            allUsers={users}
            onSelectLetter={(ltr) => setSelectedLetter(ltr)}
            onEditLetter={(ltr) => setSelectedLetter(ltr)}
            onDeleteLetter={handleDeleteLetter}
          />
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம் &copy; 2026. கடித மேலாண்மை அமைப்பு.
      </footer>

      <LetterRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSave={handleSaveNewLetter}
        currentUser={currentUser}
        allUsers={users}
        existingLetters={letters}
      />

      <LetterDetailAndChatModal
        isOpen={!!selectedLetter}
        letter={selectedLetter}
        currentUser={currentUser}
        allUsers={users}
        onClose={() => setSelectedLetter(null)}
        onUpdateLetter={handleUpdateLetter}
        onDeleteLetter={handleDeleteLetter}
      />

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