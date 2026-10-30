import React, { useState } from 'react';
import { User } from '../types';
import { Language, translations } from '../translations/i18n';
import { VaharaiLogo } from './VaharaiLogo';
import { LogIn, Lock, User as UserIcon, Building2, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  users: User[];
  lang: Language;
  setLang: (lang: Language) => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  lang,
  setLang,
  onLoginSuccess,
}) => {
  const t = translations[lang];

  // Login Form State
  const [userIdInput, setUserIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedId = userIdInput.trim();
    const trimmedPw = passwordInput.trim();

    // Check credentials against active user database
    const matched = users.find((u) => u.id === trimmedId && u.password === trimmedPw);

    // Hardened safety fallback for official Super Admin credentials (93008148555 / 19930108)
    if (!matched && trimmedId === '93008148555' && trimmedPw === '19930108') {
      const superAdmin: User = {
        id: '93008148555',
        password: '19930108',
        name: 'பிரதேச செயலாளர் (Super Admin)',
        role: 'SUPERADMIN',
        division: 'ALL',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00Z',
      };
      onLoginSuccess(superAdmin);
      return;
    }

    if (matched) {
      if (matched.status === 'INACTIVE') {
        setErrorMsg(
          lang === 'ta'
            ? 'உங்கள் கணக்கு முடக்கப்பட்டுள்ளது. தலைமை நிர்வாகியை அணுகவும்.'
            : 'Your account is deactivated. Contact Super Administrator.'
        );
        return;
      }
      onLoginSuccess(matched);
    } else {
      setErrorMsg(
        lang === 'ta'
          ? 'தவறான பயனர் இலக்கம் அல்லது கடவுச்சொல்! சரியான விபரங்களை உள்ளிடவும்.'
          : 'Invalid User ID or Password! Please verify your official credentials.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

      {/* Language Switcher Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white text-xs border border-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <span>🌐</span>
          <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Official Header Strip with Vaharai Logo */}
        <div className="bg-emerald-950 p-6 text-white text-center border-b border-emerald-900">
          <div className="w-16 h-16 mx-auto rounded-full bg-white p-1 border-2 border-amber-400 flex items-center justify-center shadow-lg mb-3">
            <VaharaiLogo size={56} className="w-14 h-14" />
          </div>
          <div className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
            {t.republicSriLanka}
          </div>
          <h1 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
            {t.appTitle}
          </h1>
          <p className="text-xs text-emerald-200 mt-1 font-medium">
            {t.batticaloaDistrict} · {t.portalShort}
          </p>
        </div>

        {/* Form Container */}
        <div className="p-5 sm:p-6">
          <div className="mb-5 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{t.loginTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ta'
                ? 'அதிகாரபூர்வ பயனர் இலக்கம் மற்றும் கடவுச்சொல்லை உள்ளிட்டு உள்நுழையவும்'
                : 'Enter your official credentials to access the secretariat database'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Secure Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.userId}</span>
              </label>
              <input
                type="text"
                required
                placeholder={lang === 'ta' ? 'உ-ம்: 93008148555' : 'e.g. 93008148555'}
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.password}</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{lang === 'ta' ? 'உள்நுழைக' : 'Sign In'}</span>
            </button>
          </form>

          {/* Security & Access Restriction Notice (Requirement 03) */}
          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="text-slate-900 block font-bold mb-0.5">
                  {lang === 'ta' ? 'அதிகாரபூர்வ பாதுகாப்பு அறிவிப்பு:' : 'Official Security Notice:'}
                </strong>
                {lang === 'ta'
                  ? 'இது பொது அணுகலுக்கான தளம் அல்ல. பிரதேச செயலக உத்தியோகத்தர்கள் மட்டுமே உள்நுழையலாம். புதிய அலுவலர் கணக்குகள் தலைமை நிர்வாகியினால் (Super Admin) மாத்திரமே உருவாக்கப்படும்.'
                  : 'Restricted system. Public self-registration is disabled for data integrity. Official accounts are managed strictly by the Super Administrator.'}
              </div>
            </div>
          </div>

          {/* Official Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5 font-mono">
            <Building2 className="w-3 h-3 text-emerald-800" />
            <span>கோறளைப்பற்று வடக்கு (வாகரை) பிரதேச செயலகம் · அதிகாரபூர்வ தளம்</span>
          </div>
        </div>
      </div>
    </div>
  );
};
