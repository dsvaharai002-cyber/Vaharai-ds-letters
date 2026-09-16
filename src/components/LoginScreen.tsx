import React, { useState } from 'react';
import { Lock, User as UserIcon, ShieldAlert, ArrowRight } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLoginSuccess }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = userId.trim();
    const user = users.find(
      (u) => u.User_ID.toLowerCase() === trimmedId.toLowerCase() && u.Password === password
    );

    if (!user) {
      setError('பயனர் ஐடி (User ID) அல்லது கடவுச்சொல் தவறானது!');
      return;
    }

    if (user.Status === 'Locked') {
      setError('உங்கள் கணக்கு முடக்கப்பட்டுள்ளது (Account Locked)! தயவுசெய்து Super Admin ஐத் தொடர்பு கொள்ளவும்.');
      return;
    }

    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-md">
        {/* Emblem / Title Card */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 p-1.5 shadow-xl backdrop-blur-md border border-white/20">
            <img
              src="/vaharai_logo.jpg"
              alt="கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலக முத்திரை"
              className="h-full w-full rounded-xl bg-white object-contain p-0.5 shadow-inner"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            கோறளைப்பற்று வடக்கு வாகரை கடித முகாமைத்துவம்
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-blue-200">
            பிரதேச செயலக கடித மேலாண்மை மற்றும் கண்காணிப்பு அமைப்பு
          </p>
          <div className="mt-2 inline-block rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] font-semibold text-blue-300 border border-blue-400/30">
            Koralaipattu North Vaharai DS Office
          </div>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-lg">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
            பயனர் உள்நுழைவு (User Login)
          </h2>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                பயனர் ஐடி (User ID)
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="எ.கா: admin / mail01 / mega01"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                கடவுச்சொல் (Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-800 py-2.5 font-bold text-sm text-white shadow-md hover:bg-blue-900 transition active:scale-[0.99]"
            >
              <span>உள்நுழைக (Login)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-blue-200/80">
          கோறளைப்பற்று வடக்கு வாகரை பிரதேச செயலகம் &copy; 2026. கடித முகாமைத்துவ அமைப்பு.
        </div>
      </div>
    </div>
  );
};