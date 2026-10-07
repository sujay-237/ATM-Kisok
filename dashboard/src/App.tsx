import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Lock, User as UserIcon, Building2, UserPlus, LogIn, KeyRound } from 'lucide-react';
import { User } from './types';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { RegisterScreen } from './components/RegisterScreen';
import { LoginScreen } from './components/LoginScreen';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'register' | 'admin'>('customer');
  const [users, setUsers] = useState<User[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/users');
      if (res.ok) {
        const data: User[] = await res.json();
        setUsers(data);
        if (loggedInUser) {
          const updated = data.find((u) => u.id === loggedInUser.id);
          if (updated) setLoggedInUser(updated);
        }
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAdminPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin PIN seeded in MongoDB is 9999
    if (adminPinInput === '9999') {
      setIsAdminUnlocked(true);
      setAdminPinError(null);
      setAdminPinInput('');
    } else {
      setAdminPinError('Invalid Admin PIN. (Default system PIN: 9999)');
    }
  };

  const handleRegistrationSuccess = (newUser: User) => {
    loadUsers();
    setLoggedInUser(newUser);
    setActiveTab('customer');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      {/* Top Main Navigation Header */}
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Portal Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  SENTINEL NATIONAL BANK
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  FDIC INSURED
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Cardless Biometric Security Portal • MongoDB Atlas • Gemini AI Vision
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('customer')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'customer'
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Customer Banking</span>
              </button>

              <button
                onClick={() => setActiveTab('register')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'register'
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Open New Account</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-white text-blue-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Operations</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        {activeTab === 'customer' && (
          loggedInUser ? (
            <UserDashboard
              currentUser={loggedInUser}
              onRefreshUser={loadUsers}
              onLogout={() => setLoggedInUser(null)}
            />
          ) : (
            <LoginScreen
              onLoginSuccess={(u) => setLoggedInUser(u)}
              onGoToRegister={() => setActiveTab('register')}
              registeredUsers={users}
            />
          )
        )}

        {activeTab === 'register' && (
          <RegisterScreen
            onSuccess={handleRegistrationSuccess}
            onGoToLogin={() => setActiveTab('customer')}
          />
        )}

        {activeTab === 'admin' && (
          isAdminUnlocked ? (
            <AdminDashboard />
          ) : (
            <div className="max-w-sm mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-6 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Administrator Access</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Enter your administrative PIN to access live fraud audits and key rotator settings.
              </p>

              {adminPinError && (
                <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {adminPinError}
                </div>
              )}

              <form onSubmit={handleAdminPinSubmit} className="space-y-4">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="PIN (Default: 9999)"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-center text-sm font-mono tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition"
                >
                  Verify Admin Identity
                </button>
              </form>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 font-sans">
        SENTINEL ANTI-FRAUD ATM ARCHITECTURE • FULL ACID INTEGRITY • MONGODB ATLAS CLUSTER • GEMINI MULTIMODAL ROTATOR
      </footer>
    </div>
  );
};
export default App;
