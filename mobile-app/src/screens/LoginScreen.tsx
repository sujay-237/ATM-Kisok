import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  User,
  ArrowRight,
  UserPlus,
  AlertCircle,
  RefreshCw,
  Building2,
  Settings,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { MobileUser } from '../types';
import { mobileApi } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: MobileUser) => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onGoToRegister }) => {
  const [users, setUsers] = useState<MobileUser[]>([]);
  const [username, setUsername] = useState('alex');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Server settings modal state
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverUrl, setServerUrl] = useState(mobileApi.getBaseUrl());
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [serverStatusMsg, setServerStatusMsg] = useState('');

  const checkConnection = async (targetUrl?: string) => {
    setServerStatus('checking');
    const res = await mobileApi.testConnection(targetUrl);
    if (res.ok) {
      setServerStatus('connected');
      setServerStatusMsg(res.message);
    } else {
      setServerStatus('disconnected');
      setServerStatusMsg(res.message);
    }
  };

  const loadUsers = () => {
    mobileApi.getUsers()
      .then((data) => {
        const customers = data.filter((u) => u.role === 'user');
        setUsers(customers);
        if (customers.length > 0) {
          setUsername(customers[0].username);
          if (customers[0].username === 'alex') setPin('1234');
          else if (customers[0].username === 'sarah') setPin('4321');
          else setPin('');
        }
        setServerStatus('connected');
      })
      .catch((err) => {
        console.warn('Could not fetch users list:', err);
        setServerStatus('disconnected');
        setServerStatusMsg('Cannot reach backend. Tap Server Settings to configure IP.');
      });
  };

  useEffect(() => {
    checkConnection();
    loadUsers();
  }, []);

  const handleSaveServerUrl = async () => {
    const updated = mobileApi.setBaseUrl(serverUrl);
    setServerUrl(updated);
    await checkConnection(updated);
    loadUsers();
    setShowServerModal(false);
  };

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
      const msg = err instanceof Error ? err.message : 'Invalid username or PIN';
      setError(`${msg} (Backend: ${mobileApi.getBaseUrl()})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#F5F2EB] text-[#171715] font-sans relative overflow-hidden antialiased">
      {/* Top Bar with Server Status Pill */}
      <div className="relative z-10">
        <div className="flex items-center justify-between pt-1 mb-3">
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={() => setShowServerModal(true)}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-mono flex items-center gap-1.5 transition ${
              serverStatus === 'connected'
                ? 'bg-[#EBF5F0] border-[#CDE5D9] text-[#155E43]'
                : 'bg-[#FDF2F4] border-[#F7D1D9] text-[#9F1239]'
            }`}
          >
            {serverStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-[#155E43]" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-[#9F1239]" />
            )}
            <span className="truncate max-w-[170px]">{mobileApi.getBaseUrl().replace('http://', '')}</span>
            <Settings className="w-3 h-3 text-[#9A9386] ml-0.5" />
          </motion.button>

          <span className="text-[10px] uppercase font-mono tracking-[0.14em] text-[#9A9386] font-semibold">
            GENÈVE • EST. 1894
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#102A22] to-[#193D32] flex items-center justify-center text-[#FAF8F3] mx-auto shadow-warm-xs mb-2.5 border border-[#255243]/50">
            <Building2 className="w-7 h-7 text-[#B5935A]" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-[#171715] tracking-tight">
            SENTINEL PRIVATE WEALTH
          </h1>
          <p className="text-xs text-[#666156] font-sans mt-0.5">
            Cardless Biometric Client Portal
          </p>
        </div>
      </div>

      {/* Main Login Form Area */}
      <div className="my-auto space-y-4 py-2 relative z-10">
        {serverStatus === 'disconnected' && (
          <div className="p-3 rounded-xl bg-[#FDF6E7] border border-[#F0DFB8] text-[#9A6700] text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#9A6700] shrink-0" />
              <span className="truncate max-w-[200px]">Cannot reach backend</span>
            </div>
            <button
              onClick={() => setShowServerModal(true)}
              className="underline font-bold text-[#9A6700] text-[11px]"
            >
              Configure IP
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Quick Account Switcher Chips */}
          <div>
            <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1.5">
              Select or Enter Account
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {users.length > 0 ? (
                users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setUsername(u.username);
                      if (u.username === 'alex') setPin('1234');
                      else if (u.username === 'sarah') setPin('4321');
                      else setPin('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition ${
                      username === u.username
                        ? 'bg-[#102A22] border-[#102A22] text-[#FAF8F3] font-bold shadow-warm-xs'
                        : 'bg-[#FCFBF8] border-[#E6E0D4] text-[#666156] hover:bg-white hover:border-[#B5935A]'
                    }`}
                  >
                    @{u.username}
                  </button>
                ))
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setUsername('alex'); setPin('1234'); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition ${
                      username === 'alex' ? 'bg-[#102A22] border-[#102A22] text-[#FAF8F3] font-bold' : 'bg-[#FCFBF8] border-[#E6E0D4] text-[#666156]'
                    }`}
                  >
                    @alex (Client)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('sarah'); setPin('4321'); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition ${
                      username === 'sarah' ? 'bg-[#102A22] border-[#102A22] text-[#FAF8F3] font-bold' : 'bg-[#FCFBF8] border-[#E6E0D4] text-[#666156]'
                    }`}
                  >
                    @sarah (Client)
                  </button>
                </>
              )}
            </div>

            <div className="relative">
              <User className="w-4 h-4 text-[#9A9386] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Username (e.g. alex, sujay)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-[#171715] font-mono focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1.5">
              4-Digit Security PIN
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9A9386] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-center font-mono tracking-widest text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider shadow-warm-xs transition flex items-center justify-center gap-2 disabled:opacity-50 border border-[#255243]/50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#B5935A]" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </motion.button>
        </form>
      </div>

      {/* Footer / Register Prompt */}
      <div className="pt-3 border-t border-[#E6E0D4] text-center space-y-2 relative z-10">
        <button
          type="button"
          onClick={onGoToRegister}
          className="text-xs font-serif font-medium text-[#102A22] hover:underline flex items-center justify-center gap-1.5 mx-auto transition"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#B5935A]" />
          <span>New Client? Open Private Wealth Account</span>
        </button>

        <p className="text-[10px] text-[#9A9386] font-mono">
          Standard PINs: <strong className="text-[#171715]">1234</strong> (Alex) • <strong className="text-[#171715]">4321</strong> (Sarah)
        </p>
      </div>

      {/* Server Settings Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-[#FCFBF8] border border-[#E6E0D4] rounded-2xl p-6 shadow-warm-lg text-[#171715] space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3 border-[#E6E0D4]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#B5935A]" />
                <h3 className="text-sm font-serif font-semibold text-[#171715]">Backend Server Settings</h3>
              </div>
              <button
                onClick={() => setShowServerModal(false)}
                className="text-[#9A9386] hover:text-[#171715] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-[#666156] mb-3 font-sans">
                Specify the PC IP address running the FastAPI server. If testing on Android APK, use your computer's Wi-Fi IP.
              </p>

              <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1">
                Backend API URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://10.201.91.55:8000"
                className="w-full px-3 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-xs font-mono text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A]"
              />
            </div>

            {/* Quick IP Presets */}
            <div className="flex flex-wrap gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => setServerUrl('http://10.249.127.55:8000')}
                className="px-2 py-1 rounded-lg bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] font-mono hover:bg-white"
              >
                Host: 10.249.127.55:8000
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://10.0.2.2:8000')}
                className="px-2 py-1 rounded-lg bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] font-mono hover:bg-white"
              >
                Emulator: 10.0.2.2:8000
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://localhost:8000')}
                className="px-2 py-1 rounded-lg bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] font-mono hover:bg-white"
              >
                Localhost:8000
              </button>
            </div>

            {/* Test Connection Button */}
            <div>
              <button
                type="button"
                onClick={() => checkConnection(serverUrl)}
                className="w-full py-2 px-3 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-xs font-medium text-[#171715] hover:bg-white flex items-center justify-center gap-1.5 transition shadow-warm-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${serverStatus === 'checking' ? 'animate-spin text-[#B5935A]' : ''}`} />
                <span>Test Connection</span>
              </button>

              {serverStatusMsg && (
                <p className={`text-[11px] mt-2 text-center font-mono font-medium ${
                  serverStatus === 'connected' ? 'text-[#155E43]' : 'text-[#9F1239]'
                }`}>
                  {serverStatusMsg}
                </p>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#E6E0D4] text-xs font-medium text-[#666156] hover:text-[#171715]"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleSaveServerUrl}
                className="flex-1 py-2.5 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] text-xs font-sans font-medium shadow-warm-xs"
              >
                Save & Connect
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default LoginScreen;
