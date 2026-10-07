import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Printer,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Eye,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Layers,
  Sparkles,
  FileText,
  Check,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { Letter, LetterAction, User } from '../types';
import { DIVISIONS, POST_TYPES, migrateDivision } from '../data/initialData';
import {
  printLandscapeReport,
  downloadLetterAttachment,
  ensureStringArray,
  getOfficerDisplayName,
  normalizeAction,
} from '../utils/helpers';

interface DateFoldersListProps {
  letters: Letter[];
  currentUser: User;
  allUsers: User[];
  onSelectLetter: (letter: Letter) => void;
  onEditLetter: (letter: Letter) => void;
  onDeleteLetter: (letterId: string) => void;
  onUpdateLetter?: (updated: Letter) => void;
}

export const DateFoldersList: React.FC<DateFoldersListProps> = ({
  letters,
  currentUser,
  allUsers,
  onSelectLetter,
  onEditLetter,
  onDeleteLetter,
  onUpdateLetter,
}) => {
  const usersMap = new Map<string, User>(allUsers.map((u) => [u.User_ID, u]));
  const isMailOfficer = currentUser.Role === 'Mail Officer';
  const isSuperAdmin = currentUser.Role === 'Super Admin';
  const canModify = isSuperAdmin || isMailOfficer;

  // Inline File No editing state
  const [editingFileNoId, setEditingFileNoId] = useState<string | null>(null);
  const [tempFileNo, setTempFileNo] = useState('');
  const [syncedLetterId, setSyncedLetterId] = useState<string | null>(null);

  // Quick Edit Modal for Mail Officer / Registrar
  const [quickEditLetter, setQuickEditLetter] = useState<Letter | null>(null);

  const handleActionChange = (ltr: Letter, newAction: LetterAction) => {
    if (!onUpdateLetter) return;
    const safeAction = normalizeAction(newAction);
    const updated: Letter = {
      ...ltr,
      action: safeAction,
      forwardedDivisions: ensureStringArray(ltr.forwardedDivisions),
      forwardedTo: ensureStringArray(ltr.forwardedTo),
    };
    onUpdateLetter(updated);
    setSyncedLetterId(ltr.id);
    setTimeout(() => setSyncedLetterId(null), 2500);
  };

  const handleStartEditFileNo = (ltr: Letter) => {
    setEditingFileNoId(ltr.id);
    setTempFileNo(ltr.fileNo || '');
  };

  const handleSaveFileNo = (ltr: Letter) => {
    if (!onUpdateLetter) return;
    const updated: Letter = {
      ...ltr,
      fileNo: tempFileNo.trim(),
      forwardedDivisions: ensureStringArray(ltr.forwardedDivisions),
      forwardedTo: ensureStringArray(ltr.forwardedTo),
    };
    onUpdateLetter(updated);
    setEditingFileNoId(null);
    setSyncedLetterId(ltr.id);
    setTimeout(() => setSyncedLetterId(null), 2500);
  };

  const handleSaveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditLetter || !onUpdateLetter) return;
    const sanitizedQuickEdit: Letter = {
      ...quickEditLetter,
      action: normalizeAction(quickEditLetter.action),
      forwardedDivisions: ensureStringArray(quickEditLetter.forwardedDivisions),
      forwardedTo: ensureStringArray(quickEditLetter.forwardedTo),
    };
    onUpdateLetter(sanitizedQuickEdit);
    setSyncedLetterId(sanitizedQuickEdit.id);
    setQuickEditLetter(null);
    setTimeout(() => setSyncedLetterId(null), 2500);
    alert('✓ கடித விவரங்கள் Google Sheet இல் உடனே மாற்றப்பட்டு பதிவாகியது!');
  };

  // Group letters by registration date
  const groupedByDate: Record<string, Letter[]> = {};
  letters.forEach((l) => {
    const d = l.date || 'Undated';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(l);
  });

  // Sort dates descending (latest date first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // 5-Day Folders Navigation state (User requirement: "05 நாள் போல்டர் முன்னே காட்ட வேண்டும் மற்றயவை அடுத்து முன் என மாற்றி பார்க்க கூடியதாக இருக்க வேண்டும்")
  const DAYS_PER_VIEW = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [viewAllDays, setViewAllDays] = useState(false);

  const totalPages = Math.max(1, Math.ceil(sortedDates.length / DAYS_PER_VIEW));
  const startIndex = (currentPage - 1) * DAYS_PER_VIEW;
  const currentDatesSlice = viewAllDays
    ? sortedDates
    : sortedDates.slice(startIndex, startIndex + DAYS_PER_VIEW);

  // Default open folders
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sortedDates.forEach((d) => {
      initial[d] = true;
    });
    return initial;
  });

  // Automatically ensure active date folders are open when filtered or updated
  useEffect(() => {
    if (sortedDates.length > 0) {
      setOpenFolders((prev) => {
        const next: Record<string, boolean> = { ...prev };
        sortedDates.forEach((d) => {
          next[d] = true;
        });
        return next;
      });
    }
  }, [letters.length, sortedDates.join(',')]);

  const toggleFolder = (d: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [d]: !prev[d],
    }));
  };

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    currentDatesSlice.forEach((d) => {
      allOpen[d] = true;
    });
    setOpenFolders(allOpen);
  };

  const collapseAll = () => {
    setOpenFolders({});
  };

  if (sortedDates.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 shadow-xs">
        <Folder className="mx-auto h-12 w-12 text-gray-300 stroke-1" />
        <h4 className="mt-3 font-bold text-gray-700">No mail records found</h4>
        <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 5-Day Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-linear-to-r from-blue-50 via-white to-indigo-50 p-3 shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="h-4 w-4 text-blue-700" />
          <span className="font-bold text-gray-900">
            {viewAllDays
              ? `Showing All ${sortedDates.length} Date Folders`
              : `Showing 5-Day Folder Batch: Day ${startIndex + 1} to ${Math.min(
                  startIndex + DAYS_PER_VIEW,
                  sortedDates.length
                )} of ${sortedDates.length} Dates`}
          </span>
          {!viewAllDays && (
            <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800 text-[11px]">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        {/* 5-Day Pagination Buttons (Next / Previous) */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              setViewAllDays(false);
              setCurrentPage(1);
            }}
            className={`rounded-lg px-2.5 py-1.5 font-semibold transition ${
              !viewAllDays && currentPage === 1
                ? 'bg-blue-800 text-white font-bold shadow-2xs'
                : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Recent 5 Days
          </button>

          {!viewAllDays && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                title="Newer 5 Days (முன்)"
              >
                <ChevronLeft className="h-4 w-4 text-blue-700" />
                <span>Newer (முன்)</span>
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                title="Older 5 Days (அடுத்து)"
              >
                <span>Older (அடுத்து)</span>
                <ChevronRight className="h-4 w-4 text-blue-700" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setViewAllDays(!viewAllDays)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
          >
            {viewAllDays ? 'Switch to 5-Day View' : 'View All Dates'}
          </button>

          <span className="text-gray-300">|</span>

          <button
            type="button"
            onClick={expandAll}
            className="text-blue-700 font-semibold hover:underline"
          >
            Expand All
          </button>
          <span className="text-gray-300">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-gray-500 hover:underline"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Date Folders Rendering */}
      {currentDatesSlice.map((dateStr, idx) => {
        const dateLetters = groupedByDate[dateStr] || [];
        const isOpen = !!openFolders[dateStr];
        const isLatestDay = currentPage === 1 && idx === 0;

        return (
          <div
            key={dateStr}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition hover:border-blue-300"
          >
            {/* Folder Header Bar */}
            <div
              onClick={() => toggleFolder(dateStr)}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-slate-50/90 px-4 py-3 cursor-pointer select-none hover:bg-slate-100/90"
            >
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}

                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <FolderOpen className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Folder className="h-5 w-5 text-amber-500" />
                  )}
                  <span className="font-bold text-gray-900 text-sm">
                    Date Folder: {dateStr}
                  </span>
                </div>

                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {dateLetters.length} Mail {dateLetters.length === 1 ? 'Record' : 'Records'}
                </span>

                {isLatestDay && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                    Latest Today
                  </span>
                )}
              </div>

              {/* Folder Actions: Print 10pt */}
              <div
                className="flex flex-wrap items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() =>
                    printLandscapeReport(`Mail Register - ${dateStr}`, dateLetters, usersMap)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black transition"
                  title="Print Official A4 Landscape Report with 10pt font & signature column"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print (10pt Font)</span>
                </button>
              </div>
            </div>

            {/* Folder Table View with All Requested Columns */}
            {isOpen && (
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/90 text-gray-700 font-bold">
                      <th className="py-2.5 px-3 whitespace-nowrap">Original No (கணினி இலக்கம்)</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Dispatched Date</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Post Type & Reg. No</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Inward No (கடித இலக்கம்)</th>
                      <th className="py-2.5 px-3">From Whom</th>
                      <th className="py-2.5 px-3 max-w-xs">Subject</th>
                      <th className="py-2.5 px-3">Forwarded Divisions & Officers</th>
                      <th className="py-2.5 px-3">Action Status</th>
                      <th className="py-2.5 px-3">File No (பைல்)</th>
                      <th className="py-2.5 px-3 text-center">Document</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dateLetters.map((ltr, ltrIdx) => {
                      const fwdToArr = ensureStringArray(ltr.forwardedTo);
                      const forwardedOfficerNames = fwdToArr
                        .map((id) => getOfficerDisplayName(id, allUsers))
                        .filter(Boolean);

                      const rawFwdDivs = ensureStringArray(ltr.forwardedDivisions);
                      const divisionsList = (
                        rawFwdDivs.length > 0 ? rawFwdDivs : [ltr.division]
                      ).filter(Boolean);

                      return (
                        <tr
                          key={`${ltr.id || ltr.originalNo}-${ltrIdx}`}
                          className="hover:bg-blue-50/40 transition group"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                            {ltr.originalNo}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-600">
                            {ltr.dispatchedDate || ltr.date}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-800 text-[11px] block w-fit">
                              {ltr.letterType || 'Registered Post'}
                            </span>
                            {ltr.registeredPostNo &&
                              ltr.registeredPostNo !== '-' &&
                              ltr.registeredPostNo !== '_' && (
                                <div className="font-mono text-[10px] text-blue-700 mt-0.5">
                                  Reg: {ltr.registeredPostNo}
                                </div>
                              )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-nowrap">
                            {ltr.inwardNo}
                          </td>
                          <td className="py-2.5 px-3 text-gray-800 font-medium">
                            {ltr.fromWhom}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <span
                              onClick={() => onSelectLetter(ltr)}
                              className="font-semibold text-gray-900 hover:text-blue-700 cursor-pointer line-clamp-2"
                              title={ltr.subject}
                            >
                              {ltr.subject}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[11px] max-w-[200px]">
                            <div
                              className="font-semibold text-blue-900 truncate"
                              title={divisionsList.join(', ')}
                            >
                              🏢 {divisionsList.join(', ') || '-'}
                            </div>
                            {forwardedOfficerNames.length > 0 && (
                              <div
                                className="text-gray-800 truncate mt-1 flex items-center gap-1 font-semibold"
                                title={`Forwarded Recipient Officers: ${forwardedOfficerNames.join(', ')}`}
                              >
                                <span className="text-blue-700 font-bold shrink-0">👤</span>
                                <span className="text-blue-950 font-bold truncate">
                                  {forwardedOfficerNames.join(', ')}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <select
                                value={ltr.action}
                                onChange={(e) => handleActionChange(ltr, e.target.value as LetterAction)}
                                className={`cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold border transition shadow-2xs focus:outline-hidden ${
                                  ltr.action === 'Action Taken' ||
                                  ltr.action === 'நடவடிக்கை எடுக்கப்பட்டது'
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-400 hover:bg-emerald-100'
                                    : ltr.action === 'Action Not Taken' ||
                                      ltr.action === 'நடவடிக்கை எடுக்கப்படவில்லை'
                                    ? 'bg-rose-50 text-rose-900 border-rose-400 hover:bg-rose-100'
                                    : ltr.action === 'Under Investigation' ||
                                      ltr.action === 'கள ஆய்வில்'
                                    ? 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
                                    : 'bg-blue-50 text-blue-900 border-blue-400 hover:bg-blue-100'
                                }`}
                                title="Action Status - அனைவருக்கும் மாற்ற அதிகாரம் உண்டு (சீட்டில் உடனே பதிவாகும்)"
                              >
                                <option value="Not Yet Viewed">Not Yet Viewed (இன்னும் பார்க்கவில்லை)</option>
                                <option value="Action Taken">Action Taken (நடவடிக்கை எடுக்கப்பட்டது)</option>
                                <option value="Action Not Taken">Action Not Taken (நடவடிக்கை எடுக்கப்படவில்லை)</option>
                                <option value="Under Investigation">Under Investigation (கள ஆய்வில்)</option>
                              </select>
                              {syncedLetterId === ltr.id && (
                                <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white animate-pulse" title="சீட்டில் உடனே பதிவாகியது">
                                  ✓ Saved
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {editingFileNoId === ltr.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={tempFileNo}
                                  onChange={(e) => setTempFileNo(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveFileNo(ltr);
                                    if (e.key === 'Escape') setEditingFileNoId(null);
                                  }}
                                  placeholder="KN/ADM/2026/01"
                                  className="w-28 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-[11px] font-mono font-bold text-emerald-900 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveFileNo(ltr)}
                                  title="சீட்டில் உடனே சேமிக்கவும்"
                                  className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700 shadow-2xs"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingFileNoId(null)}
                                  title="Cancel"
                                  className="rounded bg-gray-200 p-1 text-gray-700 hover:bg-gray-300"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleStartEditFileNo(ltr)}
                                className="group/file inline-flex items-center gap-1 cursor-pointer rounded px-1.5 py-0.5 hover:bg-emerald-50 transition border border-transparent hover:border-emerald-200"
                                title="Click to edit File No - அனைவருக்கும் மாற்ற அதிகாரம் உண்டு (சீட்டில் உடனே பதிவாகும்)"
                              >
                                {ltr.fileNo ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold font-mono text-emerald-800 border border-emerald-200">
                                    📁 {ltr.fileNo}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic hover:text-emerald-700">
                                    + பைல் எண்
                                  </span>
                                )}
                                <Edit className="h-2.5 w-2.5 text-gray-400 opacity-0 group-hover/file:opacity-100 transition" />
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {ltr.image ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onSelectLetter(ltr)}
                                  className="rounded bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800 border border-blue-200 hover:bg-blue-100"
                                >
                                  <ImageIcon className="inline h-3 w-3 mr-1" />
                                  ~{ltr.imageSizeKb || 240}KB
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    downloadLetterAttachment(
                                      ltr.image!,
                                      `${ltr.originalNo}_Doc.jpg`
                                    )
                                  }
                                  className="rounded bg-emerald-50 p-1 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  title="Download Image"
                                >
                                  <Download className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectLetter(ltr)}
                                title="View Details / Chats"
                                className="rounded p-1 text-gray-600 hover:bg-gray-200"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {canModify && (
                                <button
                                  type="button"
                                  onClick={() => setQuickEditLetter({ ...ltr })}
                                  title="கடித பதிவாளர்: தானாக பில்லாகிய தகவல்களை மாற்று (சீட்டில் உடனே மாறும்)"
                                  className="inline-flex items-center gap-1 rounded bg-amber-500 hover:bg-amber-600 px-2 py-1 text-[11px] font-bold text-white shadow-2xs transition"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>மாற்று</span>
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteLetter(ltr.id)}
                                  title="Delete Record"
                                  className="rounded p-1 text-red-600 hover:bg-red-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Quick Edit Modal for Mail Officer / Registrar */}
      {quickEditLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-amber-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between bg-amber-600 px-5 py-3 text-white">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                <div>
                  <h3 className="text-sm font-bold">
                    கடித பதிவாளர்: கடித விவரங்களை மாற்றுதல் (Quick Edit & Sync to Sheet)
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    Original No: {quickEditLetter.originalNo} • தானாக அல்லது தவறாக பதிவான விவரங்களை மாற்றி உடனே சேமிக்கலாம்.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditLetter(null)}
                className="rounded p-1 text-white hover:bg-amber-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="p-5 space-y-3.5 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Inward No (கடித இலக்கம் - Letter Reference No) *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickEditLetter.inwardNo}
                    onChange={(e) => setQuickEditLetter({ ...quickEditLetter, inwardNo: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-bold text-gray-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Dispatched Date (அனுப்பிய திகதி) *
                  </label>
                  <input
                    type="date"
                    required
                    value={quickEditLetter.dispatchedDate || quickEditLetter.date}
                    onChange={(e) => setQuickEditLetter({ ...quickEditLetter, dispatchedDate: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  From Whom (அனுப்புனர் / Sender Department / Citizen) *
                </label>
                <input
                  type="text"
                  required
                  value={quickEditLetter.fromWhom}
                  onChange={(e) => setQuickEditLetter({ ...quickEditLetter, fromWhom: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Subject (கடித விடயம் / தலைப்பு) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={quickEditLetter.subject}
                  onChange={(e) => setQuickEditLetter({ ...quickEditLetter, subject: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Primary Division (முதன்மைப் பிரிவு) *
                  </label>
                  <select
                    value={quickEditLetter.division}
                    onChange={(e) => setQuickEditLetter({ ...quickEditLetter, division: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-semibold text-gray-900 bg-white"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Filed File No (பைல் இலக்கம் / கோப்பு எண்)
                  </label>
                  <input
                    type="text"
                    value={quickEditLetter.fileNo || ''}
                    onChange={(e) => setQuickEditLetter({ ...quickEditLetter, fileNo: e.target.value })}
                    placeholder="e.g. KN/DS/ADM/2026/04"
                    className="w-full rounded-lg border border-gray-300 p-2 font-mono font-bold text-emerald-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Action Status (அக்சன் நிலை)
                  </label>
                  <select
                    value={quickEditLetter.action}
                    onChange={(e) => setQuickEditLetter({ ...quickEditLetter, action: e.target.value as LetterAction })}
                    className="w-full rounded-lg border border-gray-300 p-2 font-bold text-gray-900 bg-white"
                  >
                    <option value="Not Yet Viewed">Not Yet Viewed (இன்னும் பார்க்கவில்லை)</option>
                    <option value="Action Taken">Action Taken (நடவடிக்கை எடுக்கப்பட்டது)</option>
                    <option value="Action Not Taken">Action Not Taken (நடவடிக்கை எடுக்கப்படவில்லை)</option>
                    <option value="Under Investigation">Under Investigation (கள ஆய்வில்)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Action Reply Note (பதில் / முடிவு)
                  </label>
                  <input
                    type="text"
                    value={quickEditLetter.replyResponse || ''}
                    onChange={(e) => setQuickEditLetter({ ...quickEditLetter, replyResponse: e.target.value })}
                    placeholder="அலுவலக பதில் அல்லது முடிவு"
                    className="w-full rounded-lg border border-gray-300 p-2 text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    const ltr = quickEditLetter;
                    setQuickEditLetter(null);
                    onEditLetter(ltr);
                  }}
                  className="text-xs text-blue-700 font-bold hover:underline"
                >
                  Open Full Advanced Editor with Document Photo &rarr;
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickEditLetter(null)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 font-bold text-white shadow-md hover:bg-emerald-800"
                  >
                    <Check className="h-4 w-4" />
                    <span>சீட்டில் உடனே சேமி (Save to Sheet)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
