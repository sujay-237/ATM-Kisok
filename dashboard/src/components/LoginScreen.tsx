import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

  const customerUsers = registeredUsers.filter((u) => u.role === 'user');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !pin) {
      setError('Please provide your username and 4-digit PIN.');
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-md mx-auto luxury-card rounded-2xl p-8"
    >
      {/* Header */}
      <div className="border-b border-[#E6E0D4] pb-5 mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A] mx-auto mb-3">
          <ShieldCheck className="w-6 h-6 stroke-[1.8]" />
        </div>
        <h2 className="text-3xl font-serif font-semibold text-[#171715] tracking-tight">Private Client Portal</h2>
        <p className="text-xs text-[#666156] mt-1.5 leading-relaxed">
          Access your private wealth balance, cardless concierge settings, and authorized representative ledger.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 p-3 rounded-xl bg-[#FDF2F4] border border-[#F8CBD4] text-[#9F1239] text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
          <span>{error}</span>
        </motion.div>
      )}

      {customerUsers.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#F5F2EB]/60 border border-dashed border-[#E6E0D4] text-center space-y-3">
          <UserIcon className="w-8 h-8 text-[#9A9386] mx-auto" />
          <p className="text-base font-serif font-medium text-[#171715]">No Client Accounts Registered</p>
          <p className="text-xs text-[#666156]">
            Open a private client account with your biometric baseline portrait to get started.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onGoToRegister}
            className="w-full py-2.5 px-4 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition shadow-sm"
          >
            Open Private Account
          </motion.button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Select or Enter Client ID
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {customerUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelect(u)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                    username === u.username
                      ? 'bg-[#102A22] border-[#102A22] text-[#FAF8F3] shadow-sm'
                      : 'bg-[#FCFBF8] border-[#E6E0D4] text-[#666156] hover:bg-[#F5F2EB]'
                  }`}
                >
                  @{u.username}
                </button>
              ))}
            </div>

            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#9A9386] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder="Client ID (e.g. alex, sujay)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm focus:outline-none focus:border-[#B5935A] font-mono transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              4-Digit Security PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9A9386] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm tracking-widest font-mono text-center focus:outline-none focus:border-[#B5935A] transition"
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#B5935A]" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4 text-[#B5935A]" />
              </>
            )}
          </motion.button>

          <div className="pt-4 border-t border-[#E6E0D4] text-center">
            <p className="text-xs text-[#666156]">
              Prospective client?{' '}
              <button
                type="button"
                onClick={onGoToRegister}
                className="text-[#102A22] hover:underline font-semibold transition"
              >
                Open an Account with Biometrics
              </button>
            </p>
          </div>
        </form>
      )}
    </motion.div>
  );
};
