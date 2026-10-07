import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, User, ArrowRight, UserPlus, AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import { MobileUser } from '../types';
import { mobileApi } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: MobileUser) => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGoToRegister }) => {
  const [users, setUsers] = useState<MobileUser[]>([]);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mobileApi.getUsers().then((data) => {
      // Filter out admin, only show regular customer accounts
      const customers = data.filter((u) => u.role === 'user');
      setUsers(customers);
      if (customers.length > 0) {
        setUsername(customers[0].username);
      }
    }).catch(console.error);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !pin) {
      setError('Please provide your username and 4-digit PIN.');
      return;
    }

    try {
      setLoading(true);
      const res = await mobileApi.login(username.trim().toLowerCase(), pin);
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid username or PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900">
      {/* Brand Header */}
      <div className="pt-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center text-white mx-auto shadow-md mb-3">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          SENTINEL MOBILE
        </h1>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Cardless Biometric Banking
        </p>
      </div>

      {/* Main Login Form Area */}
      <div className="my-auto space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {users.length === 0 ? (
          <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-3">
            <User className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-800">No Customers Registered</h3>
            <p className="text-xs text-slate-500">
              Open a new checking account with your selfie to experience cardless ATM withdrawals.
            </p>
            <button
              type="button"
              onClick={onGoToRegister}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Open New Account</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Quick account pills */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1.5">
                Account Username
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setUsername(u.username);
                      setPin('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      username === u.username
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    @{u.username}
                  </button>
                ))}
              </div>

              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1.5">
                4-Digit Security PIN
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
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-center font-mono tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer / Register Prompt */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={onGoToRegister}
          className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center justify-center gap-1.5 mx-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New Customer? Open an Account</span>
        </button>
      </div>
    </div>
  );
};
