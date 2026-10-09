import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
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
  CheckCircle2,
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
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900">
      {/* Top Bar with Server Status Pill */}
      <div>
        <div className="flex items-center justify-between pt-1 mb-3">
          <button
            type="button"
            onClick={() => setShowServerModal(true)}
            className={`px-3 py-1.5 rounded-full border text-[11px] font-mono flex items-center gap-1.5 transition ${
              serverStatus === 'connected'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {serverStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span className="truncate max-w-[170px]">{mobileApi.getBaseUrl().replace('http://', '')}</span>
            <Settings className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
            v1.2 Sentinel
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-700 flex items-center justify-center text-white mx-auto shadow-md mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            SENTINEL MOBILE
          </h1>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Cardless Biometric Banking
          </p>
        </div>
      </div>

      {/* Main Login Form Area */}
      <div className="my-auto space-y-4 py-2">
        {serverStatus === 'disconnected' && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cannot connect to {mobileApi.getBaseUrl()}</span>
            </div>
            <button
              onClick={() => setShowServerModal(true)}
              className="underline font-bold text-amber-900 text-[11px]"
            >
              Change IP
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Quick Account Switcher Chips */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1.5">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      username === u.username
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      username === 'alex' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    @alex (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('sarah'); setPin('4321'); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      username === 'sarah' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    @sarah (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('sujay'); setPin(''); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      username === 'sujay' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    @sujay
                  </button>
                </>
              )}
            </div>

            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Username (e.g. alex, sujay)"
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
      </div>

      {/* Footer / Register Prompt */}
      <div className="pt-3 border-t border-slate-100 text-center space-y-2">
        <button
          type="button"
          onClick={onGoToRegister}
          className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center justify-center gap-1.5 mx-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New Customer? Open an Account</span>
        </button>

        <p className="text-[10px] text-slate-400">
          Tip: Default demo PINs are <strong>1234</strong> (Alex) and <strong>4321</strong> (Sarah)
        </p>
      </div>

      {/* Server Settings Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-700" />
                <h3 className="text-sm font-bold">Backend Server Settings</h3>
              </div>
              <button
                onClick={() => setShowServerModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-3">
                Specify the PC IP address running the FastAPI server. If testing on Android APK, use your computer's Wi-Fi IP.
              </p>

              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Backend API URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://10.201.91.55:8000"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Quick IP Presets */}
            <div className="flex flex-wrap gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => setServerUrl('http://10.201.91.55:8000')}
                className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono hover:bg-slate-200"
              >
                Wi-Fi: 10.201.91.55:8000
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://10.0.2.2:8000')}
                className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono hover:bg-slate-200"
              >
                Emulator: 10.0.2.2:8000
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://localhost:8000')}
                className="px-2 py-1 rounded bg-slate-100 text-slate-700 font-mono hover:bg-slate-200"
              >
                Localhost:8000
              </button>
            </div>

            {/* Test Connection Button */}
            <div>
              <button
                type="button"
                onClick={() => checkConnection(serverUrl)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${serverStatus === 'checking' ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              {serverStatusMsg && (
                <p className={`text-[11px] mt-2 text-center font-medium ${
                  serverStatus === 'connected' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {serverStatusMsg}
                </p>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveServerUrl}
                className="flex-1 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-sm"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
