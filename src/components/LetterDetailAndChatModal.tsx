import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Share2,
  Mail,
  Send,
  RefreshCw,
  Minus,
  Maximize2,
  Trash2,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Building2,
  Calendar,
  Download,
  Printer,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Letter, LetterAction, LetterChatMessage, User } from '../types';
import { DIVISIONS, POST_TYPES, migrateDivision } from '../data/initialData';
import {
  shareViaEmail,
  shareViaWhatsApp,
  downloadLetterAttachment,
  printLandscapeReport,
} from '../utils/helpers';
import { scanLetterWithAI } from '../utils/aiScanner';
import { ForwardSelect } from './ForwardUserSelect';
import { CameraCaptureModal } from './CameraCaptureModal';

interface LetterDetailAndChatModalProps {
  isOpen: boolean;
  letter: Letter | null;
  currentUser: User;
  allUsers: User[];
  initialEditMode?: boolean;
  onClose: () => void;
  onUpdateLetter: (updated: Letter) => void;
  onDeleteLetter: (letterId: string) => void;
}

const ACTION_OPTIONS: LetterAction[] = [
  'Not Yet Viewed',
  'Action Taken',
  'Action Not Taken',
  'Under Investigation',
];

export const LetterDetailAndChatModal: React.FC<LetterDetailAndChatModalProps> = ({
  isOpen,
  letter,
  currentUser,
  allUsers,
  initialEditMode = false,
  onClose,
  onUpdateLetter,
  onDeleteLetter,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEditingFull, setIsEditingFull] = useState(Boolean(initialEditMode));
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Editable fields state
  const [editOriginalNo, setEditOriginalNo] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDispatchedDate, setEditDispatchedDate] = useState('');
  const [editLetterType, setLetterType] = useState('Registered Post');
  const [editRegPostNo, setEditRegPostNo] = useState('');
  const [editInwardNo, setEditInwardNo] = useState('');
  const [editFromWhom, setEditFromWhom] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDivision, setEditDivision] = useState('');
  const [editForwardedDivisions, setEditForwardedDivisions] = useState<string[]>([]);
  const [editForwardedTo, setEditForwardedTo] = useState<string[]>([]);
  const [currentAction, setCurrentAction] = useState<LetterAction>('Not Yet Viewed');
  const [currentReply, setCurrentReply] = useState('');
  const [editFileNo, setEditFileNo] = useState('');
  const [editImage, setEditImage] = useState<string | undefined>(undefined);
  const [editImageSizeKb, setEditImageSizeKb] = useState<number | undefined>(undefined);
  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Chat state
  const [newMessage, setNewMessage] = useState('');
  const [chatPage, setChatPage] = useState(1);
  const pageSize = 8;

  const handleScanExistingDoc = async (targetImg?: string) => {
    const imgData = targetImg || editImage;
    if (!imgData) return;
    setIsScanningDoc(true);
    setScanFeedback(null);
    try {
      const res = await scanLetterWithAI(imgData);
      if (res.success && res.data) {
        const d = res.data;
        if (d.dispatchedDate && /^\d{4}-\d{2}-\d{2}$/.test(d.dispatchedDate)) {
          setEditDispatchedDate(d.dispatchedDate);
        }
        // User rule: Scanned letter number belongs to Inward No (Letter Reference No),
        // and Original No is the unique KPN computer number which is kept intact.
        const scannedLetterNumber = (d.inwardNo || d.originalNo || '').trim();
        if (scannedLetterNumber) {
          setEditInwardNo(scannedLetterNumber);
        }
        if (d.fromWhom && d.fromWhom.trim()) {
          setEditFromWhom(d.fromWhom.trim());
        }
        if (d.subject && d.subject.trim()) {
          setEditSubject(d.subject.trim());
        }
        if (d.registeredPostNo && d.registeredPostNo.trim()) {
          setEditRegPostNo(d.registeredPostNo.trim());
          setLetterType('Registered Post');
        } else if (d.postType && (POST_TYPES as readonly string[]).includes(d.postType)) {
          setLetterType(d.postType);
        }
        if (d.suggestedDivision) {
          const match = migrateDivision(d.suggestedDivision);
          if (match) {
            const oldDiv = editDivision;
            setEditDivision(match);
            setEditForwardedDivisions((prev) => {
              const filtered = prev.filter((d) => d !== oldDiv);
              return Array.from(new Set([...filtered, match]));
            });
          }
        }
        setScanFeedback('✓ AI Auto-Fill applied from document photo!');
      } else {
        setScanFeedback('கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிடலாம்.');
      }
    } catch (e: unknown) {
      setScanFeedback('கடிதப் புகைப்படம் இணைக்கப்பட்டுள்ளது. தகவல்களை நேரடியாக உள்ளிடலாம்.');
    } finally {
      setIsScanningDoc(false);
    }
  };

  useEffect(() => {
    if (letter) {
      setEditOriginalNo(letter.originalNo);
      setEditDate(letter.date);
      setEditDispatchedDate(letter.dispatchedDate || letter.date);
      setLetterType(letter.letterType || 'Registered Post');
      setEditRegPostNo(letter.registeredPostNo || '');
      setEditInwardNo(letter.inwardNo);
      setEditFromWhom(letter.fromWhom);
      setEditSubject(letter.subject);
      setEditDivision(migrateDivision(letter.division));
      setEditForwardedDivisions(
        letter.forwardedDivisions && letter.forwardedDivisions.length > 0
          ? letter.forwardedDivisions.map(migrateDivision)
          : [migrateDivision(letter.division)]
      );
      setEditForwardedTo(letter.forwardedTo || []);
      setCurrentAction(letter.action);
      setCurrentReply(letter.replyResponse || '');
      setEditFileNo(letter.fileNo || '');
      setEditImage(letter.image);
      setEditImageSizeKb(letter.imageSizeKb);

      setIsMinimized(false);
      setIsEditingFull(Boolean(initialEditMode));
      setChatPage(1);
    }
  }, [letter, initialEditMode]);

  if (!isOpen || !letter) return null;

  const usersMap = new Map<string, User>(allUsers.map((u) => [u.User_ID, u]));
  const isMailOfficer = currentUser.Role === 'Mail Officer';
  const isSuperAdmin = currentUser.Role === 'Super Admin';
  const isMega = currentUser.Role === 'Mega';
  const isNormal = currentUser.Role === 'Normal';

  // Mail Officer and Super Admin have full permission to edit all fields
  const canModifyAll = isSuperAdmin || isMailOfficer;
  const canForward = isMega || isNormal || isSuperAdmin || isMailOfficer;
  const allowedDivisionForForward = isNormal ? currentUser.Division : undefined;

  const chats = letter.chats || [];
  const totalChatPages = Math.max(1, Math.ceil(chats.length / pageSize));
  const startIndex = (chatPage - 1) * pageSize;
  const currentChatsSlice = chats.slice(startIndex, startIndex + pageSize);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const newMsgObj: LetterChatMessage = {
      id: `msg-${Date.now()}`,
      letterId: letter.id,
      senderId: currentUser.User_ID,
      senderName: currentUser.Name,
      senderRole: currentUser.Role,
      message: newMessage.trim(),
      timestamp: `${new Date().toISOString().split('T')[0]} ${new Date()
        .toTimeString()
        .slice(0, 5)}`,
    };

    const updatedChats = [...chats, newMsgObj];
    const updatedLetter: Letter = {
      ...letter,
      chats: updatedChats,
    };

    onUpdateLetter(updatedLetter);
    setNewMessage('');
    const newTotalPages = Math.ceil(updatedChats.length / pageSize);
    setChatPage(newTotalPages);
  };

  // Full Edit Save (Mail Officer / Super Admin)
  const handleSaveFullEdits = () => {
    const updated: Letter = {
      ...letter,
      originalNo: editOriginalNo.trim(),
      date: editDate,
      dispatchedDate: editDispatchedDate,
      letterType: editLetterType,
      registeredPostNo: editRegPostNo.trim(),
      inwardNo: editInwardNo.trim(),
      fromWhom: editFromWhom.trim(),
      subject: editSubject.trim(),
      division: editDivision,
      forwardedDivisions: Array.from(new Set([editDivision, ...editForwardedDivisions])),
      forwardedTo: editForwardedTo,
      action: currentAction,
      replyResponse: currentReply.trim(),
      fileNo: editFileNo.trim() || undefined,
      image: editImage,
      imageSizeKb: editImageSizeKb,
      handledByMega: isMega ? true : letter.handledByMega,
      megaHandledNote: isMega ? 'Forwarded and verified by Mega User' : letter.megaHandledNote,
    };

    onUpdateLetter(updated);
    setIsEditingFull(false);
    alert('✓ கடித விவரங்கள் சீட்டில் உடனே புதுப்பிக்கப்பட்டு சேமிக்கப்பட்டது! (Saved to Google Sheet)');
  };

  // Quick Action / Reply / Forward / File Number Save
  const handleQuickActionUpdate = () => {
    const updated: Letter = {
      ...letter,
      action: currentAction,
      replyResponse: currentReply.trim(),
      fileNo: editFileNo.trim() || undefined,
      forwardedDivisions: Array.from(new Set([editDivision, ...editForwardedDivisions])),
      forwardedTo: editForwardedTo,
      handledByMega: isMega ? true : letter.handledByMega,
      megaHandledNote: isMega ? 'Handled and routed by Mega User' : letter.megaHandledNote,
    };

    onUpdateLetter(updated);
    alert('✓ நடவடிக்கை நிலை மற்றும் பைல் இலக்கம் சீட்டில் உடனே பதிவாகியது! (Status & File No Synced to Sheet)');
  };

  const handleDeleteLetter = () => {
    if (!isSuperAdmin) return;
    if (confirm(`Are you sure you want to permanently delete mail record (${letter.originalNo})?`)) {
      onDeleteLetter(letter.id);
      onClose();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-blue-400 bg-blue-900 p-2 text-white shadow-2xl">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold hover:text-blue-200"
        >
          <Maximize2 className="h-4 w-4" />
          <span>Mail: {letter.originalNo}</span>
          {chats.length > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold">
              {chats.length}
            </span>
          )}
        </button>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-blue-200 hover:bg-blue-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-slate-900 px-6 py-4 text-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-white">
                {letter.originalNo}
              </span>
              <div>
                <h2 className="text-base font-bold line-clamp-1">{letter.subject}</h2>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                  <span>Inward No: <b>{letter.inwardNo}</b></span>
                  <span>•</span>
                  <span>Reg Date: <b>{letter.date}</b></span>
                  <span>•</span>
                  <span>Division: <b>{letter.division || 'General'}</b></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(true)}
                title="Minimize window"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                title="Close"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Subheader Controls & Tabs */}
          <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-2.5 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shareViaWhatsApp(letter, usersMap)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 font-bold text-white hover:bg-emerald-700 shadow-2xs transition"
              >
                <Share2 className="h-3.5 w-3.5" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => shareViaEmail(letter, usersMap)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 font-bold text-white hover:bg-indigo-700 shadow-2xs transition"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </button>

              <button
                type="button"
                onClick={() =>
                  printLandscapeReport(
                    `Mail Record - ${letter.originalNo}`,
                    [letter],
                    usersMap
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 font-bold text-white hover:bg-slate-900 shadow-2xs transition"
                title="Print 10pt Landscape Slip"
              >
                <Printer className="h-3.5 w-3.5" />
                Print (10pt)
              </button>

              {/* Mail Officer & Super Admin can Edit all fields */}
              {canModifyAll && (
                <button
                  type="button"
                  onClick={() => setIsEditingFull(!isEditingFull)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold shadow-2xs transition ${
                    isEditingFull
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                  title="கடித பதிவாளர்: தானாக பில்லாகிய கடித விடயங்களை மாற்றி உடனே சீட்டில் சேமிக்கவும்"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {isEditingFull ? 'Close Edit Form' : '✏️ கடித விவரங்களை மாற்று (Edit Auto-Filled)'}
                </button>
              )}

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleDeleteLetter}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 font-bold text-white hover:bg-red-700 shadow-2xs transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('details');
                }}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  activeTab === 'details'
                    ? 'bg-blue-800 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Details & Routing
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`relative rounded-md px-3 py-1 font-semibold transition ${
                  activeTab === 'chat'
                    ? 'bg-blue-800 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Internal Notes & Chat
                {chats.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {chats.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Full Edit Form Panel */}
            {isEditingFull && canModifyAll && (
              <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/60 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-amber-700" />
                    கடித பதிவாளர்: கடித விவரங்களை திருத்துதல் / மாற்றுதல் (Mail Officer Edit)
                  </h4>
                  <span className="text-[11px] text-amber-800 font-semibold bg-amber-200/70 px-2 py-0.5 rounded">
                    உடனே Google Sheet இல் புதுப்பிக்கப்படும்
                  </span>
                </div>

                <div className="rounded-xl border border-amber-300 bg-amber-100/70 p-2.5 text-xs text-amber-950 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>
                    முன்னர் தானாக (Auto-fill) அல்லது தவறாக பதிவான விவரங்களை மாற்றி <b>'Save All Changes (சீட்டில் உடனே சேமி)'</b> அழுத்தவும். அனைத்து மாற்றங்களும் Google Sheet இல் உடனே புதுப்பிக்கப்படும்.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700">Original No (கணினி இலக்கம் - KPN) *</label>
                    <input
                      type="text"
                      value={editOriginalNo}
                      onChange={(e) => setEditOriginalNo(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 font-mono font-bold text-blue-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700">Registered Date *</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700">Dispatched Date *</label>
                    <input
                      type="date"
                      value={editDispatchedDate}
                      onChange={(e) => setEditDispatchedDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                  <div>
                    <label className="font-bold text-gray-700">Post Type</label>
                    <select
                      value={editLetterType}
                      onChange={(e) => setLetterType(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2"
                    >
                      {POST_TYPES.map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700">Reg. Post No (Barcode)</label>
                    <input
                      type="text"
                      value={editRegPostNo}
                      onChange={(e) => setEditRegPostNo(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700">Inward No (கடித இலக்கம் - Letter No) *</label>
                    <input
                      type="text"
                      value={editInwardNo}
                      onChange={(e) => setEditInwardNo(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 font-bold"
                    />
                  </div>
                </div>

                {/* Row 3: From Whom */}
                <div className="text-xs">
                  <label className="font-bold text-gray-700 block mb-1">
                    From Whom (அனுப்புனர் / Department / Citizen) *
                  </label>
                  <input
                    type="text"
                    value={editFromWhom}
                    onChange={(e) => setEditFromWhom(e.target.value)}
                    placeholder="அனுப்புனர் அல்லது திணைக்களம்"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs"
                  />
                </div>

                {/* Row 4: Subject */}
                <div className="text-xs">
                  <label className="font-bold text-gray-700 block mb-1">
                    Subject (விடயம் / கடித தலைப்பு) *
                  </label>
                  <textarea
                    rows={2}
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="கடிதத்தின் விடயம்"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs"
                  />
                </div>

                {/* Row 5: Primary Division & File No */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Primary Division (முதன்மைப் பிரிவு) *
                    </label>
                    <select
                      value={editDivision}
                      onChange={(e) => {
                        const newDiv = e.target.value;
                        const prevDiv = editDivision;
                        setEditDivision(newDiv);
                        if (newDiv) {
                          setEditForwardedDivisions((prev) => {
                            const filtered = prev.filter((d) => d !== prevDiv);
                            return Array.from(new Set([...filtered, newDiv]));
                          });
                        }
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 font-semibold text-gray-800"
                    >
                      {DIVISIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Filed File No (பைல் இலக்கம் / கோப்பு எண்)
                    </label>
                    <input
                      type="text"
                      value={editFileNo}
                      onChange={(e) => setEditFileNo(e.target.value)}
                      placeholder="e.g. KN/DS/ADM/2026/04"
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 font-mono font-bold text-emerald-900"
                    />
                  </div>
                </div>

                {/* Row 6: Forward Recipients */}
                <div>
                  <ForwardSelect
                    allUsers={allUsers}
                    allDivisions={DIVISIONS}
                    selectedUserIds={editForwardedTo}
                    selectedDivisions={editForwardedDivisions}
                    onChangeUsers={setEditForwardedTo}
                    onChangeDivisions={setEditForwardedDivisions}
                    label="Recipients (Forward to Officers & Associated Divisions - பிரிவுகள் & உத்தியோகத்தர்கள்)"
                    showDivisionSelect={true}
                  />
                </div>

                {/* Row 7: Action Status & Reply */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs rounded-xl border border-amber-200 bg-white p-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Action Status (நடவடிக்கை நிலை)
                    </label>
                    <select
                      value={currentAction}
                      onChange={(e) => setCurrentAction(e.target.value as LetterAction)}
                      className="w-full rounded-lg border border-gray-300 bg-white p-2 font-bold text-gray-800"
                    >
                      {ACTION_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Action Note / Official Reply (பதில் / நடவடிக்கை குறிப்பு)
                    </label>
                    <input
                      type="text"
                      value={currentReply}
                      onChange={(e) => setCurrentReply(e.target.value)}
                      placeholder="அலுவலக பதில் அல்லது முடிவு"
                      className="w-full rounded-lg border border-gray-300 bg-white p-2"
                    />
                  </div>
                </div>

                {/* Photo modification */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3 text-xs">
                  <div className="flex items-center gap-3">
                    {editImage ? (
                      <img
                        src={editImage}
                        alt="Doc"
                        className="h-12 w-14 rounded object-cover border border-gray-300"
                      />
                    ) : (
                      <span className="text-gray-400">No document attached</span>
                    )}
                    <div>
                      <span className="font-bold text-gray-800">Attached Document</span>
                      <p className="text-gray-500">
                        {editImage ? `Size: ~${editImageSizeKb || 240} KB` : 'Add camera photo'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editImage && (
                      <button
                        type="button"
                        onClick={() => handleScanExistingDoc()}
                        disabled={isScanningDoc}
                        className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1.5 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                        title="Scan photo with AI to auto-fill fields"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isScanningDoc ? 'AI Scanning...' : '⚡ AI Auto-Fill'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="inline-flex items-center gap-1 rounded bg-blue-700 px-2.5 py-1.5 font-bold text-white hover:bg-blue-800"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {editImage ? 'Replace Photo' : 'Add Photo'}
                    </button>
                    {editImage && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditImage(undefined);
                          setEditImageSizeKb(undefined);
                        }}
                        className="rounded bg-red-50 px-2 py-1 text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {scanFeedback && (
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-900">
                    {scanFeedback}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingFull(false)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFullEdits}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-800"
                  >
                    <Check className="h-4 w-4" />
                    Save All Changes
                  </button>
                </div>
              </div>
            )}

            {/* Normal Details View Tab */}
            {activeTab === 'details' ? (
              <div className="space-y-6">
                {/* Requirement: அனைவருக்கும் அக்சன் மற்றும் பைல் இலக்கம் அப்டேட் செய்ய அதிகாரம் உண்டு (சீட்டில் உடனே பதிவாகும்) */}
                <div className="rounded-xl border border-blue-300 bg-blue-50/80 p-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 pb-2 mb-3">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-950">
                      <RefreshCw className="h-4 w-4 text-blue-700" />
                      <span>நடவடிக்கை நிலை & பைல் இலக்கம் (அனைவருக்கும் அதிகாரம் - சீட்டில் உடனே சேமிக்கப்படும்)</span>
                    </div>
                    <span className="text-[11px] text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                      Action & Filing Quick Bar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Action Status (நடவடிக்கை நிலை):
                      </label>
                      <select
                        value={currentAction}
                        onChange={(e) => setCurrentAction(e.target.value as LetterAction)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 font-bold text-gray-900"
                      >
                        {ACTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Filed File No (பைல் இலக்கம் / கோப்பு எண்):
                      </label>
                      <input
                        type="text"
                        value={editFileNo}
                        onChange={(e) => setEditFileNo(e.target.value)}
                        placeholder="e.g. KN/DS/ADM/2026/04"
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 font-mono font-bold text-emerald-900"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Action Note / Reply (பதில் குறிப்பு):
                      </label>
                      <input
                        type="text"
                        value={currentReply}
                        onChange={(e) => setCurrentReply(e.target.value)}
                        placeholder="நடவடிக்கை அல்லது பதில் குறிப்பு..."
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleQuickActionUpdate}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-900 transition"
                    >
                      <Check className="h-4 w-4" />
                      <span>சீட்டில் உடனே சேமிக்கவும் (Save to Sheet Immediately)</span>
                    </button>
                  </div>
                </div>

                {/* 2-Column Info Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 text-xs">
                  <div className="space-y-2.5">
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Original No (கணினி இலக்கம் - KPN)
                      </span>
                      <p className="font-mono font-bold text-blue-900 text-sm">
                        {letter.originalNo}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Inward No (கடித இலக்கம் - Letter No)
                      </span>
                      <p className="font-semibold text-gray-900">{letter.inwardNo}</p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Post Type & Barcode
                      </span>
                      <p className="text-gray-800">
                        {letter.letterType || 'Registered Post'}{' '}
                        {letter.registeredPostNo ? `(${letter.registeredPostNo})` : ''}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        From Whom (Sender)
                      </span>
                      <p className="font-semibold text-gray-800">{letter.fromWhom}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Registered / Dispatched Date
                      </span>
                      <p className="font-semibold text-gray-800">
                        {letter.date} (Dispatched: {letter.dispatchedDate || letter.date})
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Primary Division
                      </span>
                      <p className="font-semibold text-gray-900">
                        {letter.division || DIVISIONS[0]}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Current Action Status
                      </span>
                      <div className="mt-1">
                        <span className="inline-block rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                          {letter.action}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Action Note / Official Reply
                      </span>
                      <p className="text-gray-700 italic">
                        {letter.replyResponse || 'No official reply recorded yet.'}
                      </p>
                    </div>
                    <div>
                      <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                        Filed File Number (பைல் இலக்கம் / கோப்பு எண்)
                      </span>
                      <p className="mt-1 font-mono font-bold text-xs">
                        {letter.fileNo ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-300">
                            📁 {letter.fileNo}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not yet filed in office box/folder</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-full border-t border-gray-200 pt-3">
                    <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                      Mail Subject / Title
                    </span>
                    <p className="mt-1 text-sm font-semibold text-gray-900 leading-relaxed">
                      {letter.subject}
                    </p>
                  </div>
                </div>

                {/* Forwarded Divisions and Officers Card */}
                <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-blue-700" />
                      Assigned Divisions & Forwarded Officers
                    </h4>
                  </div>

                  {/* Display Forwarded Divisions */}
                  <div className="flex flex-wrap gap-1.5">
                    {(letter.forwardedDivisions || [letter.division || 'General']).map((div) => (
                      <span
                        key={div}
                        className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-900 border border-purple-200"
                      >
                        <Building2 className="h-3.5 w-3.5 text-purple-700" />
                        <span>Division: {div}</span>
                      </span>
                    ))}
                  </div>

                  {/* Display Forwarded Officers */}
                  <div className="flex flex-wrap gap-1.5">
                    {(letter.forwardedTo || []).length === 0 ? (
                      <span className="text-xs text-gray-400 italic">
                        No specific individual officers assigned
                      </span>
                    ) : (
                      letter.forwardedTo.map((uid) => {
                        const userObj = usersMap.get(uid);
                        return (
                          <span
                            key={uid}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900 border border-blue-200"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                            <span>{userObj?.Name || uid}</span>
                            <span className="text-[10px] text-blue-500">
                              ({userObj?.Division || 'General'})
                            </span>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Re-forwarding control by Mega / Division Head / Super Admin */}
                  {canForward && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <ForwardSelect
                        allUsers={allUsers}
                        allDivisions={DIVISIONS}
                        selectedUserIds={editForwardedTo}
                        selectedDivisions={editForwardedDivisions}
                        onChangeUsers={setEditForwardedTo}
                        onChangeDivisions={setEditForwardedDivisions}
                        allowedDivisionOnly={allowedDivisionForForward}
                        label="Route / Forward to Divisions or Specific Officers (Mega & Division Head)"
                        showDivisionSelect={true}
                      />
                    </div>
                  )}
                </div>

                {/* Document Preview Card */}
                {letter.image && (
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Camera className="h-4 w-4 text-blue-700" />
                        Attached Mail Document Photo
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          downloadLetterAttachment(
                            letter.image!,
                            `${letter.originalNo}_Document.jpg`
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Image</span>
                      </button>
                    </div>
                    <div className="relative max-w-md overflow-hidden rounded-xl border border-gray-300 bg-black mx-auto">
                      <img
                        src={letter.image}
                        alt="Letter Document"
                        className="max-h-80 w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Status Update Panel for Officers / Division Heads / Mega */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                  <h4 className="font-bold text-blue-950 text-xs mb-3 flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-blue-700" />
                    Update Status, Reply & Filing Box/Folder Number
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-gray-700">
                        Action Status:
                      </label>
                      <select
                        value={currentAction}
                        onChange={(e) => setCurrentAction(e.target.value as LetterAction)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-semibold text-gray-900"
                      >
                        {ACTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-gray-700">
                        Filed File No (பையில் இலக்கம்):
                      </label>
                      <input
                        type="text"
                        value={editFileNo}
                        onChange={(e) => setEditFileNo(e.target.value)}
                        placeholder="e.g. KN/DS/ADM/2026/04"
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs font-mono font-bold text-emerald-900 placeholder:font-normal"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-gray-700">
                        Action Taken / Reply Response:
                      </label>
                      <input
                        type="text"
                        value={currentReply}
                        onChange={(e) => setCurrentReply(e.target.value)}
                        placeholder="Detail the action taken or progress notes..."
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="mt-3.5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleQuickActionUpdate}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-900 transition"
                    >
                      <Check className="h-4 w-4" />
                      Save Status, File No & Routing
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat / Internal Discussion Tab */
              <div className="flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700">
                  <span className="font-bold">
                    Total Notes / Discussions: {chats.length} &nbsp;|&nbsp; Page {chatPage} of{' '}
                    {totalChatPages}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={chatPage <= 1}
                      onClick={() => setChatPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-gray-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={chatPage >= totalChatPages}
                      onClick={() => setChatPage((p) => Math.min(totalChatPages, p + 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold hover:bg-gray-100 disabled:opacity-40"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="min-h-[260px] max-h-[380px] overflow-y-auto space-y-3 rounded-xl border border-gray-200 bg-slate-50/70 p-4">
                  {currentChatsSlice.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                      <MessageSquare className="h-8 w-8 mb-2 stroke-1" />
                      <p className="text-xs">No comments or notes logged for this mail yet.</p>
                    </div>
                  ) : (
                    currentChatsSlice.map((msg) => {
                      const isSelf = msg.senderId === currentUser.User_ID;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-gray-500">
                            <span className="font-bold text-gray-900">{msg.senderName}</span>
                            <span className="rounded bg-gray-200 px-1.5 py-0.2 text-[10px] font-semibold text-gray-700">
                              {msg.senderRole}
                            </span>
                            <span>{msg.timestamp}</span>
                          </div>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-2xs ${
                              isSelf
                                ? 'bg-blue-800 text-white rounded-tr-xs'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-tl-xs'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input and Controls */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <textarea
                      rows={2}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Add internal remarks, action updates, or queries for other officers..."
                      className="flex-1 rounded-xl border border-gray-300 p-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      className="flex items-center justify-center rounded-xl bg-blue-800 px-5 text-white hover:bg-blue-900 shadow-md transition"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs">
                    <span className="text-gray-500 text-[11px]">Control actions:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChatPage(totalChatPages)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                      >
                        <Minus className="h-3.5 w-3.5 text-amber-600" />
                        Minimize
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                      >
                        <X className="h-3.5 w-3.5" />
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 rounded-b-2xl text-xs text-gray-600">
            <div>
              Registered by: <b>{letter.registeredByName}</b>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl, sizeKb) => {
          setEditImage(dataUrl);
          setEditImageSizeKb(sizeKb);
          handleScanExistingDoc(dataUrl);
        }}
      />
    </>
  );
};
