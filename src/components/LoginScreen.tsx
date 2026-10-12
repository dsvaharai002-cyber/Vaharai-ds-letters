import React, { useState } from 'react';
import { Lock, User as UserIcon, ShieldAlert, ArrowRight } from 'lucide-react';
import { User } from '../types';
import { VaharaiLogo } from './VaharaiLogo';

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
      setError('Invalid User ID or Password. Please try again.');
      return;
    }

    if (user.Status === 'Locked') {
      setError('Your account is currently locked. Please contact the Super Administrator.');
      return;
    }

    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Emblem & Title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <VaharaiLogo size="lg" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Divisional Secretariat - Vaharai
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-medium text-blue-200">
            Koralaipattu North • Official Mail Management System
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] font-semibold text-blue-300 border border-blue-400/30">
            <span>Postal Mail Tracking & Departmental Routing</span>
          </div>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-white/10 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-lg">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
            <span>User Authentication</span>
            <span className="text-xs text-blue-700 font-medium">Secure Portal</span>
          </h2>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                User ID
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. admin / mega01 / luxury01 / mail01"
                  className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-gray-900 focus:border-blue-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs font-medium text-gray-900 focus:border-blue-700 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-800 py-2.5 font-bold text-xs text-white shadow-md hover:bg-blue-900 transition active:scale-[0.99]"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-blue-200/70">
          Divisional Secretariat • Koralaipattu North Vaharai &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};
