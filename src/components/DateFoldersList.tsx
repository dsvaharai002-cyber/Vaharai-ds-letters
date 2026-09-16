import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  Printer,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Eye,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { Letter, User } from '../types';
import { printLandscapeDateReport, exportLettersToExcel, downloadLetterAttachment } from '../utils/helpers';
import { downloadDateLettersPdf } from '../utils/pdfGenerator';

interface DateFoldersListProps {
  letters: Letter[];
  currentUser: User;
  allUsers: User[];
  onSelectLetter: (letter: Letter) => void;
  onEditLetter?: (letter: Letter) => void;
  onDeleteLetter?: (letterId: string) => void;
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

  // Group letters by date
  const groupedByDate: Record<string, Letter[]> = {};
  letters.forEach((l) => {
    const d = l.date || 'தெரியாத திகதி';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(l);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Open folders state - open first 3 dates by default
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sortedDates.slice(0, 3).forEach((d) => {
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
    sortedDates.forEach((d) => {
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
        <h4 className="mt-3 font-semibold text-gray-700">கடிதங்கள் எதுவும் இல்லை</h4>
        <p className="mt-1 text-xs text-gray-400">
          {currentUser.Role === 'User'
            ? 'உங்களுக்கு அனுப்பப்பட்ட கடிதங்கள் எதுவும் கண்டறியப்படவில்லை.'
            : currentUser.Role === 'Normal'
            ? 'உங்கள் பிரிவுக்குரிய கடிதங்கள் எதுவும் கண்டறியப்படவில்லை.'
            : 'பதிவு செய்யப்பட்ட கடிதங்கள் எதுவும் இல்லை.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-600">
        <div>
          <span>மொத்த திகதி போல்டர்கள்: <b>{sortedDates.length}</b></span>
          <span className="mx-2">•</span>
          <span>காண்பிக்கப்படும் கடிதங்கள்: <b>{letters.length}</b></span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-blue-700 hover:underline font-semibold"
          >
            அனைத்தையும் திறக்க (Expand All)
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-gray-600 hover:underline"
          >
            அனைத்தையும் மூட (Collapse All)
          </button>
        </div>
      </div>

      {/* Date Folders */}
      {sortedDates.map((dateStr) => {
        const dateLetters = groupedByDate[dateStr];
        const isOpen = !!openFolders[dateStr];

        return (
          <div
            key={dateStr}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition hover:border-gray-300"
          >
            {/* Folder Header */}
            <div
              onClick={() => toggleFolder(dateStr)}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-slate-50/80 px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center gap-2.5">
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
                    📁 திகதி போல்டர்: {dateStr}
                  </span>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {dateLetters.length} கடிதங்கள்
                </span>
              </div>

              {/* Folder Actions: Landscape Print, PDF Download, Excel Download */}
              <div
                className="flex flex-wrap items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => downloadDateLettersPdf(dateStr, dateLetters, usersMap)}
                  title="இத்திகதியின் கடிதங்களை PDF ஆகப் பதிவிறக்குக"
                  className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-800 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF பதிவிறக்கம்</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportLettersToExcel(dateLetters, usersMap, dateStr)}
                  title="இத்திகதியின் கடிதங்களை Excel (.xls) ஆகப் பதிவிறக்குக"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel பதிவிறக்கம்</span>
                </button>

                <button
                  type="button"
                  onClick={() => printLandscapeDateReport(dateStr, dateLetters, usersMap)}
                  title="இத்திகதியின் கடிதங்களை A4 பக்கவாட்டில் அச்சிடுக (Landscape Print with Signature Column)"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-900 transition"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">A4 பக்கவாட்டில் அச்சிடு</span>
                  <span className="sm:hidden">அச்சிடு</span>
                </button>
              </div>
            </div>

            {/* Folder Body (Table of Letters) */}
            {isOpen && (
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-700 font-semibold">
                      <th className="py-2.5 px-3">Original No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Inward No</th>
                      <th className="py-2.5 px-3">From whom</th>
                      <th className="py-2.5 px-3 max-w-xs">SUBJECT (விடயம்)</th>
                      <th className="py-2.5 px-3">Forwarded to</th>

                      {/* Mail Officer only sees Mega User handle indicator, NO Action or Chat */}
                      {isMailOfficer ? (
                        <th className="py-2.5 px-3">மெகா பயனாளி நிலை</th>
                      ) : (
                        <>
                          <th className="py-2.5 px-3">Action (நிலை)</th>
                          <th className="py-2.5 px-3 text-center">உரையாடல் (Chat)</th>
                        </>
                      )}

                      <th className="py-2.5 px-3 text-center">ஆவணம்</th>
                      <th className="py-2.5 px-3 text-right">நடவடிக்கை</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dateLetters.map((ltr) => {
                      const forwardedNames = ltr.forwardedTo
                        .map((id) => usersMap.get(id)?.Name || id)
                        .join(', ');

                      return (
                        <tr
                          key={ltr.id}
                          className="hover:bg-blue-50/40 transition group"
                        >
                          {/* Original No */}
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                            {ltr.originalNo}
                          </td>

                          {/* Date */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-600">
                            {ltr.date}
                          </td>

                          {/* Inward No */}
                          <td className="py-2.5 px-3 font-semibold text-gray-800 whitespace-nowrap">
                            {ltr.inwardNo}
                          </td>

                          {/* From whom */}
                          <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap font-medium">
                            {ltr.fromWhom}
                          </td>

                          {/* Subject */}
                          <td className="py-2.5 px-3 max-w-xs">
                            <span
                              onClick={() => onSelectLetter(ltr)}
                              className="font-medium text-gray-900 hover:text-blue-700 cursor-pointer line-clamp-2"
                              title={ltr.subject}
                            >
                              {ltr.subject}
                            </span>
                          </td>

                          {/* Forwarded to */}
                          <td className="py-2.5 px-3 text-gray-600 text-[11px] max-w-[200px]">
                            {ltr.forwardedTo.length === 0 ? (
                              <span className="text-gray-400 italic">-</span>
                            ) : (
                              <span className="line-clamp-2" title={forwardedNames}>
                                {forwardedNames}
                              </span>
                            )}
                          </td>

                          {/* Mail Officer Specific Column: Mega Handled status */}
                          {isMailOfficer ? (
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {ltr.handledByMega ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  மெகா கையாண்டார்
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                                  <Clock className="h-3.5 w-3.5" />
                                  நிலுவையில் உள்ளது
                                </span>
                              )}
                            </td>
                          ) : (
                            /* Non-Mail Officer: Action and Chat */
                            <>
                              {/* Action */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                    ltr.action === 'நடவடிக்கை எடுக்கப்பட்டது'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : ltr.action === 'நடவடிக்கை எடுக்கப்படவில்லை'
                                      ? 'bg-red-100 text-red-800'
                                      : ltr.action === 'கள ஆய்வில்'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {ltr.action}
                                </span>
                              </td>

                              {/* Chat */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onSelectLetter(ltr)}
                                  className="relative inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 text-blue-700" />
                                  <span>Chat</span>
                                  {ltr.chats && ltr.chats.length > 0 && (
                                    <span className="ml-0.5 rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                      {ltr.chats.length}
                                    </span>
                                  )}
                                </button>
                              </td>
                            </>
                          )}

                          {/* Image Attachment & Download */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {ltr.image ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onSelectLetter(ltr)}
                                  title="படத்தைப் பார் (View)"
                                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800 border border-blue-200 hover:bg-blue-100"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  <span>~124KB</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadLetterAttachment(ltr.image!, `${ltr.originalNo}_Doc.jpg`)}
                                  title="ஆவணத்தைப் பதிவிறக்குக (Download File)"
                                  className="rounded bg-emerald-50 p-1 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                >
                                  <Download className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>

                          {/* Row Actions */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectLetter(ltr)}
                                title="கடித விபரங்களை பார்வையிட"
                                className="rounded p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {isSuperAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onEditLetter?.(ltr)}
                                    title="திருத்து (Super Admin)"
                                    className="rounded p-1 text-amber-600 hover:bg-amber-100"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteLetter?.(ltr.id)}
                                    title="நீக்கு (Super Admin)"
                                    className="rounded p-1 text-red-600 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
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
