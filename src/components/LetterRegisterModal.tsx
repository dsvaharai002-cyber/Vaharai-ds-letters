import React, { useState, useEffect } from 'react';
import { Camera, X, Check, Share2, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { Letter, LetterAction, User } from '../types';
import { generateOriginalNo, shareViaEmail, shareViaWhatsApp } from '../utils/helpers';
import { ForwardUserSelect } from './ForwardUserSelect';
import { CameraCaptureModal } from './CameraCaptureModal';

interface LetterRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newLetter: Letter) => void;
  currentUser: User;
  allUsers: User[];
  existingLetters: Letter[];
}

const ACTION_OPTIONS: LetterAction[] = [
  'இன்னும் பார்க்கவில்லை',
  'நடவடிக்கை எடுக்கப்பட்டது',
  'நடவடிக்கை எடுக்கப்படவில்லை',
  'கள ஆய்வில்',
];

export const LetterRegisterModal: React.FC<LetterRegisterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  allUsers,
  existingLetters,
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [originalNo, setOriginalNo] = useState<string>('');
  const [inwardNo, setInwardNo] = useState<string>('');
  const [fromWhom, setFromWhom] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [forwardedTo, setForwardedTo] = useState<string[]>([]);
  const [action, setAction] = useState<LetterAction>('இன்னும் பார்க்கவில்லை');
  const [replyResponse, setReplyResponse] = useState<string>('');
  const [initialNote, setInitialNote] = useState<string>('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [imageSizeKb, setImageSizeKb] = useState<number | undefined>(undefined);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate originalNo when date changes
  useEffect(() => {
    if (isOpen) {
      const generated = generateOriginalNo(date, existingLetters);
      setOriginalNo(generated);
    }
  }, [date, isOpen, existingLetters]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setInwardNo('');
      setFromWhom('');
      setSubject('');
      setForwardedTo([]);
      setAction('இன்னும் பார்க்கவில்லை');
      setReplyResponse('');
      setInitialNote('');
      setImage(undefined);
      setImageSizeKb(undefined);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const usersMap = new Map<string, User>(allUsers.map((u) => [u.User_ID, u]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!originalNo.trim()) {
      setErrorMsg('Original No வழங்கப்பட வேண்டும்.');
      return;
    }
    if (!inwardNo.trim()) {
      setErrorMsg('Inward No (உள்வரும் கடித இலக்கம்) உள்ளிடுக.');
      return;
    }
    if (!fromWhom.trim()) {
      setErrorMsg('அனுப்புநர் (From whom) விபரத்தை உள்ளிடுக.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('SUBJECT (விடயம்) உள்ளிடுக.');
      return;
    }

    const newLetterId = `LTR-${Date.now()}`;
    const newLetter: Letter = {
      id: newLetterId,
      originalNo: originalNo.trim(),
      date: date,
      inwardNo: inwardNo.trim(),
      fromWhom: fromWhom.trim(),
      subject: subject.trim(),
      forwardedTo: forwardedTo,
      action: action,
      replyResponse: replyResponse.trim(),
      image: image,
      imageSizeKb: imageSizeKb,
      registeredBy: currentUser.User_ID,
      registeredByName: currentUser.Name,
      createdAt: `${date} ${new Date().toTimeString().slice(0, 5)}`,
      chats: initialNote.trim()
        ? [
            {
              id: `msg-${Date.now()}`,
              letterId: newLetterId,
              senderId: currentUser.User_ID,
              senderName: currentUser.Name,
              senderRole: currentUser.Role,
              message: initialNote.trim(),
              timestamp: `${date} ${new Date().toTimeString().slice(0, 5)}`,
            },
          ]
        : [],
    };

    onSave(newLetter);
    onClose();
  };

  // Preview mock letter object for instant WhatsApp/Email share during drafting
  const tempLetterForShare: Letter = {
    id: 'temp',
    originalNo: originalNo || 'Draft',
    date,
    inwardNo: inwardNo || '-',
    fromWhom: fromWhom || '-',
    subject: subject || '-',
    forwardedTo,
    action,
    replyResponse,
    registeredBy: currentUser.User_ID,
    registeredByName: currentUser.Name,
    createdAt: date,
    chats: [],
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
        <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-blue-900 px-6 py-4 text-white rounded-t-xl">
            <div>
              <h2 className="text-lg font-bold">
                ✉️ புதிய கடிதம் பதிவு செய்தல் (Mail Officer)
              </h2>
              <p className="text-xs text-blue-200">
                கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலக கடித மேலாண்மை அமைப்பு
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-blue-200 hover:bg-blue-800 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Row 1: Original No (Auto-generated) & Date (Editable) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Original No (கணணி மூலம் தானாக உருவாக்கப்பட்டது)
                </label>
                <input
                  type="text"
                  value={originalNo}
                  onChange={(e) => setOriginalNo(e.target.value)}
                  className="w-full rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm font-semibold text-blue-950 focus:border-blue-500 focus:bg-white focus:outline-hidden"
                  placeholder="KPN-VHR-YYYYMMDD-001"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  திகதி (Date - மாற்றக்கூடியது)
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Row 2: Inward No & From Whom */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  Inward No (கடித உள்வரும் இலக்கம்) *
                </label>
                <input
                  type="text"
                  required
                  value={inwardNo}
                  onChange={(e) => setInwardNo(e.target.value)}
                  placeholder="எ.கா: INW/2026/896"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  அனுப்புநர் (From whom) *
                </label>
                <input
                  type="text"
                  required
                  value={fromWhom}
                  onChange={(e) => setFromWhom(e.target.value)}
                  placeholder="எ.கா: மாவட்டச் செயலகம் / பொதுமகன் பெயர்"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Row 3: SUBJECT */}
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                SUBJECT (விடயம் / தலைப்பு) *
              </label>
              <textarea
                required
                rows={2}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="கடிதத்தின் தலைப்பு அல்லது சுருக்கமான விடயத்தை விரிவாக உள்ளிடுக..."
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Row 4: Image Capture (~124 KB) + Share to WhatsApp/Email */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">
                    📷 கடிதத்தின் புகைப்படம் (Image – ~124 KB கேமரா ஓன்)
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    கேமரா மூலம் நேரடியாக படம் பிடித்து ~124 KB அளவில் சேமிக்கப்படும்.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-800"
                  >
                    <Camera className="h-4 w-4" />
                    கேமரா ஆன் / படம் எடு (124 KB)
                  </button>

                  {/* Share buttons */}
                  <button
                    type="button"
                    title="WhatsApp இல் பகிர்க"
                    onClick={() => shareViaWhatsApp(tempLetterForShare, usersMap)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    வாட்அப்
                  </button>
                  <button
                    type="button"
                    title="இமெயில் மூலம் பகிர்க"
                    onClick={() => shareViaEmail(tempLetterForShare, usersMap)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    இமெயில்
                  </button>
                </div>
              </div>

              {image ? (
                <div className="mt-3 flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-2">
                  <img
                    src={image}
                    alt="Letter snap"
                    className="h-20 w-24 rounded object-cover border border-gray-300"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-emerald-700">
                      ✓ புகைப்படம் இணைக்கப்பட்டுள்ளது
                    </span>
                    <p className="text-gray-600">அளவு: ~{imageSizeKb || 124} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImage(undefined);
                      setImageSizeKb(undefined);
                    }}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-2 text-center text-xs text-gray-500 italic">
                  புகைப்படம் இணைக்கப்படவில்லை (விரும்பினால் கேமராவை ஆன் செய்யவும்)
                </div>
              )}
            </div>

            {/* Row 5: Forwarded To (Searchable Multi-select) */}
            <div>
              <ForwardUserSelect
                allUsers={allUsers}
                selectedUserIds={forwardedTo}
                onChange={setForwardedTo}
                label="Forwarded To (பயனர்களை பல்தேர்வு செய்ய தேடலுடன் கூடிய தெரிவு)"
              />
            </div>

            {/* Row 6: Action (4 Options) & Reply and response */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  நடவடிக்கை நிலை (Action)
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as LetterAction)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-hidden"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">
                  பதில் மற்றும் விளக்கம் (Reply and response)
                </label>
                <input
                  type="text"
                  value={replyResponse}
                  onChange={(e) => setReplyResponse(e.target.value)}
                  placeholder="பதில் ஏதேனும் இருப்பின் உள்ளிடுக..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Initial Note / Chat for this letter */}
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-bold text-gray-700">
                <MessageSquare className="h-3.5 w-3.5 text-blue-700" />
                <span>ஆரம்ப குறிப்புரை (Initial Note / Chat)</span>
              </label>
              <input
                type="text"
                value={initialNote}
                onChange={(e) => setInitialNote(e.target.value)}
                placeholder="இக்கடிதம் பற்றிய ஆரம்ப அறிவுறுத்தல் அல்லது குறிப்புரை..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </form>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              ரத்து செய்
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
            >
              <Check className="h-4 w-4" />
              கடிதத்தை பதிவு செய் (Save Letter)
            </button>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl, sizeKb) => {
          setImage(dataUrl);
          setImageSizeKb(sizeKb);
        }}
      />
    </>
  );
};
