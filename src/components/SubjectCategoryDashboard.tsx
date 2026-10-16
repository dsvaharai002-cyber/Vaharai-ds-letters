import React, { useState } from 'react';
import {
  HelpCircle,
  AlertTriangle,
  Calendar,
  BellRing,
  FileText,
  Layers,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  FolderOpen,
  Filter,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Letter, LetterAction, User, SubjectCategory } from '../types';
import {
  classifySubjectCategory,
  SUBJECT_CATEGORIES_CONFIG,
  printLandscapeReport,
  ensureStringArray,
  getOfficerDisplayName,
  normalizeAction,
  normalizeRegisteredPostNo,
  exportLettersToExcel,
} from '../utils/helpers';

interface SubjectCategoryDashboardProps {
  letters: Letter[];
  allUsers: User[];
  currentUser: User;
  selectedCategoryFilter: string;
  onSelectCategoryFilter: (category: string) => void;
  onSelectLetter: (letter: Letter) => void;
  onEditLetter: (letter: Letter) => void;
  onUpdateLetter?: (letter: Letter) => void;
  viewMode: 'folders' | 'categorized_boards';
  onToggleViewMode: (mode: 'folders' | 'categorized_boards') => void;
}

export const SubjectCategoryDashboard: React.FC<SubjectCategoryDashboardProps> = ({
  letters,
  allUsers,
  currentUser,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  onSelectLetter,
  onEditLetter,
  onUpdateLetter,
  viewMode,
  onToggleViewMode,
}) => {
  const usersMap = new Map<string, User>(allUsers.map((u) => [u.User_ID, u]));
  const canModify = currentUser.Role === 'Super Admin' || currentUser.Role === 'Mail Officer';

  // State for which category boards are expanded in categorized_boards view
  const [expandedBoards, setExpandedBoards] = useState<Record<string, boolean>>({
    'Requests & Appeals': true,
    Complaints: true,
    'Event Invitations': true,
    'Reminder Letters': true,
    'Other Official Letters': true,
  });

  const toggleBoard = (categoryKey: string) => {
    setExpandedBoards((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  // Group letters into the 4 primary categories + Other
  const categorizedLetters: Record<SubjectCategory, Letter[]> = {
    'Requests & Appeals': [],
    Complaints: [],
    'Event Invitations': [],
    'Reminder Letters': [],
    'Other Official Letters': [],
  };

  letters.forEach((l) => {
    const cat = classifySubjectCategory(l.subject);
    categorizedLetters[cat].push(l);
  });

  // Calculate statistics per category
  const getCategoryStats = (categoryLetters: Letter[]) => {
    let actionTaken = 0;
    let pending = 0;
    let underInvestigation = 0;
    let notViewed = 0;

    categoryLetters.forEach((l) => {
      const norm = normalizeAction(l.action);
      if (norm === 'Action Taken') actionTaken++;
      else if (norm === 'Under Investigation') underInvestigation++;
      else if (norm === 'Action Not Taken') pending++;
      else notViewed++;
    });

    return {
      total: categoryLetters.length,
      actionTaken,
      pending,
      underInvestigation,
      notViewed,
    };
  };

  const getIconForCategory = (catKey: SubjectCategory) => {
    switch (catKey) {
      case 'Requests & Appeals':
        return <HelpCircle className="h-5 w-5 text-blue-600" />;
      case 'Complaints':
        return <AlertTriangle className="h-5 w-5 text-rose-600" />;
      case 'Event Invitations':
        return <Calendar className="h-5 w-5 text-purple-600" />;
      case 'Reminder Letters':
        return <BellRing className="h-5 w-5 text-amber-600" />;
      default:
        return <FileText className="h-5 w-5 text-slate-600" />;
    }
  };

  const handleActionChange = (ltr: Letter, newAction: LetterAction) => {
    if (!onUpdateLetter) return;
    const safeAction = normalizeAction(newAction);
    const updated: Letter = {
      ...ltr,
      letterType: (ltr.letterType || 'Registered Post').trim() || 'Registered Post',
      registeredPostNo: normalizeRegisteredPostNo(ltr.registeredPostNo),
      fileNo: (ltr.fileNo || '').trim(),
      action: safeAction,
      forwardedDivisions: ensureStringArray(ltr.forwardedDivisions),
      forwardedTo: ensureStringArray(ltr.forwardedTo),
    };
    onUpdateLetter(updated);
  };

  const expandAllBoards = () => {
    setExpandedBoards({
      'Requests & Appeals': true,
      Complaints: true,
      'Event Invitations': true,
      'Reminder Letters': true,
      'Other Official Letters': true,
    });
  };

  const collapseAllBoards = () => {
    setExpandedBoards({
      'Requests & Appeals': false,
      Complaints: false,
      'Event Invitations': false,
      'Reminder Letters': false,
      'Other Official Letters': false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Subject Categorization Section Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-blue-800 shadow-2xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Subject-Based Categorized Mail Dashboard
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 uppercase">
                  Automatic Subject Classifier
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Mail automatically classified into 4 priority categories based on Subject (Requests, Complaints, Invitations & Reminders).
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => onToggleViewMode('folders')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  viewMode === 'folders'
                    ? 'bg-white text-blue-900 shadow-xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>5-Day Folders View</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode('categorized_boards')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                  viewMode === 'categorized_boards'
                    ? 'bg-white text-blue-900 shadow-xs border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Categorized Subject Boards</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Interactive Category Cards in English */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SUBJECT_CATEGORIES_CONFIG.filter((cfg) => cfg.key !== 'Other Official Letters').map((cfg) => {
            const catLetters = categorizedLetters[cfg.key];
            const stats = getCategoryStats(catLetters);
            const isSelected = selectedCategoryFilter === cfg.key;

            return (
              <div
                key={cfg.key}
                onClick={() => {
                  if (isSelected) {
                    onSelectCategoryFilter('All');
                  } else {
                    onSelectCategoryFilter(cfg.key);
                  }
                }}
                className={`rounded-xl border p-4 transition-all duration-200 cursor-pointer text-left relative overflow-hidden group shadow-xs ${
                  isSelected
                    ? `${cfg.cardBorder} ring-2 ring-blue-500 bg-white`
                    : `${cfg.cardBg} ${cfg.cardBorder}`
                }`}
              >
                {/* Accent Top Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${cfg.accentBg}`} />

                <div className="flex items-start justify-between gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white p-2 shadow-2xs border border-gray-100">
                      {getIconForCategory(cfg.key)}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-900 transition line-clamp-1">
                        {cfg.englishLabel}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-medium line-clamp-1">
                        {cfg.tamilLabel}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black shadow-2xs ${
                      stats.total > 0
                        ? `${cfg.badgeBg} ${cfg.badgeColor} border ${cfg.badgeBorder}`
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                  >
                    {stats.total}
                  </span>
                </div>

                {/* Status breakdown mini pills */}
                <div className="mt-3.5 pt-3 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Done: {stats.actionTaken}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                    <Clock className="h-3.5 w-3.5 text-rose-600" />
                    <span>Pending: {stats.pending + stats.notViewed + stats.underInvestigation}</span>
                  </div>
                </div>

                {/* Action button / filter indicator */}
                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 truncate max-w-[150px]">{cfg.shortLabel} view</span>
                  <span
                    className={`font-bold transition ${
                      isSelected ? 'text-blue-700 underline' : 'text-gray-400 group-hover:text-blue-600'
                    }`}
                  >
                    {isSelected ? '✓ Filtered' : 'Click to filter →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Filter Quick Bar with "All Categories" and "Other Official Letters" option */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-gray-600 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter by Category:</span>
            </span>

            <button
              type="button"
              onClick={() => onSelectCategoryFilter('All')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                selectedCategoryFilter === 'All'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Letters ({letters.length})
            </button>

            {SUBJECT_CATEGORIES_CONFIG.map((cfg) => {
              const count = categorizedLetters[cfg.key].length;
              const isSel = selectedCategoryFilter === cfg.key;
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => onSelectCategoryFilter(isSel ? 'All' : cfg.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                    isSel
                      ? `${cfg.accentBg} text-white shadow-2xs`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{cfg.shortLabel}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSel ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCategoryFilter !== 'All' && (
            <button
              type="button"
              onClick={() => onSelectCategoryFilter('All')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline"
            >
              <X className="h-3 w-3" />
              <span>Reset Category Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* If viewMode is 'categorized_boards', render the 4 Categories Separately as Dedicated Boards */}
      {viewMode === 'categorized_boards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-gray-600 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
            <span className="font-bold text-gray-800">
              Categorized Subject Boards (Letters organized into distinct subject sections)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllBoards}
                className="text-blue-700 font-bold hover:underline"
              >
                Expand All
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={collapseAllBoards}
                className="text-blue-700 font-bold hover:underline"
              >
                Collapse All
              </button>
            </div>
          </div>

          {SUBJECT_CATEGORIES_CONFIG.map((cfg) => {
            const boardLetters = categorizedLetters[cfg.key];
            const isExpanded = !!expandedBoards[cfg.key];
            const stats = getCategoryStats(boardLetters);

            // If a specific filter is selected and does not match this board, we can skip or dim it
            if (selectedCategoryFilter !== 'All' && selectedCategoryFilter !== cfg.key) {
              return null;
            }

            return (
              <div
                key={cfg.key}
                className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-hidden"
              >
                {/* Board Header Banner */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 p-4 border-b ${cfg.cardBg} ${cfg.cardBorder}`}
                >
                  <div
                    onClick={() => toggleBoard(cfg.key)}
                    className="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <div className="rounded-xl bg-white p-2 border border-gray-200 shadow-2xs">
                      {getIconForCategory(cfg.key)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900">
                          {cfg.englishLabel}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-black shadow-2xs ${cfg.badgeBg} ${cfg.badgeColor} border ${cfg.badgeBorder}`}
                        >
                          {boardLetters.length} {boardLetters.length === 1 ? 'Letter' : 'Letters'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-medium mt-0.5">
                        {cfg.tamilLabel} • {cfg.description}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions & Print */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        printLandscapeReport(
                          `${cfg.englishLabel} (${cfg.tamilLabel})`,
                          boardLetters,
                          usersMap
                        )
                      }
                      title={`Print ${cfg.englishLabel} in Official 10pt Landscape`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-2xs hover:bg-gray-50 transition"
                    >
                      <Printer className="h-3.5 w-3.5 text-gray-700" />
                      <span>Print Category Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleBoard(cfg.key)}
                      className="rounded-lg p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white/80 transition"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Letters Table / Cards inside this Category Board */}
                {isExpanded && (
                  <div>
                    {boardLetters.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-xs">
                        <FileText className="mx-auto h-8 w-8 text-gray-300 stroke-1 mb-2" />
                        <p className="font-semibold text-gray-600">
                          No mail records found in &ldquo;{cfg.englishLabel}&rdquo;.
                        </p>
                        <p className="text-gray-400 mt-0.5">
                          New letters matching this subject will appear here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/90 text-gray-700 font-bold">
                              <th className="py-2.5 px-3 whitespace-nowrap">Original No</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Post Type & Reg No</th>
                              <th className="py-2.5 px-3 whitespace-nowrap">Inward No</th>
                              <th className="py-2.5 px-3">From Whom</th>
                              <th className="py-2.5 px-3 max-w-xs">Subject</th>
                              <th className="py-2.5 px-3">Division & Officer</th>
                              <th className="py-2.5 px-3">Action Status</th>
                              <th className="py-2.5 px-3">File No</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {boardLetters.map((ltr, ltrIdx) => {
                              const fwdToArr = ensureStringArray(ltr.forwardedTo);
                              const forwardedOfficerNames = fwdToArr
                                .map((id) => getOfficerDisplayName(id, allUsers))
                                .filter(Boolean);

                              const rawFwdDivs = ensureStringArray(ltr.forwardedDivisions);
                              const divisionsList = (
                                rawFwdDivs.length > 0 ? rawFwdDivs : [ltr.division]
                              ).filter(Boolean);

                              const safeAction = normalizeAction(ltr.action);

                              return (
                                <tr
                                  key={`${ltr.id || ltr.originalNo}-${ltrIdx}`}
                                  className="hover:bg-blue-50/40 transition group"
                                >
                                  <td className="py-2.5 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                                    {ltr.originalNo}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-gray-600">
                                    {ltr.date}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-800 text-[11px] block w-fit">
                                      {ltr.letterType || 'Registered Post'}
                                    </span>
                                    <div className="font-mono text-[10px] text-blue-700 mt-0.5">
                                      Reg: {normalizeRegisteredPostNo(ltr.registeredPostNo)}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-900 whitespace-nowrap">
                                    {ltr.inwardNo}
                                  </td>
                                  <td className="py-2.5 px-3 text-gray-800 font-medium max-w-[180px] truncate" title={ltr.fromWhom}>
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
                                  <td className="py-2.5 px-3 text-[11px] max-w-[180px]">
                                    <div className="font-semibold text-blue-900 truncate" title={divisionsList.join(', ')}>
                                      🏢 {divisionsList.join(', ') || '-'}
                                    </div>
                                    {forwardedOfficerNames.length > 0 && (
                                      <div
                                        className="text-blue-950 font-bold truncate mt-0.5"
                                        title={`Forwarded Officers: ${forwardedOfficerNames.join(', ')}`}
                                      >
                                        👤 {forwardedOfficerNames.join(', ')}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    {canModify ? (
                                      <select
                                        value={safeAction}
                                        onChange={(e) =>
                                          handleActionChange(ltr, e.target.value as LetterAction)
                                        }
                                        className={`rounded-lg px-2 py-1 text-[11px] font-bold border cursor-pointer focus:outline-hidden ${
                                          safeAction === 'Action Taken'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                            : safeAction === 'Action Not Taken'
                                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                                            : safeAction === 'Under Investigation'
                                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                                            : 'bg-blue-50 text-blue-800 border-blue-300'
                                        }`}
                                      >
                                        <option value="Action Taken">Action Taken (முடிந்தது)</option>
                                        <option value="Action Not Taken">Action Not Taken (நிலுவை)</option>
                                        <option value="Under Investigation">Under Investigation (கள ஆய்வு)</option>
                                        <option value="Not Yet Viewed">Not Yet Viewed (புதியவை)</option>
                                      </select>
                                    ) : (
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                          safeAction === 'Action Taken'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : safeAction === 'Action Not Taken'
                                            ? 'bg-rose-100 text-rose-800'
                                            : safeAction === 'Under Investigation'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                      >
                                        {safeAction}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                                    {ltr.fileNo || '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() => onSelectLetter(ltr)}
                                        title="View Letter Details & Chat"
                                        className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-100 transition"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                      {canModify && (
                                        <button
                                          type="button"
                                          onClick={() => onEditLetter(ltr)}
                                          title="Edit Letter"
                                          className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-200 transition"
                                        >
                                          <Edit className="h-4 w-4" />
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
