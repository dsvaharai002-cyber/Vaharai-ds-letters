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

// ==========================================
// Google Apps Script கிளவுட் இணைப்புச் செயல்பாடு
// ==========================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzCrvph-FifE2LdsD9qg0Om5QesYqrNvrt8U6Vcr4J65WFk-Ko3JaJ4HpAAx-MMx3wNoQ/exec";

const sendDataToGoogleCloud = async (payload: any) => {
  try {
    await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Cloud sync error:", error);
  }
};

export default function App() {
  // State for Users & Letters with localStorage persistence
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('kpn_vaharai_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS;
  });

  const [letters, setLetters] = useState(() => {
    try {
      const saved = localStorage.getItem('kpn_vaharai_letters');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LETTERS;
  });

  // Current logged in user
  const [currentUser, setCurrentUser] = useState(() => {
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
  const [selectedLetter, setSelectedLetter] = useState(null);

  // Search and filter in dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  // கூகுள் கிளவுட்டில் இருந்து தரவுகளை நிகழ்நேரத்தில் பெற்றுக்கொள்ளும் பகுதி (Fetch Cloud Data)
  useEffect(() => {
    const fetchCloudData = async () => {
      try {
        const response = await fetch(`${WEB_APP_URL}?type=get_all`);
        const result = await response.json();
        
        if (result.letters && result.letters.length > 1) {
          // Google Sheet தரவுகளை செயல매க்கு ஏற்ப மாற்றுதல் (முதல் வரி Header என்பதால் slice(1))
          const cloudLetters = result.letters.slice(1).map((row: any[]) => ({
            id: row[0],
            originalNo: row[1],
            date: row[2],
            inwardNo: row[3],
            fromWhom: row[4],
            subject: row[5],
            division: row[6],
            forwardedTo: row[7] ? JSON.parse(row[7]) : [],
            action: row[8] || 'Pending',
          })).reverse(); // புதியது முதலில் வர
          
          if (cloudLetters.length > 0) {
            setLetters(cloudLetters);
          }
        }

        if (result.users && result.users.length > 1) {
          const cloudUsers = result.users.slice(1).map((row: any[]) => ({
            User_ID: row[0],
            Password: row[1],
            Name: row[2],
            Role: row[3] as UserRole,
            Division: row[4],
            Status: row[5] || 'Active',
          }));
          
          if (cloudUsers.length > 0) {
            setUsers(cloudUsers);
          }
        }
      } catch (e) {
        console.error("Error fetching cloud data, using local data:", e);
      }
    };

    fetchCloudData();
  }, []);

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

  // Add new letter (Mail Officer only) + Send to Cloud/Gmail
  const handleSaveNewLetter = (newLetter: Letter) => {
    setLetters((prev) => [newLetter, ...prev]);

    // கிளவுட் மற்றும் ஜிமெயிலுக்கு அனுப்பும் பகுதி
    sendDataToGoogleCloud({
      action: "ADD_LETTER",
      id: newLetter.id,
      originalNo: newLetter.originalNo,
      date: newLetter.date,
      inwardNo: newLetter.inwardNo,
      fromWhom: newLetter.fromWhom,
      subject: newLetter.subject,
      division: newLetter.division || "General",
      forwardedTo: newLetter.forwardedTo,
      actionStatus: newLetter.action
    });

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

  // User management handlers (Super Admin only) + Send to Cloud/Gmail
  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);

    // புதிய பயனர் விவரங்களை கிளவுட்/ஜிமெயிலுக்கு அனுப்பும் பகுதி
    sendDataToGoogleCloud({
      action: "ADD_USER",
      User_ID: newUser.User_ID,
      Password: newUser.Password,
      Name: newUser.Name,
      Role: newUser.Role,
      Division: newUser.Division,
      Status: newUser.Status
    });
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
    return (
       setCurrentUser(user)}
      />
    );
  }

  // Map of users for easy lookup
  const usersMap = new Map(users.map((u) => [u.User_ID, u]));

  // Role-based letter filtering
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