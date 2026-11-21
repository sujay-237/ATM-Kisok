import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User as UserIcon, Building2, UserPlus, ShieldAlert } from 'lucide-react';
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

  const navTabs = [
    { id: 'customer', label: 'Private Banking', icon: UserIcon },
    { id: 'register', label: 'Open Account', icon: UserPlus },
    { id: 'admin', label: 'Security & Audit', icon: Lock },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#171715] flex flex-col justify-between font-sans relative antialiased selection:bg-[#102A22] selection:text-[#FAF8F3]">
      {/* Top Floating Editorial Navigation Bar */}
      <header className="w-full bg-[#F5F2EB]/90 backdrop-blur-md border-b border-[#E6E0D4] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Bank Seal & Wordmark */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#102A22] flex items-center justify-center text-[#B5935A] shadow-sm border border-[#B5935A]/30">
              <Building2 className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-serif font-semibold tracking-tight text-[#171715]">
                  SENTINEL PRIVATE BANK
                </h1>
                <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-[#F4EFE4] text-[#B5935A] border border-[#E2D4BC] font-semibold">
                  GENÈVE • EST. 1894
                </span>
              </div>
              <p className="text-xs text-[#666156] font-sans tracking-wide">
                Private Wealth Management • Cardless Biometric Terminal Network
              </p>
            </div>
          </div>

          {/* Navigation Tabs with Smooth Sliding Pill Indicator */}
          <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#EBE6DB] border border-[#E6E0D4]">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 rounded-lg text-xs font-medium transition-colors z-10 flex items-center gap-2 ${
                    isActive ? 'text-[#FAF8F3] font-semibold' : 'text-[#666156] hover:text-[#171715]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 bg-[#102A22] rounded-lg shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-20 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'customer' && (
            <motion.div
              key="tab-customer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {loggedInUser ? (
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
              )}
            </motion.div>
          )}

          {activeTab === 'register' && (
            <motion.div
              key="tab-register"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <RegisterScreen
                onSuccess={handleRegistrationSuccess}
                onGoToLogin={() => setActiveTab('customer')}
              />
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div
              key="tab-admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {isAdminUnlocked ? (
                <AdminDashboard />
              ) : (
                <div className="max-w-md mx-auto luxury-card rounded-2xl p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#FDF2F4] border border-[#F8CBD4] flex items-center justify-center text-[#9F1239] mx-auto mb-3">
                    <ShieldAlert className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h3 className="text-2xl font-serif font-semibold text-[#171715]">
                    Institutional Security Verification
                  </h3>
                  <p className="text-xs text-[#666156] mt-1.5 mb-6">
                    Enter the authorized 4-digit security PIN to access live fraud audits and terminal controls.
                  </p>

                  {adminPinError && (
                    <div className="mb-4 p-3 rounded-xl bg-[#FDF2F4] border border-[#F8CBD4] text-[#9F1239] text-xs text-left">
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
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-center text-lg font-mono tracking-widest focus:outline-none focus:border-[#B5935A] focus:ring-1 focus:ring-[#B5935A] transition"
                    />
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition shadow-sm"
                    >
                      Verify Administrative Identity
                    </motion.button>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Editorial Stationery Footer */}
      <footer className="w-full bg-[#EBE6DB]/80 border-t border-[#E6E0D4] py-4 px-6 text-center text-xs text-[#666156] font-mono tracking-wider">
        SENTINEL PRIVATE BANK • SECURE BIOMETRIC CUSTODY • STRICT CONFIDENTIALITY PROTOCOL
      </footer>
    </div>
  );
};
export default App;
