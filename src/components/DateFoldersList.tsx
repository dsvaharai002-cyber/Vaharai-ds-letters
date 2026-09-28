import React, { useState } from 'react';
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
} from 'lucide-react';
import { Letter, User } from '../types';
import { printLandscapeReport, downloadLetterAttachment } from '../utils/helpers';

interface DateFoldersListProps {
  letters: Letter[];
  currentUser: User;
  allUsers: User[];
  onSelectLetter: (letter: Letter) => void;
  onEditLetter: (letter: Letter) => void;
  onDeleteLetter: (letterId: string) => void;
}

export const DateFoldersList: React.FC<DateFoldersListProps> = ({
  letters,
  currentUser,
  allUsers,
  onSelectLetter,
  onEditLetter,
  onDeleteLetter,
}) => {
  const usersMap = new Map<string, User>(allUsers.map((u) => [u.User_ID, u]));
  const isMailOfficer = currentUser.Role === 'Mail Officer';
  const isSuperAdmin = currentUser.Role === 'Super Admin';
  const canModify = isSuperAdmin || isMailOfficer;

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

  // Default open the first 2 folders of the active view
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sortedDates.slice(0, 2).forEach((d) => {
      initial[d] = true;
    });
    return initial;
  });

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
                      const forwardedNames = (ltr.forwardedTo || [])
                        .map((id) => usersMap.get(id)?.Name || id)
                        .join(', ');

                      const divisionsList = (
                        ltr.forwardedDivisions && ltr.forwardedDivisions.length > 0
                          ? ltr.forwardedDivisions
                          : [ltr.division]
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
                            {forwardedNames && (
                              <div
                                className="text-gray-600 truncate mt-0.5"
                                title={forwardedNames}
                              >
                                👤 {forwardedNames}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                ltr.action === 'Action Taken' ||
                                ltr.action === 'நடவடிக்கை எடுக்கப்பட்டது'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ltr.action === 'Action Not Taken' ||
                                    ltr.action === 'நடவடிக்கை எடுக்கப்படவில்லை'
                                  ? 'bg-rose-100 text-rose-800'
                                  : ltr.action === 'Under Investigation' ||
                                    ltr.action === 'கள ஆய்வில்'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {ltr.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {ltr.fileNo ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold font-mono text-emerald-800 border border-emerald-200">
                                📁 {ltr.fileNo}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs italic">-</span>
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
                                  onClick={() => onEditLetter(ltr)}
                                  title="Edit All Letter Fields (கடிதத்தை திருத்து)"
                                  className="rounded p-1 text-amber-600 hover:bg-amber-100"
                                >
                                  <Edit3 className="h-4 w-4" />
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
    </div>
  );
};
