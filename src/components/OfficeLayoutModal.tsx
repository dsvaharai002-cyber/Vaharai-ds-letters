import React, { useState } from 'react';
import { Language, translations } from '../translations/i18n';
import { VAHARAI_OFFICE_BRANCHES, OfficeBranchLocation } from '../utils/officeLayout';
import { MapPin, X, Building2, Search, ExternalLink, Compass } from 'lucide-react';

interface OfficeLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectCounter?: (counterNo: number, nameTa: string) => void;
}

export const OfficeLayoutModal: React.FC<OfficeLayoutModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSelectCounter,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const [activeFloor, setActiveFloor] = useState<'ALL' | 'GROUND' | 'FIRST'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<OfficeBranchLocation | null>(null);

  const filteredBranches = VAHARAI_OFFICE_BRANCHES.filter((b) => {
    if (activeFloor === 'GROUND' && !b.floor.includes('Ground')) return false;
    if (activeFloor === 'FIRST' && !b.floor.includes('First')) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = String(b.counterNumber).includes(q) || String(b.counterNumber).padStart(2, '0').includes(q);
      const matchName = b.nameTa.toLowerCase().includes(q) || b.nameEn.toLowerCase().includes(q);
      const matchDesc = b.descriptionTa.toLowerCase().includes(q);
      return matchNum || matchName || matchDesc;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                {lang === 'ta' ? 'அதிகாரப்பூர்வ அலுவலக வரைபடம்' : 'Official Secretariat Blueprint'}
              </div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                {lang === 'ta' ? 'வாகரை பிரதேச செயலக அலுவலக தளவரைபடம் (33 பிரிவுகள்)' : 'Vaharai DS Office Layout (33 Departments)'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-bar with Floor Filters & Search */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveFloor('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeFloor === 'ALL' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'ta' ? 'அனைத்து பிரிவுகள் (33)' : 'All Rooms (33)'}
            </button>
            <button
              onClick={() => setActiveFloor('GROUND')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeFloor === 'GROUND' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'ta' ? 'தரைத்தளம் (Ground Floor)' : 'Ground Floor'}
            </button>
            <button
              onClick={() => setActiveFloor('FIRST')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeFloor === 'FIRST' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'ta' ? 'முதலாம் மாடி (First Floor)' : 'First Floor'}
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={lang === 'ta' ? 'பிரிவு எண் அல்லது பெயர்...' : 'Room number or branch...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Body Grid: Left Image Viewer & Right Interactive Counter Directory */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: The Architectural Map Image */}
          <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-2 border border-slate-300 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group">
            <img
              src="/public/assets/aistudio/image_f160dbde.png"
              alt="Divisional Secretariat Koralaipattu North Office Layout"
              className="w-full h-auto max-h-[500px] object-contain rounded-xl"
            />
            <div className="w-full text-center py-1.5 bg-slate-950/90 text-[10px] text-amber-300 font-mono mt-1 rounded-lg">
              {lang === 'ta'
                ? 'அலுவலக தளவரைபடம்: 01 முதல் 33 வரையிலான பிரிவுகள் வரைபடத்தில் குறிக்கப்பட்டுள்ளன'
                : 'Official Map Blueprint: Rooms 01 to 33 identified on Ground & First Floors'}
            </div>
          </div>

          {/* Right: Interactive 33 Departments Counter List */}
          <div className="lg:col-span-5 space-y-2.5 overflow-y-auto max-h-[500px] pr-1">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              {lang === 'ta' ? 'பிரிவுகள் பட்டியல் & கவுண்டர் எண்கள்:' : 'Departments & Counter Numbers:'}
            </h4>

            {filteredBranches.map((branch) => {
              const isSelected = selectedBranch?.counterNumber === branch.counterNumber;
              return (
                <div
                  key={branch.counterNumber}
                  onClick={() => setSelectedBranch(branch)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-950 text-amber-300 font-mono font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                        {String(branch.counterNumber).padStart(2, '0')}
                      </span>
                      <div>
                        <strong className="text-slate-900 block font-bold leading-tight">
                          {branch.nameTa}
                        </strong>
                        <span className="text-[10px] text-slate-500">{branch.nameEn}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        branch.floor.includes('First')
                          ? 'bg-purple-100 text-purple-900'
                          : branch.floor.includes('Ground')
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {branch.floor.includes('First') ? 'மாடி 1' : branch.floor.includes('Ground') ? 'தரைத்தளம்' : 'வளாகம்'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1 leading-snug pl-9">
                    {branch.descriptionTa}
                  </p>

                  {onSelectCounter && branch.isPublicServiceCounter && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCounter(branch.counterNumber, branch.nameTa);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        {lang === 'ta' ? 'இந்த கவுண்டருக்கு டோக்கன் எடு' : 'Select Counter'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 text-[11px]">
            {lang === 'ta'
              ? 'வரவேற்பு கருமபீடத்தில் பொதுமக்களுக்கு உரிய கவுண்டர் எண் மற்றும் மாடியை வழிகாட்ட இதைப் பயன்படுத்தவும்.'
              : 'Use this reference to guide citizens to the exact room number and floor level.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
