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
  Building,
  Calendar,
  Tag,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Letter, LetterAction, LetterChatMessage, User } from '../types';
import { shareViaEmail, shareViaWhatsApp, downloadLetterAttachment } from '../utils/helpers';
import { ForwardUserSelect } from './ForwardUserSelect';

interface LetterDetailAndChatModalProps {
  isOpen: boolean;
  letter: Letter | null;
  currentUser: User;
  allUsers: User[];
  onClose: () => void;
  onUpdateLetter: (updated: Letter) => void;
  onDeleteLetter: (letterId: string) => void;
}

const ACTION_OPTIONS: LetterAction[] = [
  'இன்னும் பார்க்கவில்லை',
  'நடவடிக்கை எடுக்கப்பட்டது',
  'நடவடிக்கை எடுக்கப்படவில்லை',
  'கள ஆய்வில்',
];

export const LetterDetailAndChatModal: React.FC<LetterDetailAndChatModalProps> = ({
  isOpen,
  letter,
  currentUser,
  allUsers,
  onClose,
  onUpdateLetter,
  onDeleteLetter,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');
  const [isMinimized, setIsMinimized] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [chatPage, setChatPage] = useState(1);
  const pageSize = 10;

  const [currentAction, setCurrentAction] = useState<LetterAction>('இன்னும் பார்க்கவில்லை');
  const [currentReply, setCurrentReply] = useState('');
  const [currentForwardedTo, setCurrentForwardedTo] = useState<string[]>([]);
  const [isEditingFull, setIsEditingFull] = useState(false);

  const [editSubject, setEditSubject] = useState('');
  const [editInwardNo, setEditInwardNo] = useState('');
  const [editFromWhom, setEditFromWhom] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    if (letter) {
      setCurrentAction(letter.action);
      setCurrentReply(letter.replyResponse || '');
      setCurrentForwardedTo(letter.forwardedTo || []);
      setEditSubject(letter.subject);
      setEditInwardNo(letter.inwardNo);
      setEditFromWhom(letter.fromWhom);
      setEditDate(letter.date);
      setIsMinimized(false);
      setIsEditingFull(false);
      setChatPage(1);
    }
  }, [letter]);

  if (!isOpen || !letter) return null;

  const usersMap = new Map<string, User>(allUsers.map((u) => [u.User_ID, u]));
  const isMailOfficer = currentUser.Role === 'Mail Officer';
  const isSuperAdmin = currentUser.Role === 'Super Admin';
  const isMega = currentUser.Role === 'Mega';
  const isNormal = currentUser.Role === 'Normal';

  // கடிதப்பதிவு உத்தியோகத்தருக்கும் (Mail Officer) சுப்பர் அட்மினுக்கு ஒத்த முழுத் திருத்தும் அதிகாரம் வழங்கப்படுகிறது
  const canModify = isSuperAdmin || isMailOfficer;
  const canForward = isMega || isNormal || isSuperAdmin;
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
      timestamp: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().slice(0, 5)}`,
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

  const handleDeleteChatMessage = (msgId: string) => {
    if (!isSuperAdmin) return;
    if (!confirm('இந்த உரையாடல் செய்தியை அழிக்க விரும்புகிறீர்களா?')) return;

    const updatedChats = chats.filter((c) => c.id !== msgId);
    onUpdateLetter({
      ...letter,
      chats: updatedChats,
    });
  };

  const handleSaveActionAndReply = () => {
    const updated: Letter = {
      ...letter,
      action: currentAction,
      replyResponse: currentReply,
      forwardedTo: currentForwardedTo,
      handledByMega: isMega ? true : letter.handledByMega,
      megaHandledNote: isMega ? 'மெகா பயனரால் கையாளப்பட்டது' : letter.megaHandledNote,
    };
    onUpdateLetter(updated);
    alert('கடிதத்தின் நிலை வெற்றிகரமாக புதுப்பிக்கப்பட்டது!');
  };

  const handleSaveSuperAdminEdits = () => {
    const updated: Letter = {
      ...letter,
      date: editDate,
      inwardNo: editInwardNo,
      fromWhom: editFromWhom,
      subject: editSubject,
      action: currentAction,
      replyResponse: currentReply,
      forwardedTo: currentForwardedTo,
    };
    onUpdateLetter(updated);
    setIsEditingFull(false);
    alert('கடித விபரங்கள் திருத்தப்பட்டன.');
  };

  const handleDeletePhoto = () => {
    if (!canModify) return;
    if (!confirm('இக்கடிதத்தின் புகைப்படத்தை நீக்க விரும்புகிறீர்களா?')) return;
    onUpdateLetter({
      ...letter,
      image: undefined,
      imageSizeKb: undefined,
    });
  };

  const handleDeleteLetter = () => {
    if (!isSuperAdmin) return;
    if (confirm(`கடிதம் (${letter.originalNo}) முழுமையாக நீக்கப்பட வேண்டுமா?`)) {
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
          <span>கடிதம்: {letter.originalNo}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-900 px-6 py-4 text-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-mono font-bold tracking-wider text-white">
              {letter.originalNo}
            </span>
            <div>
              <h2 className="text-base font-bold line-clamp-1">{letter.subject}</h2>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span>Inward No: <b>{letter.inwardNo}</b></span>
                <span>•</span>
                <span>திகதி: <b>{letter.date}</b></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              title="மினிமைஸ் (Minimize)"
              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              title="வெளியேறு (Close)"
              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-2.5 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shareViaWhatsApp(letter, usersMap)}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Share2 className="h-3.5 w-3.5" />
              வாட்அப் பகிர்வு
            </button>
            <button
              onClick={() => shareViaEmail(letter, usersMap)}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              <Mail className="h-3.5 w-3.5" />
              இமெயில் பகிர்வு
            </button>
            
            {/* கடிதப்பதிவு உத்தியோகத்தர் மற்றும் Super Admin இருவருக்கும் கடிதத்தைத் திருத்தும் அதிகாரம் */}
            {canModify && (
              <button
                onClick={() => setIsEditingFull(!isEditingFull)}
                className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {isEditingFull ? 'திருத்துவதை ரத்து செய்' : 'கடிதத்தை திருத்து'}
              </button>
            )}

            {isSuperAdmin && (
              <button
                onClick={handleDeleteLetter}
                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                கடிதத்தை நீக்கு
              </button>
            )}
          </div>

          {!isMailOfficer && (
            <div className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  activeTab === 'details'
                    ? 'bg-blue-800 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                விபரங்கள் (Details)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`relative rounded-md px-3 py-1 text-xs font-semibold transition ${
                  activeTab === 'chat'
                    ? 'bg-blue-800 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                உரையாடல் (Chat)
                {chats.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] text-white">
                    {chats.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isEditingFull && canModify ? (
            <div className="space-y-4 rounded-xl border border-amber-300 bg-amber-50/50 p-4 mb-4">
              <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                <Edit3 className="h-4 w-4" /> கடிதத் திருத்தப் படிவம்
              </h4>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700">திகதி (Date):</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Inward No:</label>
                  <input
                    type="text"
                    value={editInwardNo}
                    onChange={(e) => setEditInwardNo(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white p-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">அனுப்புநர் (From whom):</label>
                  <input
                    type="text"
                    value={editFromWhom}
                    onChange={(e) => setEditFromWhom(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white p-1.5 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-gray-700 text-xs">SUBJECT (விடயம்):</label>
                <textarea
                  rows={2}
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white p-2 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveSuperAdminEdits}
                className="inline-flex items-center gap-1 rounded bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800"
              >
                <Check className="h-3.5 w-3.5" /> மாற்றங்களைச் சேமி
              </button>
            </div>
          ) : null}

          {activeTab === 'details' || isMailOfficer ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-xs">
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-gray-500">Original No:</span>
                    <p className="font-mono font-bold text-blue-900 text-sm">{letter.originalNo}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">உள்வரும் இலக்கம் (Inward No):</span>
                    <p className="font-semibold text-gray-800">{letter.inwardNo}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">அனுப்புநர் (From whom):</span>
                    <p className="font-semibold text-gray-800">{letter.fromWhom}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">பதிவு செய்தவர்:</span>
                    <p className="text-gray-700">{letter.registeredByName}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-gray-500">பதிவு திகதி:</span>
                    <p className="font-semibold text-gray-800">{letter.date}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">நடவடிக்கை நிலை (Action):</span>
                    <div className="mt-1">
                      <span className="inline-block rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                        {letter.action}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">பதில் & விளக்கம் (Reply):</span>
                    <p className="text-gray-700 italic">
                      {letter.replyResponse || 'எந்தப் பதிலும் இதுவரை பதியப்படவில்லை'}
                    </p>
                  </div>
                </div>

                <div className="col-span-full border-t border-gray-200 pt-2">
                  <span className="font-semibold text-gray-500">தலைப்பு / விடயம் (SUBJECT):</span>
                  <p className="mt-1 text-sm font-medium text-gray-900 leading-relaxed">
                    {letter.subject}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800">
                    அனுப்பப்பட்டுள்ள உத்தியோகத்தர்கள் (Forwarded to):
                  </h4>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {currentForwardedTo.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">எவருக்கும் அனுப்பப்படவில்லை</span>
                  ) : (
                    currentForwardedTo.map((uid) => {
                      const userObj = usersMap.get(uid);
                      return (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800 border border-blue-200"
                        >
                          <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                          <span>{userObj?.Name || uid}</span>
                        </span>
                      );
                    })
                  )}
                </div>

                {canForward && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <ForwardUserSelect
                      allUsers={allUsers}
                      selectedUserIds={currentForwardedTo}
                      onChange={setCurrentForwardedTo}
                      allowedDivisionOnly={allowedDivisionForForward}
                      label="கடிதத்தை மேலும் உத்தியோகத்தர்களுக்கு போவேட் செய்ய (Re-Forward)"
                    />
                  </div>
                )}
              </div>

              {letter.image && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-800">📷 இணைக்கப்பட்ட கடிதப் புகைப்படம்</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadLetterAttachment(letter.image!, `${letter.originalNo}_Document.jpg`)}
                        className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>பதிவிறக்கு</span>
                      </button>

                      {canModify && (
                        <button
                          type="button"
                          onClick={handleDeletePhoto}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 ml-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          புகைப்படத்தை நீக்கு
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="relative max-w-sm overflow-hidden rounded-lg border border-gray-300 bg-black">
                    <img src={letter.image} alt="Letter Document" className="max-h-72 w-full object-contain" />
                  </div>
                </div>
              )}

              {!isMailOfficer && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <h4 className="font-bold text-blue-950 text-xs mb-3">
                    🔄 நடவடிக்கையை புதுப்பித்தல் (Update Action & Reply)
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-xs">
                    <div>
                      <label className="mb-1 block font-bold text-gray-700">நடவடிக்கை நிலை (Action):</label>
                      <select
                        value={currentAction}
                        onChange={(e) => setCurrentAction(e.target.value as LetterAction)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800"
                      >
                        {ACTION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block font-bold text-gray-700">பதில் மற்றும் விளக்கம்:</label>
                      <input
                        type="text"
                        value={currentReply}
                        onChange={(e) => setCurrentReply(e.target.value)}
                        placeholder="எடுக்கப்பட்ட நடவடிக்கை / பதில்..."
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveActionAndReply}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800"
                    >
                      <Check className="h-3.5 w-3.5" />
                      மாற்றங்களைச் சேமிக்கவும் (Update)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700">
                <span className="font-semibold">
                  மொத்த உரையாடல்கள்: {chats.length} &nbsp;|&nbsp; பக்கம் {chatPage} / {totalChatPages}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={chatPage <= 1}
                    onClick={() => setChatPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    முன்னைய (Previous)
                  </button>
                  <button
                    type="button"
                    disabled={chatPage >= totalChatPages}
                    onClick={() => setChatPage((p) => Math.min(totalChatPages, p + 1))}
                    className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-gray-100 disabled:opacity-40"
                  >
                    பின்னைய (Next)
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="min-h-[260px] max-h-[380px] overflow-y-auto space-y-3 rounded-lg border border-gray-200 bg-slate-50/70 p-4">
                {currentChatsSlice.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                    <MessageSquare className="h-8 w-8 mb-2 stroke-1" />
                    <p className="text-xs">உரையாடல்கள் எதுவும் இல்லை.</p>
                  </div>
                ) : (
                  currentChatsSlice.map((msg) => {
                    const isSelf = msg.senderId === currentUser.User_ID;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-800">{msg.senderName}</span>
                          <span className="rounded bg-gray-200 px-1.5 py-0.2 text-[10px] text-gray-700">{msg.senderRole}</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed shadow-xs ${isSelf ? 'bg-blue-600 text-white rounded-tr-xs' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs'}`}>
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* உரைப்பகுதி மற்றும் அதன் கீழே கேட்கப்பட்ட கட்டுப்பாட்டுப் பொத்தான்கள் */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="கடிதம் பற்றிய குறிப்பு அல்லது உரையாடலை உள்ளிடுக... (Enter அழுத்தி அனுப்புக)"
                    className="flex-1 rounded-lg border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="flex items-center justify-center rounded-lg bg-blue-700 px-4 text-white hover:bg-blue-800 shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-xs">
                  <span className="text-gray-500 text-[11px]">உரையாடல் கட்டுப்பாட்டுப் பொத்தான்கள்:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChatPage(totalChatPages)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                      புதிப்பி (Refresh)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                    >
                      <Minus className="h-3.5 w-3.5 text-amber-600" />
                      மினிமைஸ் (Minimize)
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      வெளியேறு (Close)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 rounded-b-xl text-xs text-gray-600">
          <div>
            <span>பதிவு செய்தவர்: <b>{letter.registeredByName}</b></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 font-medium text-gray-700 hover:bg-gray-100"
          >
            மூடுக (Close)
          </button>
        </div>
      </div>
    </div>
  );
};