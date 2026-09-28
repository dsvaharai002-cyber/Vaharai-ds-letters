import React, { useState } from 'react';

interface VaharaiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const VaharaiLogo: React.FC<VaharaiLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-20 w-20',
    xl: 'h-28 w-28',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative inline-flex items-center gap-2.5 ${className}`}>
      {!imgError ? (
        <img
          src="/vaharai_ds_logo_1789105296870.jpg"
          alt="Divisional Secretariat, Vakarai Official Logo"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${currentSizeClass} rounded-full bg-white object-contain p-0.5 shadow-md border-2 border-amber-400 shrink-0 transition hover:scale-105`}
        />
      ) : (
        /* Authentic vector fallback representation if image asset is unavailable */
        <div
          className={`${currentSizeClass} rounded-full bg-white border-2 border-slate-900 shadow-md p-1 flex items-center justify-center shrink-0 relative overflow-hidden`}
          title="Divisional Secretariat, Vakarai Official Emblem"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Outer rings */}
            <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="43" fill="#ffffff" stroke="#0f172a" strokeWidth="1" />
            <circle cx="50" cy="50" r="37" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />

            {/* Tree */}
            <path
              d="M50 18 C42 18 36 24 38 31 C33 33 34 40 40 41 C43 41 46 41 50 41 C54 41 57 41 60 41 C66 40 67 33 62 31 C64 24 58 18 50 18 Z"
              fill="#16a34a"
            />
            <rect x="48" y="37" width="4" height="12" fill="#78350f" rx="1" />

            {/* Golden paddy sheaves */}
            <path
              d="M20 38 Q18 52 24 64 Q28 55 26 42 Z"
              fill="#eab308"
              stroke="#ca8a04"
              strokeWidth="0.5"
            />
            <path
              d="M80 38 Q82 52 76 64 Q72 55 74 42 Z"
              fill="#eab308"
              stroke="#ca8a04"
              strokeWidth="0.5"
            />

            {/* Warrior on Horse Silhouette */}
            <g fill="#0f172a">
              {/* Horse body & legs */}
              <ellipse cx="50" cy="60" rx="11" ry="8" />
              <path d="M42 58 L37 72 L40 73 L45 63 Z" />
              <path d="M56 61 L62 72 L65 71 L59 60 Z" />
              {/* Horse neck & head */}
              <path d="M57 58 Q64 53 62 46 Q58 48 56 53 Z" />
              {/* Rider / Warrior */}
              <circle cx="47" cy="46" r="3" />
              <path d="M44 48 L51 55 L45 58 Z" />
              {/* Sword */}
              <line x1="41" y1="45" x2="35" y2="39" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Blue fishes at bottom */}
            <path
              d="M22 66 Q26 78 40 82 Q32 80 25 71 Z"
              fill="#2563eb"
            />
            <path
              d="M78 66 Q74 78 60 82 Q68 80 75 71 Z"
              fill="#2563eb"
            />

            {/* Circular inscription simulation */}
            <text x="50" y="11" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#0f172a">
              Divisional Secretariat, Vakarai
            </text>
            <text x="50" y="93" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#0f172a">
              பிரதேச செயலகம், வாகரை
            </text>
          </svg>
        </div>
      )}

      {showText && (
        <div className="leading-tight">
          <span className="block text-xs font-bold text-gray-900 tracking-tight">
            Divisional Secretariat, Vakarai
          </span>
          <span className="block text-[10px] text-gray-500">
            பிரதேச செயலகம், வாகரை
          </span>
        </div>
      )}
    </div>
  );
};
