import React, { useState } from 'react';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onGoToRegister: () => void;
  registeredUsers: User[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onGoToRegister,
  registeredUsers,
}) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter only regular customer accounts (role 'user')
  const customerUsers = registeredUsers.filter((u) => u.role === 'user');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !pin) {
      setError('Please enter your username and 4-digit PIN.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid username or PIN');
      }

      onLoginSuccess(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (u: User) => {
    setUsername(u.username);
    setPin('');
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5 mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mx-auto mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Sign in to Sentinel Bank</h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your account balance, transaction history, and cardless withdrawal settings.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {customerUsers.length === 0 ? (
        <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
          <UserIcon className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">No Customer Accounts Registered</p>
          <p className="text-xs text-slate-500">
            Database contains only the system administrator. Open a new bank account with your selfie to get started.
          </p>
          <button
            type="button"
            onClick={onGoToRegister}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-sm transition"
          >
            Open New Bank Account
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick User Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Select or Enter Username
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {customerUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelect(u)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    username === u.username
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  @{u.username}
                </button>
              ))}
            </div>

            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Username (e.g. jsmith)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              4-Digit PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm tracking-widest font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New customer?{' '}
              <button
                type="button"
                onClick={onGoToRegister}
                className="text-blue-700 hover:text-blue-800 font-semibold"
              >
                Open an Account with Selfie Biometrics
              </button>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
