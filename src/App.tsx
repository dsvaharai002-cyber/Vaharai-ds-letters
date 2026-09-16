import React, { useState, useEffect } from 'react';
import {
  Shield,
  PlusCircle,
  LogOut,
  Users,
  Search,
  Filter,
  FileText,
  Building,
  RotateCcw,
  Sparkles,
  Calendar,
  CheckCircle,
  Mail,
  Printer,
  Download,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react';
import { User, Letter, UserRole, LetterAction } from './types';
import { INITIAL_USERS, INITIAL_LETTERS } from './data/initialData';
import { exportLettersToExcel, exportLettersToCsv, downloadDataBackupJson } from './utils/helpers';
import { LoginScreen } from './components/LoginScreen';
import { MegaActionChart } from './components/MegaActionChart';
import { DateFoldersList } from './components/DateFoldersList';
import { LetterRegisterModal } from './components/LetterRegisterModal';
import { LetterDetailAndChatModal } from './components/LetterDetailAndChatModal';
import { UserManagementModal } from './components/UserManagementModal';

export default function App() {
  // State for Users & Letters with localStorage persistence
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

  // Current logged in user
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('kpn_vaharai_current_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Modal states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);

  // Search and filter in dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('All');

  // Save to localStorage
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

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedLetter(null);
  };

  // Reset to default sample data
  const handleResetData = () => {
    if (confirm('அனைத்து தரவுகளையும் மாதிரி ஆரம்ப நிலைக்கு மீட்டமைக்க விரும்புகிறீர்களா?')) {
      setUsers(INITIAL_USERS);
      setLetters(INITIAL_LETTERS);
      alert('தரவுகள் வெற்றிகரமாக மீட்டமைக்கப்பட்டன.');
    }
  };

  // Add new letter (Mail Officer only)
  const handleSaveNewLetter = (newLetter: Letter) => {
    setLetters((prev) => [newLetter, ...prev]);
    alert(`கடிதம் (${newLetter.originalNo}) வெற்றிகரமாக பதிவு செய்யப்பட்டது!`);
  };

  // Update existing letter (action, reply, chats, forwardedTo, edits)
  const handleUpdateLetter = (updated: Letter) => {
    setLetters((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (selectedLetter && selectedLetter.id === updated.id) {
      setSelectedLetter(updated);
    }
  };

  // Delete letter (Super Admin only)
  const handleDeleteLetter = (letterId: string) => {
    setLetters((prev) => prev.filter((l) => l.id !== letterId));
    if (selectedLetter && selectedLetter.id === letterId) {
      setSelectedLetter(null);
    }
  };

  // User management handlers (Super Admin only)
  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.User_ID === updatedUser.User_ID ? updatedUser : u)));
    if (currentUser && currentUser.User_ID === updatedUser.User_ID) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.User_ID !== userId));
  };

  // If not logged in, show login screen
  if (!currentUser) {
    return <LoginScreen users={users} onLoginSuccess={setCurrentUser} />;
  }

  // Map of users for easy lookup
  const usersMap = new Map<string, User>(users.map((u) => [u.User_ID, u]));

  // Role-based letter filtering
  // Super Admin: sees all letters
  // Mega: sees all letters
  // Mail Officer: sees all letters
  // Normal: sees letters belonging to their division (either forwarded to someone in their division or sender division)
  // User: sees letters forwarded to their specific User_ID
  const roleFilteredLetters = letters.filter((letter) => {
    if (currentUser.Role === 'Super Admin' || currentUser.Role === 'Mega' || currentUser.Role === 'Mail Officer') {
      return true;
    }

    if (currentUser.Role === 'Normal') {
      // Check if any forwarded user is in this Normal user's division
      const hasDivisionUser = letter.forwardedTo.some((uid) => {
        const u = usersMap.get(uid);
        return u && u.Division === currentUser.Division;
      });
      return hasDivisionUser;
    }

    if (currentUser.Role === 'User') {
      // Check if specifically forwarded to this user
      return letter.forwardedTo.includes(currentUser.User_ID);
    }

    return false;
  });

  // Apply search query and action filter
  const displayedLetters = roleFilteredLetters.filter((letter) => {
    if (actionFilter !== 'All' && letter.action !== actionFilter) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const forwardedNames = letter.forwardedTo
      .map((id) => usersMap.get(id)?.Name || id)
      .join(' ')
      .toLowerCase();

    return (
      letter.originalNo.toLowerCase().includes(q) ||
      letter.inwardNo.toLowerCase().includes(q) ||
      letter.fromWhom.toLowerCase().includes(q) ||
      letter.subject.toLowerCase().includes(q) ||
      letter.date.toLowerCase().includes(q) ||
      forwardedNames.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-blue-900 bg-slate-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo / Branding */}
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

            {/* Current User Info & Actions */}
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

              {/* Action: New Letter (Mail Officer ONLY) */}
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

              {/* Action: User Management (Super Admin ONLY) */}
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

              {/* Reset Data Button */}
              <button
                type="button"
                onClick={handleResetData}
                title="மாதிரி தரவுகளுக்கு மீட்டமை"
                className="hidden lg:flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-slate-700"
              >
                <RotateCcw className="h-3 w-3" />
                <span>மீட்டமை</span>
              </button>

              {/* Logout Button */}
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

      {/* Role Banner / Sub-header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">
              தற்போதைய பயனர் நிலை:
            </span>
            <span
              className={`rounded-full px-3 py-0.5 font-bold ${
                currentUser.Role === 'Super Admin'
                  ? 'bg-purple-100 text-purple-800'
                  : currentUser.Role === 'Mega'
                  ? 'bg-amber-100 text-amber-800'
                  : currentUser.Role === 'Mail Officer'
                  ? 'bg-blue-100 text-blue-800'
                  : currentUser.Role === 'Normal'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {currentUser.Role}
            </span>
            <span className="text-gray-500">
              ({currentUser.Division})
            </span>
          </div>

          <div className="text-gray-600 font-medium">
            {currentUser.Role === 'Super Admin' && (
              <span>🛡️ அனைத்து கடிதங்களையும் திகதியடிப்படையில் மேலாண்மை செய்யும் அதிகாரம் வழங்கப்பட்டுள்ளது.</span>
            )}
            {currentUser.Role === 'Mega' && (
              <span>📊 மெகா பயனாளி: அனைத்து கடிதங்களும் திகதியடிப்படையில் + வரைபட நிலவரம்.</span>
            )}
            {currentUser.Role === 'Mail Officer' && (
              <span>✉️ கடிதப் பதிவாளர்: கடிதங்களைப் பதிவு செய்யும் முழு அதிகாரம்.</span>
            )}
            {currentUser.Role === 'Normal' && (
              <span>🏢 பிரிவு பிரதானி: {currentUser.Division} கடிதங்கள் மட்டும்.</span>
            )}
            {currentUser.Role === 'User' && (
              <span>👤 கள உத்தியோகத்தர்: உங்கள் ID ({currentUser.User_ID}) க்குரிய கடிதங்கள் மட்டும்.</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Mega User Action Chart */}
        {currentUser.Role === 'Mega' && (
          <MegaActionChart letters={letters} allUsers={users} />
        )}

        {/* Filter & Search Bar */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px] max-w-lg">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Original No, Inward No, விடயம், அனுப்புநர் மூலம் தேடுக..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            {/* Action Filter (Hidden for Mail Officer as they don't deal with Action) */}
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

              {/* Download File Buttons */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-gray-200">
                <button
                  type="button"
                  onClick={() => exportLettersToExcel(displayedLetters, usersMap, 'Report')}
                  title="அனைத்து கடிதங்களையும் Excel கோப்பாகப் பதிவிறக்குக"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel பதிவிறக்கு</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportLettersToCsv(displayedLetters, usersMap, 'Report')}
                  title="அனைத்து கடிதங்களையும் CSV கோப்பாகப் பதிவிறக்குக"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-800 transition"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadDataBackupJson(letters, users)}
                  title="கணினி முழுமையான தரவு காப்புப்பதிவு கோப்பைப் பதிவிறக்கு (JSON Backup)"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  <Download className="h-3.5 w-3.5 text-gray-600" />
                  <span className="hidden md:inline">காப்புப்பதிவு</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Date-based Folders List (Mandatory requirement 01) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span>📁 திகதி அடிப்படையிலான கடிதப் போல்டர்கள் (Date-wise Folders)</span>
            </h2>
            <span className="text-xs text-gray-500">
              ஒவ்வொரு போல்டரையும் விரித்து A4 பக்கவாட்டில் அச்சிடலாம்.
            </span>
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

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம் &copy; 2026. கடித மேலாண்மை அமைப்பு.
      </footer>

      {/* Modals */}
      {/* 1. Letter Register Modal (Mail Officer only) */}
      <LetterRegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSave={handleSaveNewLetter}
        currentUser={currentUser}
        allUsers={users}
        existingLetters={letters}
      />

      {/* 2. Letter Detail, Action & Chat Modal */}
      <LetterDetailAndChatModal
        isOpen={!!selectedLetter}
        letter={selectedLetter}
        currentUser={currentUser}
        allUsers={users}
        onClose={() => setSelectedLetter(null)}
        onUpdateLetter={handleUpdateLetter}
        onDeleteLetter={handleDeleteLetter}
      />

      {/* 3. User Management Modal (Super Admin only) */}
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
