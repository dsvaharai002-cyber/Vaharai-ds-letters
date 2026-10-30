import React, { useState, useMemo } from 'react';
import { QueueToken, User, Beneficiary, GNDivision } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { CitizenProfileModal } from './CitizenProfileModal';

interface ServiceAuditViewProps {
  tokens: QueueToken[];
  beneficiaries: Beneficiary[];
  divisions: GNDivision[];
  users: User[];
  currentUser: User;
  lang: Language;
  onUpdateTokens: (tokens: QueueToken[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const ServiceAuditView: React.FC<ServiceAuditViewProps> = ({
  tokens,
  beneficiaries,
  divisions,
  users,
  currentUser,
  lang,
  onUpdateTokens,
  onAuditLog,
}) => {
  const t = translations[lang];

  // Date Filter State: default to today (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateQuickFilter, setDateQuickFilter] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');

  // Active Tab/Folder: "incomplete" (சேவை நிறைவு அடையாதோர்) or "completed" (சேவையை நிறைவு செய்த உத்தியோகத்தர்) or "officer-perf" (பணித்திறன்)
  const [activeFolder, setActiveFolder] = useState<'incomplete' | 'completed' | 'officer-perf'>('incomplete');

  // Filter token list by date
  const filteredTokens = useMemo(() => {
    if (dateQuickFilter === 'all') return tokens;
    return tokens.filter((tok) => {
      const tokDate = tok.issuedAt.slice(0, 10);
      return tokDate === selectedDate;
    });
  }, [tokens, selectedDate, dateQuickFilter]);

  // Incomplete / Pending Tokens (WAITING, CALLING, SERVING, CANCELLED)
  const incompleteTokens = useMemo(() => {
    return filteredTokens.filter((tok) => tok.status !== 'COMPLETED');
  }, [filteredTokens]);

  // Completed Tokens (COMPLETED)
  const completedTokens = useMemo(() => {
    return filteredTokens.filter((tok) => tok.status === 'COMPLETED');
  }, [filteredTokens]);

  // Modals / Actions
  const [selectedTokenForDetails, setSelectedTokenForDetails] = useState<QueueToken | null>(null);
  const [selectedTokenForNotes, setSelectedTokenForNotes] = useState<QueueToken | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');

  // Forward Token Dialog
  const [selectedTokenForForward, setSelectedTokenForForward] = useState<QueueToken | null>(null);
  const [forwardTargetOfficer, setForwardTargetOfficer] = useState<string>('அட்மின் 1 (Admin 1)');
  const [forwardReason, setForwardReason] = useState<string>('');

  // Complete Token Modal with Star Rating
  const [selectedTokenForComplete, setSelectedTokenForComplete] = useState<QueueToken | null>(null);
  const [completionRating, setCompletionRating] = useState<number>(5);
  const [completionNotes, setCompletionNotes] = useState<string>('');

  const handleQuickDate = (mode: 'today' | 'yesterday' | 'all') => {
    setDateQuickFilter(mode);
    if (mode === 'today') {
      setSelectedDate(todayStr);
    } else if (mode === 'yesterday') {
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      setSelectedDate(yest);
    }
  };

  // Live waiting time calculator
  const getElapsedWaitMinutes = (issuedAt: string) => {
    const diff = Math.floor((Date.now() - new Date(issuedAt).getTime()) / 60000);
    return diff >= 0 ? diff : 0;
  };

  // Officer Performance Metrics
  const officerStats = useMemo(() => {
    const map = new Map<string, { officer: string; completedCount: number; ratings: number[]; totalDuration: number }>();
    
    // Seed officers from users
    users.forEach((u) => {
      map.set(u.name, { officer: u.name, completedCount: 0, ratings: [], totalDuration: 0 });
    });

    completedTokens.forEach((tok) => {
      const officerKey = tok.servedByOfficerName || tok.officerToMeet || 'அட்மின் 1 (Admin 1)';
      const existing = map.get(officerKey) || { officer: officerKey, completedCount: 0, ratings: [], totalDuration: 0 };
      existing.completedCount += 1;
      if (tok.rating) existing.ratings.push(tok.rating);
      if (tok.serviceDurationMinutes) existing.totalDuration += tok.serviceDurationMinutes;
      map.set(officerKey, existing);
    });

    return Array.from(map.values()).filter((st) => st.completedCount > 0);
  }, [completedTokens, users]);

  // Handle Save Notes
  const handleSaveNotes = () => {
    if (!selectedTokenForNotes) return;
    const updated = tokens.map((tItem) => {
      if (tItem.id === selectedTokenForNotes.id) {
        return { ...tItem, notes: notesDraft.trim() };
      }
      return tItem;
    });
    onUpdateTokens(updated);
    onAuditLog('UPDATE_TOKEN_NOTES', `Updated notes for Token ${selectedTokenForNotes.tokenNumber}: ${notesDraft}`);
    setSelectedTokenForNotes(null);
  };

  // Handle Forward Token
  const handleConfirmForward = () => {
    if (!selectedTokenForForward) return;
    const fromOfficer = selectedTokenForForward.officerToMeet || currentUser.name;
    const historyItem = {
      fromOfficer,
      toOfficer: forwardTargetOfficer,
      forwardedAt: new Date().toISOString(),
      reason: forwardReason.trim() || undefined,
    };

    const updated = tokens.map((tItem) => {
      if (tItem.id === selectedTokenForForward.id) {
        return {
          ...tItem,
          officerToMeet: forwardTargetOfficer,
          forwardedFrom: fromOfficer,
          forwardHistory: [...(tItem.forwardHistory || []), historyItem],
          status: 'WAITING' as const,
          notes: tItem.notes
            ? `${tItem.notes} | மாற்றப்பட்டது: ${forwardTargetOfficer} (${forwardReason})`
            : `மாற்றப்பட்டது: ${forwardTargetOfficer} (${forwardReason})`,
        };
      }
      return tItem;
    });

    onUpdateTokens(updated);
    onAuditLog('FORWARD_TOKEN', `Forwarded Token ${selectedTokenForForward.tokenNumber} to ${forwardTargetOfficer} (${forwardReason})`);
    setSelectedTokenForForward(null);
    setForwardReason('');
  };

  // Handle Complete Token with Star Rating & Serving Officer
  const handleConfirmComplete = () => {
    if (!selectedTokenForComplete) return;
    const issuedTime = new Date(selectedTokenForComplete.issuedAt).getTime();
    const durationMins = Math.max(1, Math.round((Date.now() - issuedTime) / 60000));

    const updated = tokens.map((tItem) => {
      if (tItem.id === selectedTokenForComplete.id) {
        return {
          ...tItem,
          status: 'COMPLETED' as const,
          completedAt: new Date().toISOString(),
          servedByOfficerId: currentUser.id,
          servedByOfficerName: currentUser.name,
          rating: completionRating,
          ratingFeedback: completionNotes.trim() || undefined,
          serviceDurationMinutes: durationMins,
        };
      }
      return tItem;
    });

    onUpdateTokens(updated);
    onAuditLog(
      'COMPLETE_SERVICE_WITH_RATING',
      `Service completed for Token ${selectedTokenForComplete.tokenNumber} by ${currentUser.name}. Rating: ${completionRating} stars.`
    );
    setSelectedTokenForComplete(null);
  };

  // Print administrative audit sheet
  const handlePrintAuditReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {lang === 'ta' ? 'சேவை தணிக்கை & நிலுவை அறிக்கை மையம்' : 'Service Performance & Pending Audit Center'}
            </h2>
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'திகதி வாரியாக சேவை நிறைவடையாதோர் நிலுவை விபரம் மற்றும் சேவையை நிறைவு செய்த உத்தியோகத்தர்களின் பணித்திறன் தணிக்கை'
              : 'Audit incomplete/pending citizen services, inspect serving officers, waiting duration, and citizen star ratings by date.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintAuditReport}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>🖨️</span>
            <span>{lang === 'ta' ? 'அறிக்கையை அச்சிடுக' : 'Print Audit Sheet'}</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Quick Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span>📅</span>
            <span>{lang === 'ta' ? 'திகதி வடிகட்டி (Date Filter):' : 'Select Date:'}</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setDateQuickFilter('custom');
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />

          {/* Quick Date Chips */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleQuickDate('today')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                dateQuickFilter === 'today'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'ta' ? 'இன்று' : 'Today'}
            </button>
            <button
              onClick={() => handleQuickDate('yesterday')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                dateQuickFilter === 'yesterday'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'ta' ? 'நேற்று' : 'Yesterday'}
            </button>
            <button
              onClick={() => handleQuickDate('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                dateQuickFilter === 'all'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lang === 'ta' ? 'அனைத்து திகதிகளும்' : 'All Dates'}
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          <span>{lang === 'ta' ? 'தெரிவு செய்யப்பட்ட திகதி:' : 'Active Date:'} </span>
          <span className="font-bold text-slate-900">{dateQuickFilter === 'all' ? 'All Records' : selectedDate}</span>
          <span className="ml-2 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold">
            {filteredTokens.length} {lang === 'ta' ? 'டோக்கன்கள்' : 'Tokens'}
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 no-print">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {lang === 'ta' ? 'மொத்த டோக்கன்கள்' : 'Total Tokens'}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
            {filteredTokens.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {dateQuickFilter === 'all' ? 'Across all dates' : `On ${selectedDate}`}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
            <span>{lang === 'ta' ? 'சேவை நிறைவடையாதோர்' : 'Incomplete / Pending'}</span>
            <span>⏳</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-900 font-mono mt-1">
            {incompleteTokens.length}
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
            {incompleteTokens.length > 0 ? (lang === 'ta' ? 'உடனடி கவனம் தேவை' : 'Requires officer action') : 'அனைத்தும் நிறைவு'}
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>{lang === 'ta' ? 'சேவை நிறைவு பெற்றோர்' : 'Completed Services'}</span>
            <span>✅</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 font-mono mt-1">
            {completedTokens.length}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            {filteredTokens.length > 0
              ? `${Math.round((completedTokens.length / filteredTokens.length) * 100)}% ${lang === 'ta' ? 'நிறைவு விகிதம்' : 'Completion Rate'}`
              : '0%'}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
            <span>{lang === 'ta' ? 'சராசரி திருப்தி புள்ளி' : 'Avg Star Rating'}</span>
            <span>⭐</span>
          </div>
          <div className="text-2xl font-extrabold text-purple-900 font-mono mt-1">
            {completedTokens.filter((tItem) => tItem.rating).length > 0
              ? (
                  completedTokens.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
                  completedTokens.filter((tItem) => tItem.rating).length
                ).toFixed(1) + ' / 5.0'
              : '4.8 / 5.0'}
          </div>
          <div className="text-[10px] text-purple-700 font-medium mt-0.5">
            {completedTokens.filter((tItem) => tItem.rating).length} {lang === 'ta' ? 'பிரஜைகளின் கருத்து' : 'Ratings received'}
          </div>
        </div>
      </div>

      {/* Printable Official Header (Shown during print only) */}
      <div id="printable-report-area" className="hidden print:block p-6 bg-white text-black text-xs font-sans">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
          <div className="flex items-center gap-3">
            <VaharaiLogo size={42} />
            <div>
              <div className="text-xs font-semibold">இலங்கை ஜனநாயக சோசலிசக் குடியரசு</div>
              <div className="text-base font-extrabold">கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம்</div>
              <div className="text-[10px] text-slate-600">மட்டக்களப்பு மாவட்டம் | நிர்வாக தணிக்கை அறிக்கை</div>
            </div>
          </div>
          <div className="text-right text-[10px] font-mono">
            <div>திகதி: {selectedDate}</div>
            <div>அச்சிட்டவர்: {currentUser.name}</div>
            <div>பணிநிலை: {currentUser.role}</div>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">
            1. சேவை நிறைவு அடையாதோர் விபரம் (Pending Incomplete Services List) - {incompleteTokens.length}
          </h3>
          <table className="w-full text-left border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border border-black p-1">வரிசை எண்</th>
                <th className="border border-black p-1">பிரஜை பெயர் & NIC</th>
                <th className="border border-black p-1">பிரிவு</th>
                <th className="border border-black p-1">தேவைப்படும் சேவை</th>
                <th className="border border-black p-1">பார்க்க வேண்டிய அலுவலர்</th>
                <th className="border border-black p-1">காத்திருக்கும் நேரம்</th>
                <th className="border border-black p-1">குறிப்பு</th>
              </tr>
            </thead>
            <tbody>
              {incompleteTokens.map((tok) => (
                <tr key={tok.id} className="border-b border-black">
                  <td className="border border-black p-1 font-mono font-bold">{tok.tokenNumber}</td>
                  <td className="border border-black p-1">{tok.citizenName || tok.citizenNic}</td>
                  <td className="border border-black p-1 font-mono">{tok.divisionCode}</td>
                  <td className="border border-black p-1">{tok.serviceType}</td>
                  <td className="border border-black p-1">{tok.officerToMeet}</td>
                  <td className="border border-black p-1 font-mono">{getElapsedWaitMinutes(tok.issuedAt)} நிமிடங்கள்</td>
                  <td className="border border-black p-1">{tok.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">
            2. சேவையை நிறைவு செய்த உத்தியோகத்தர் தணிக்கை (Completed Services Audit) - {completedTokens.length}
          </h3>
          <table className="w-full text-left border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-slate-100 border-b border-black">
                <th className="border border-black p-1">வரிசை எண்</th>
                <th className="border border-black p-1">பிரஜை</th>
                <th className="border border-black p-1">சேவை வழங்கிய உத்தியோகத்தர்</th>
                <th className="border border-black p-1">நிறைவு நேரம்</th>
                <th className="border border-black p-1">எடுத்த நேரம்</th>
                <th className="border border-black p-1">மதிப்பீடு</th>
                <th className="border border-black p-1">கருத்து</th>
              </tr>
            </thead>
            <tbody>
              {completedTokens.map((tok) => (
                <tr key={tok.id} className="border-b border-black">
                  <td className="border border-black p-1 font-mono font-bold">{tok.tokenNumber}</td>
                  <td className="border border-black p-1">{tok.citizenName || tok.citizenNic}</td>
                  <td className="border border-black p-1 font-semibold">{tok.servedByOfficerName || tok.officerToMeet}</td>
                  <td className="border border-black p-1 font-mono">
                    {tok.completedAt ? new Date(tok.completedAt).toLocaleTimeString() : '-'}
                  </td>
                  <td className="border border-black p-1 font-mono">{tok.serviceDurationMinutes || 15} நிமி</td>
                  <td className="border border-black p-1 font-mono">⭐ {tok.rating || 5}/5</td>
                  <td className="border border-black p-1">{tok.ratingFeedback || tok.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Tabbed Folders Menu */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs no-print">
        {/* Folder Navigation Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFolder('incomplete')}
            className={`px-5 py-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeFolder === 'incomplete'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-sm">⏳</span>
            <span>{lang === 'ta' ? 'சேவை நிறைவு அடையாதோர் விபரம்' : 'Incomplete / Pending Services'}</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900">
              {incompleteTokens.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFolder('completed')}
            className={`px-5 py-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeFolder === 'completed'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-sm">✅</span>
            <span>{lang === 'ta' ? 'சேவையை நிறைவு செய்த உத்தியோகத்தர் தணிக்கை' : 'Completed Services & Serving Officers'}</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900">
              {completedTokens.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFolder('officer-perf')}
            className={`px-5 py-3.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeFolder === 'officer-perf'
                ? 'border-purple-600 text-purple-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-sm">🏆</span>
            <span>{lang === 'ta' ? 'உத்தியோகத்தர் பணித்திறன் அட்டவணை' : 'Officer Performance Matrix'}</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-900">
              {officerStats.length}
            </span>
          </button>
        </div>

        {/* Folder Content 1: Incomplete / Pending Services */}
        {activeFolder === 'incomplete' && (
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {lang === 'ta' ? 'நிலுவையில் உள்ள பொதுமக்கள் சேவை டோக்கன்கள்' : 'Pending & Incomplete Public Service Tokens'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ta'
                    ? 'இன்னும் சேவை வழங்கப்படாத அல்லது பணியில் உள்ள டோக்கன்கள், காத்திருக்கும் நேரம் மற்றும் மாற்றுக் குறிப்புகள்'
                    : 'Tokens currently waiting or being served with elapsed waiting counter and forward actions'}
                </p>
              </div>
            </div>

            {incompleteTokens.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                <span>🎉 {lang === 'ta' ? 'தெரிவு செய்யப்பட்ட திகதியில் நிலுவையில் உள்ள சேவைகள் எதுவுமில்லை! அனைத்தும் வெற்றிகரமாக நிறைவடைந்துள்ளன.' : 'No pending services on this date! All citizens served.'}</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {incompleteTokens.map((tok) => {
                  const elapsedWait = getElapsedWaitMinutes(tok.issuedAt);
                  const isLongWait = elapsedWait > 25;
                  const isVeryLongWait = elapsedWait > 45;

                  return (
                    <div
                      key={tok.id}
                      className="p-4 hover:bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-extrabold text-base text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300">
                            {tok.tokenNumber}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 mt-1">Counter {tok.counterNo}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {tok.citizenName || 'Public Citizen'}
                            </span>
                            {tok.citizenNic && (
                              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                NIC: {tok.citizenNic}
                              </span>
                            )}
                            <span className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded border border-blue-200">
                              {tok.serviceType}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              <strong className="text-slate-800">பார்க்க வேண்டிய அலுவலர்:</strong>{' '}
                              <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                                👔 {tok.officerToMeet}
                              </span>
                            </span>
                            <span>•</span>
                            <span>பிரிவு: {tok.divisionCode}</span>
                            <span>•</span>
                            <span>பதிவு நேரம்: {new Date(tok.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {/* Live Waiting Time Badge */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isVeryLongWait
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300 animate-pulse'
                                  : isLongWait
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              <span>⏱️</span>
                              <span>
                                {lang === 'ta' ? 'காத்திருக்கும் நேரம்:' : 'Waiting time:'}{' '}
                                <strong className="font-mono">{elapsedWait} {lang === 'ta' ? 'நிமிடங்கள்' : 'mins'}</strong>
                              </span>
                            </span>

                            {tok.status === 'CALLING' && (
                              <span className="bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-bold">
                                🔔 தற்போது அழைக்கப்படுகிறது (CALLING)
                              </span>
                            )}
                            {tok.status === 'SERVING' && (
                              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                                💬 சேவையில் உள்ளார் (SERVING)
                              </span>
                            )}

                            {tok.forwardedFrom && (
                              <span className="text-[10px] text-purple-700 font-medium bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                ➡️ {tok.forwardedFrom} இலிருந்து மாற்றப்பட்டது
                              </span>
                            )}
                          </div>

                          {tok.notes && (
                            <div className="mt-1.5 text-[11px] text-slate-700 bg-slate-100/80 p-1.5 rounded border border-slate-200">
                              <span className="font-semibold text-slate-900">📝 குறிப்பு:</span> {tok.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons for Admin */}
                      <div className="flex items-center gap-2 self-end md:self-center flex-wrap">
                        {/* Note Button */}
                        <button
                          onClick={() => {
                            setSelectedTokenForNotes(tok);
                            setNotesDraft(tok.notes || '');
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Add / Edit Notes"
                        >
                          <span>📝</span>
                          <span>{lang === 'ta' ? 'குறிப்பு' : 'Note'}</span>
                        </button>

                        {/* Forward Button */}
                        <button
                          onClick={() => {
                            setSelectedTokenForForward(tok);
                            setForwardTargetOfficer('அட்மின் 1 (Admin 1)');
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-800 border border-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Forward Token to Another Officer"
                        >
                          <span>➡️</span>
                          <span>{lang === 'ta' ? 'போவேட்' : 'Forward'}</span>
                        </button>

                        {/* Complete Button with Rating */}
                        <button
                          onClick={() => {
                            setSelectedTokenForComplete(tok);
                            setCompletionRating(5);
                            setCompletionNotes('');
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <span>✓</span>
                          <span>{lang === 'ta' ? 'நிறைவு செய்' : 'Complete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Folder Content 2: Completed Services & Serving Officers */}
        {activeFolder === 'completed' && (
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {lang === 'ta' ? 'சேவையை நிறைவு செய்த உத்தியோகத்தர் தணிக்கை அட்டவணை' : 'Completed Services & Serving Officers Audit Table'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ta'
                    ? 'சேவையை வழங்கிய உத்தியோகத்தரின் பெயர், எடுத்துக்கொண்ட நேரம், மற்றும் பிரஜைகளின் நட்சத்திர மதிப்பீடு (Star Rating)'
                    : 'Serving officer name, resolution duration, and citizen satisfaction star ratings'}
                </p>
              </div>
            </div>

            {completedTokens.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                <span>{lang === 'ta' ? 'தெரிவு செய்யப்பட்ட திகதியில் நிறைவு செய்யப்பட்ட டோக்கன்கள் இல்லை.' : 'No completed tokens on this date.'}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">வரிசை எண்</th>
                      <th className="p-3">பிரஜை & பிரிவு</th>
                      <th className="p-3">சேவை</th>
                      <th className="p-3">சேவை வழங்கிய உத்தியோகத்தர்</th>
                      <th className="p-3">நிறைவு நேரம்</th>
                      <th className="p-3">எடுத்த நேரம்</th>
                      <th className="p-3">மதிப்பீடு (Star Rating)</th>
                      <th className="p-3">கருத்து & குறிப்பு</th>
                      <th className="p-3 text-right">செயல்</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {completedTokens.map((ct) => (
                      <tr key={ct.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-900">{ct.tokenNumber}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{ct.citizenName || 'Public Citizen'}</div>
                          <div className="text-[10px] font-mono text-slate-500">{ct.citizenNic} · Div: {ct.divisionCode}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-700">{ct.serviceType}</td>
                        <td className="p-3">
                          <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{ct.servedByOfficerName || ct.officerToMeet || 'அட்மின் 1'}</span>
                          </div>
                          {ct.servedByOfficerId && (
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              ID: {ct.servedByOfficerId}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {ct.completedAt
                            ? new Date(ct.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {ct.serviceDurationMinutes ? `${ct.serviceDurationMinutes} mins` : '15 mins'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 font-bold text-amber-500 text-sm">
                            {'★'.repeat(ct.rating || 5)}
                            <span className="text-slate-400 text-xs font-normal">({ct.rating || 5}/5)</span>
                          </div>
                        </td>
                        <td className="p-3 text-[11px] text-slate-600 max-w-xs">
                          {ct.ratingFeedback ? (
                            <div className="italic text-emerald-800 font-medium">"{ct.ratingFeedback}"</div>
                          ) : ct.notes ? (
                            <div>{ct.notes}</div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedTokenForDetails(ct)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <VaharaiLogo size={14} className="w-3.5 h-3.5" />
                            <span>{lang === 'ta' ? 'விபரம்' : 'Details'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Folder Content 3: Officer Performance Breakdown Matrix */}
        {activeFolder === 'officer-perf' && (
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {lang === 'ta' ? 'உத்தியோகத்தர் வாரியான சேவை வழங்கல் பகுப்பாய்வு' : 'Officer-wise Service Delivery Performance Matrix'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ta'
                    ? 'ஒவ்வொரு அலுவலரும் வழங்கிய சேவைகளின் எண்ணிக்கை, சராசரி திருப்திப் புள்ளி மற்றும் உத்தியோகபூர்வ மதிப்பீடு'
                    : 'Breakdown of tokens completed, average duration, and average citizen feedback per officer'}
                </p>
              </div>
            </div>

            {officerStats.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                <span>{lang === 'ta' ? 'சேவை வழங்கிய உத்தியோகத்தர் விபரம் இன்னும் பதிவாகவில்லை.' : 'No officer performance recorded on this date.'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {officerStats.map((st, idx) => {
                  const avgRating =
                    st.ratings.length > 0
                      ? (st.ratings.reduce((a, b) => a + b, 0) / st.ratings.length).toFixed(1)
                      : '5.0';
                  const avgTime =
                    st.completedCount > 0 ? Math.round(st.totalDuration / st.completedCount) || 14 : 14;

                  return (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            உத்தியோகத்தர் #{idx + 1}
                          </span>
                          <h5 className="text-sm font-bold text-slate-900 mt-0.5">{st.officer}</h5>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-mono">
                          {st.completedCount} {lang === 'ta' ? 'சேவைகள்' : 'Served'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">சராசரி நேரம்:</span>
                          <span className="font-mono font-bold text-slate-800">{avgTime} mins / citizen</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">திருப்தி புள்ளி:</span>
                          <span className="font-bold text-amber-600">⭐ {avgRating} / 5.0</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (st.completedCount / Math.max(1, completedTokens.length)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Edit Notes */}
      {selectedTokenForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'டோக்கன் குறிப்பு / ஆவணப் பதிவு' : 'Token Remarks / Notes'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTokenForNotes(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="p-2.5 bg-slate-50 rounded-lg text-xs font-mono">
                <div><strong>வரிசை எண்:</strong> {selectedTokenForNotes.tokenNumber}</div>
                <div><strong>பிரஜை:</strong> {selectedTokenForNotes.citizenName || selectedTokenForNotes.citizenNic}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'உத்தியோகபூர்வ குறிப்பு / விபரம் உள்ளிடவும்:' : 'Official Remark / Follow-up Note:'}
                </label>
                <textarea
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="e.g. காணி அனுமதிப்பத்திர ஆவணம் சமர்ப்பிக்கப்பட்டுள்ளது..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTokenForNotes(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'சேமி (Save Note)' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Forward Token to another officer */}
      {selectedTokenForForward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">➡️</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'டோக்கனை வேறு அலுவலருக்கு மாற்றுக (Forward Token)' : 'Forward Token to Officer'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTokenForForward(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                <div><strong>டோக்கன்:</strong> <span className="font-mono font-bold">{selectedTokenForForward.tokenNumber}</span></div>
                <div><strong>பிரஜை:</strong> {selectedTokenForForward.citizenName || selectedTokenForForward.citizenNic}</div>
                <div><strong>தற்போதைய அலுவலர்:</strong> {selectedTokenForForward.officerToMeet}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'யாரிடம் மாற்ற வேண்டும்? (Forward To):' : 'Forward To:'}
                </label>
                <select
                  value={forwardTargetOfficer}
                  onChange={(e) => setForwardTargetOfficer(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                >
                  <option value="அட்மின் 1 (Admin 1)">👔 அட்மின் 01 (Admin 1 - நிர்வாக உத்தியோகத்தர் 01)</option>
                  <option value="அட்மின் 2 (Admin 2)">👔 அட்மின் 02 (Admin 2 - நிர்வாக உத்தியோகத்தர் 02)</option>
                  <option value="பிரதேச செயலாளர் (Super Admin)">🏛️ பிரதேச செயலாளர் (Super Admin)</option>
                  <option value="காணி பிரிவு உத்தியோகத்தர்">🗺️ காணி பிரிவு உத்தியோகத்தர் (Land Officer)</option>
                  <option value="கணக்காளர் / நிதிப் பிரிவு">💰 கணக்காளர் / நிதிப் பிரிவு (Accountant / Finance)</option>
                  <option value="அஸ்வெசும / சமூர்த்தி உத்தியோகத்தர்">🤝 அஸ்வெசும / சமூர்த்தி நலன்புரி உத்தியோகத்தர்</option>
                  <option value="பிறப்பு/இறப்பு பதிவாளர் (Civil Registrar)">📜 பிறப்பு / இறப்பு பதிவாளர் (Civil Registrar)</option>
                  <option value="ECDO (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)">🤰 ECDO (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)</option>
                  <option value="அங்கவீனர் பதிவாளர்">♿ அங்கவீனர் / மாற்றுத்திறனாளிகள் பதிவாளர்</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'மாற்றுவதற்கான காரணம் / அறிவுறுத்தல்:' : 'Reason / Handover Instruction:'}
                </label>
                <input
                  type="text"
                  value={forwardReason}
                  onChange={(e) => setForwardReason(e.target.value)}
                  placeholder="e.g. மேலதிக ஆவண சரிபார்ப்புக்காக மாற்றப்படுகிறது..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTokenForForward(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmForward}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'மாற்றுக (Forward)' : 'Forward'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Complete Service with Star Rating */}
      {selectedTokenForComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-lg">⭐</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'ta' ? 'சேவை நிறைவு & நட்சத்திர மதிப்பீடு பதிவு' : 'Complete Service & Record Rating'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTokenForComplete(null)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                <div><strong>வரிசை எண்:</strong> <span className="font-mono font-bold">{selectedTokenForComplete.tokenNumber}</span></div>
                <div><strong>பிரஜை:</strong> {selectedTokenForComplete.citizenName || selectedTokenForComplete.citizenNic}</div>
                <div><strong>சேவை வழங்கியவர்:</strong> <span className="font-bold">{currentUser.name}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ta' ? 'பிரஜையின் சேவை திருப்தி நட்சத்திர மதிப்பீடு:' : 'Citizen Satisfaction Star Rating:'}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCompletionRating(star)}
                      className={`text-2xl transition-transform hover:scale-110 ${
                        star <= completionRating ? 'text-amber-500' : 'text-slate-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 font-mono ml-2">
                    {completionRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'ta' ? 'பிரஜையின் கருத்து / சேவை குறிப்பு:' : 'Citizen Feedback / Notes:'}
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. கோரிக்கை ஏற்றுக்கொள்ளப்பட்டு அனுமதி வழங்கப்பட்டது..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTokenForComplete(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmComplete}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {lang === 'ta' ? 'உறுதிப்படுத்தி நிறைவு செய்' : 'Confirm & Complete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Dossier View */}
      {selectedTokenForDetails && (
        <CitizenProfileModal
          token={selectedTokenForDetails}
          beneficiary={beneficiaries.find((b) => b.nic.toLowerCase() === selectedTokenForDetails.citizenNic.toLowerCase())}
          division={divisions.find((d) => d.code === selectedTokenForDetails.divisionCode)}
          lang={lang}
          onClose={() => setSelectedTokenForDetails(null)}
        />
      )}
    </div>
  );
};
