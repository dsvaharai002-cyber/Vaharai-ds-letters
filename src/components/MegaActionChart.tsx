import React from 'react';
import { BarChart3, FileDown, CheckCircle2, XCircle, Compass, EyeOff, FileText } from 'lucide-react';
import { Letter, LetterAction, User } from '../types';
import { downloadActionLettersPdf } from '../utils/pdfGenerator';

interface MegaActionChartProps {
  letters: Letter[];
  allUsers: User[];
  titleOverride?: string;
}

export const MegaActionChart: React.FC<MegaActionChartProps> = ({ 
  letters, 
  allUsers,
  titleOverride = "📊 கடிதங்களின் நடவடிக்கை நிலவர வரைபடம்" 
}) => {
  const usersMap = new Map<string, User>(allUsers.map((u) => [u.User_ID, u]));

  const actionCounts: Record<LetterAction, number> = {
    'நடவடிக்கை எடுக்கப்பட்டது': 0,
    'நடவடிக்கை எடுக்கப்படவில்லை': 0,
    'கள ஆய்வில்': 0,
    'இன்னும் பார்க்கவில்லை': 0,
  };

  letters.forEach((l) => {
    if (actionCounts[l.action] !== undefined) {
      actionCounts[l.action]++;
    } else {
      actionCounts['இன்னும் பார்க்கவில்லை']++;
    }
  });

  const totalLetters = letters.length;

  const actionConfigs: {
    action: LetterAction;
    color: string;
    bgLight: string;
    border: string;
    textColor: string;
    icon: React.ReactNode;
  }[] = [
    {
      action: 'நடவடிக்கை எடுக்கப்பட்டது',
      color: 'bg-emerald-600',
      bgLight: 'bg-emerald-50',
      border: 'border-emerald-200',
      textColor: 'text-emerald-800',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    },
    {
      action: 'நடவடிக்கை எடுக்கப்படவில்லை',
      color: 'bg-rose-600',
      bgLight: 'bg-rose-50',
      border: 'border-rose-200',
      textColor: 'text-rose-800',
      icon: <XCircle className="h-4 w-4 text-rose-600" />,
    },
    {
      action: 'கள ஆய்வில்',
      color: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      border: 'border-amber-200',
      textColor: 'text-amber-800',
      icon: <Compass className="h-4 w-4 text-amber-600" />,
    },
    {
      action: 'இன்னும் பார்க்கவில்லை',
      color: 'bg-blue-600',
      bgLight: 'bg-blue-50',
      border: 'border-blue-200',
      textColor: 'text-blue-800',
      icon: <EyeOff className="h-4 w-4 text-blue-600" />,
    },
  ];

  const handleDownloadPdf = (actionType: LetterAction) => {
    const matching = letters.filter((l) => l.action === actionType);
    if (matching.length === 0) {
      alert(`'${actionType}' பிரிவில் கடிதங்கள் எதுவும் இல்லை.`);
      return;
    }
    downloadActionLettersPdf(actionType, matching, usersMap);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-800">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {titleOverride}
            </h3>
            <p className="text-xs text-gray-500">
              கடிதங்களின் எண்ணிக்கையை கிளிக் செய்து அந்த வகைக் கடிதங்களை PDF ஆகப் பதிவிறக்கலாம்.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
          <FileText className="h-4 w-4 text-blue-600" />
          <span>பதிவான மொத்த கடிதங்கள்: {totalLetters}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actionConfigs.map((cfg) => {
          const count = actionCounts[cfg.action] || 0;
          const percentage = totalLetters > 0 ? Math.round((count / totalLetters) * 100) : 0;

          return (
            <div
              key={cfg.action}
              className={`flex flex-col justify-between rounded-xl border ${cfg.border} ${cfg.bgLight} p-4 transition hover:shadow-md`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {cfg.icon}
                    <span className={cfg.textColor}>{cfg.action}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">
                    {percentage}%
                  </span>
                </div>

                <div className="my-3 flex items-baseline justify-between">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(cfg.action)}
                    title="இக்கடிதங்களை PDF ஆக பதிவிறக்க கிளிக் செய்க"
                    className="group flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 border border-gray-200 shadow-2xs hover:border-blue-400 transition"
                  >
                    <span className="text-2xl font-black text-gray-900 group-hover:text-blue-700">
                      {count}
                    </span>
                    <span className="text-[11px] font-medium text-gray-500 group-hover:text-blue-600">
                      கடிதங்கள்
                    </span>
                    <FileDown className="h-4 w-4 text-blue-600 group-hover:scale-110 transition" />
                  </button>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.color}`}
                    style={{ width: `${Math.max(5, percentage)}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadPdf(cfg.action)}
                className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-white py-1.5 px-2 text-xs font-bold text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-2xs"
              >
                <FileDown className="h-3.5 w-3.5 text-blue-700" />
                <span>PDF பதிவிறக்கம் (📥)</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};