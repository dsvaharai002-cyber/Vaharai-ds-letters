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
  Download,
  FileSpreadsheet,
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

  const canModify = isSuperAdmin || isMailOfficer;

  const groupedByDate: Record<string, Letter[]> = {};
  letters.forEach((l) => {
    const d = l.date || 'தெரியாத திகதி';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(l);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-600">
        <div>
          <span>மொத்த திகதி போல்டர்கள்: <b>{sortedDates.length}</b></span>
          <span className="mx-2">•</span>
          <span>காண்பிக்கப்படும் கடிதங்கள்: <b>{letters.length}</b></span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={expandAll} className="text-blue-700 hover:underline font-semibold">
            அனைத்தையும் திறக்க
          </button>
          <span>|</span>
          <button type="button" onClick={collapseAll} className="text-gray-600 hover:underline">
            அனைத்தையும் மூட
          </button>
        </div>
      </div>

      {sortedDates.map((dateStr) => {
        const dateLetters = groupedByDate[dateStr];
        const isOpen = !!openFolders[dateStr];

        return (
          <div key={dateStr} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
            <div
              onClick={() => toggleFolder(dateStr)}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-slate-50/80 px-4 py-3 cursor-pointer hover:bg-slate-100 select-none"
            >
              <div className="flex items-center gap-2.5">
                {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                <div className="flex items-center gap-2">
                  {isOpen ? <FolderOpen className="h-5 w-5 text-amber-500" /> : <Folder className="h-5 w-5 text-amber-500" />}
                  <span className="font-bold text-gray-900 text-sm">📁 திகதி போல்டர்: {dateStr}</span>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {dateLetters.length} கடிதங்கள்
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => downloadDateLettersPdf(dateStr, dateLetters, usersMap)}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF பதிவிறக்கம்</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportLettersToExcel(dateLetters, usersMap, dateStr)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel பதிவிறக்கம்</span>
                </button>
                <button
                  type="button"
                  onClick={() => printLandscapeDateReport(dateStr, dateLetters, usersMap)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>அச்சிடு</span>
                </button>
              </div>
            </div>

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
                      {isMailOfficer ? (
                        <th className="py-2.5 px-3">மெகா பயனாளி நிலை</th>
                      ) : (
                        <>
                          <th className="py-2.5 px-3">Action (நிலை)</th>
                          <th className="py-2.5 px-3 text-center">உரையாடல் (Chat)</th>
                        </>
                      )}
                      <th className="py-2.5 px-3 text-center">ஆவணம் (~240KB)</th>
                      <th className="py-2.5 px-3 text-right">நடவடிக்கை</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dateLetters.map((ltr) => {
                      const forwardedNames = ltr.forwardedTo
                        .map((id) => usersMap.get(id)?.Name || id)
                        .join(', ');

                      return (
                        <tr key={ltr.id} className="hover:bg-blue-50/40 transition group">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">{ltr.originalNo}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-600">{ltr.date}</td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800 whitespace-nowrap">{ltr.inwardNo}</td>
                          <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap font-medium">{ltr.fromWhom}</td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <span onClick={() => onSelectLetter(ltr)} className="font-medium text-gray-900 hover:text-blue-700 cursor-pointer line-clamp-2">
                              {ltr.subject}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-600 text-[11px] max-w-[200px]">
                            <span className="line-clamp-2" title={forwardedNames}>{forwardedNames || '-'}</span>
                          </td>

                          {isMailOfficer ? (
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {ltr.handledByMega ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> மெகா கையாண்டார்
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                                  <Clock className="h-3.5 w-3.5" /> நிலுவையில் உள்ளது
                                </span>
                              )}
                            </td>
                          ) : (
                            <>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                  ltr.action === 'நடவடிக்கை எடுக்கப்பட்டது' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {ltr.action}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <button type="button" onClick={() => onSelectLetter(ltr)} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700">
                                  <MessageSquare className="h-3.5 w-3.5 text-blue-700" />
                                  <span>{ltr.chats?.length || 0}</span>
                                </button>
                              </td>
                            </>
                          )}

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {ltr.image ? (
                              <div className="inline-flex items-center gap-1">
                                <button type="button" onClick={() => onSelectLetter(ltr)} className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800 border border-blue-200">
                                  <ImageIcon className="h-3 w-3" /> ~240KB
                                </button>
                                <button type="button" onClick={() => downloadLetterAttachment(ltr.image!, `${ltr.originalNo}_Doc.jpg`)} className="rounded bg-emerald-50 p-1 text-emerald-700 border border-emerald-200">
                                  <Download className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => onSelectLetter(ltr)} title="பார்வையிட" className="rounded p-1 text-gray-600 hover:bg-gray-200">
                                <Eye className="h-4 w-4" />
                              </button>

                              {canModify && (
                                <button type="button" onClick={() => onEditLetter?.(ltr)} title="திருத்து" className="rounded p-1 text-amber-600 hover:bg-amber-100">
                                  <Edit className="h-4 w-4" />
                                </button>
                              )}

                              {isSuperAdmin && (
                                <button type="button" onClick={() => onDeleteLetter?.(ltr.id)} title="நீக்கு" className="rounded p-1 text-red-600 hover:bg-red-100">
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