import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  UserCheck,
  Camera,
  Trash2,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  LogOut,
  Building2,
  CheckCircle2,
  Flame,
  CreditCard,
  Lock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User, Transaction, Delegation } from '../types';
import { DelegationModal } from './DelegationModal';
import { ProfileSelfieModal } from './ProfileSelfieModal';

interface UserDashboardProps {
  currentUser: User;
  onRefreshUser: () => void;
  onLogout: () => void;
}

// 60fps Native Rolling Counter for Luxury Balance Transitions
const AnimatedRollingCounter: React.FC<{ value: number; show: boolean }> = ({ value, show }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    let end = value;
    if (start === end) return;
    let startTime: number | null = null;
    const duration = 500;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * ease);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    const req = requestAnimationFrame(step);
    return () => cancelAnimationFrame(req);
  }, [value]);

  if (!show) {
    return <span className="font-mono tracking-widest text-3xl sm:text-4xl">••••••••</span>;
  }

  return (
    <span className="font-serif tracking-tight tabular-nums">
      ₹{displayValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
};

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  onRefreshUser,
  onLogout,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState<boolean>(false);
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState<boolean>(false);
  const [currentSelfieUrl, setCurrentSelfieUrl] = useState<string | null>(null);
  const [liveBalance, setLiveBalance] = useState<number>(currentUser.account_balance);

  useEffect(() => {
    setLiveBalance(currentUser.account_balance);
  }, [currentUser.account_balance]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, delRes, photoRes] = await Promise.all([
        fetch(`http://localhost:8000/api/transactions?user_id=${currentUser.id}`),
        fetch(`http://localhost:8000/api/delegations?delegator_id=${currentUser.id}`),
        fetch(`http://localhost:8000/api/users/${currentUser.id}/reference-photo`),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (delRes.ok) setDelegations(await delRes.json());
      if (photoRes.ok) {
        const photoData = await photoRes.json();
        setCurrentSelfieUrl(photoData.reference_selfie);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  // Real-time WebSocket listener for immediate live balance updates without reload
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/admin');
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            (payload.type === 'BALANCE_UPDATED' || payload.type === 'TRANSACTION_COMPLETE') &&
            (payload.user_id === currentUser.id || payload.user_id === currentUser.username)
          ) {
            const updatedBal = payload.new_balance ?? payload.remaining_balance;
            if (typeof updatedBal === 'number') {
              setLiveBalance(updatedBal);
            }
            fetchData();
            onRefreshUser();
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore
    }

    return () => {
      if (ws) ws.close();
    };
  }, [currentUser.id, currentUser.username, onRefreshUser]);

  const handleRevokeDelegation = async (delId: string) => {
    if (!confirm('Are you sure you want to revoke this cardless withdrawal authorization?')) return;
    try {
      const res = await fetch(`http://localhost:8000/api/delegations/${delId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-7 text-[#171715] font-sans">
      {/* Duress Freeze Warning on User Dashboard if active */}
      {currentUser.account_frozen_duress && (
        <div className="p-4 rounded-2xl bg-[#FDF2F4] border border-[#F8CBD4] text-[#9F1239] flex items-center gap-3.5 shadow-sm">
          <Flame className="w-5 h-5 text-[#9F1239] shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">Security Hold Active:</span> A silent duress panic withdrawal was recorded on this account. ATM withdrawals are temporarily restricted. Please contact your private client advisor or security officer to verify your safety.
          </div>
        </div>
      )}

      {/* Top Editorial Account Strip */}
      <div className="luxury-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-[#B5935A] uppercase font-medium">
            PRIVATE WEALTH PORTFOLIO • PRIMARY RESERVE
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-medium text-[#171715] mt-0.5 tracking-tight">
            Welcome, {currentUser.full_name}
          </h2>
          <p className="text-xs text-[#666156] font-mono mt-1">
            ACCOUNT •••• {currentUser.id.slice(0, 4).toUpperCase()} | CLIENT ID: @{currentUser.username} | PHONE: {currentUser.phone}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              fetchData();
              onRefreshUser();
            }}
            className="p-2.5 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] hover:bg-[#F5F2EB] shadow-sm transition"
            title="Refresh Account Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onLogout}
            className="px-4 py-2.5 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] hover:bg-[#F5F2EB] text-xs font-medium flex items-center gap-2 shadow-sm transition tracking-wide"
          >
            <LogOut className="w-4 h-4 text-[#9A9386]" />
            <span>Sign Out</span>
          </motion.button>
        </div>
      </div>

      {/* Account Balance & Biometric Identity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Signature Heritage Wealth Card (Deep Forest Green Satin) */}
        <div className="md:col-span-2 rounded-2xl p-7 heritage-forest-card flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#FAF8F3]/80 text-xs font-mono font-medium tracking-widest uppercase">
                <Building2 className="w-4 h-4 text-[#B5935A]" />
                <span className="text-[#B5935A]">Institutional Wealth Reserve</span>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 rounded-lg text-[#FAF8F3]/60 hover:text-[#FAF8F3] hover:bg-white/10 transition"
                title={showBalance ? "Mask Balance" : "Reveal Balance"}
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-serif text-[#FAF8F3]">
                <AnimatedRollingCounter value={liveBalance} show={showBalance} />
              </span>
              <span className="text-xs text-[#FAF8F3]/60 font-mono">INR</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
            <div className="flex items-center gap-2 text-[#FAF8F3]/80 font-mono text-[11px]">
              <ShieldCheck className="w-4 h-4 text-[#B5935A]" />
              <span>Cardless Biometric Terminal Custody: <strong className="text-[#B5935A] font-semibold">Active</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[#FAF8F3]/60 font-mono text-[11px]">
              <CreditCard className="w-3.5 h-3.5 text-[#B5935A]" />
              <span className="tracking-widest">•••• {currentUser.id.slice(0, 4).toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Biometric Identity Card (Warm Ivory with Champagne Gold Framing) */}
        <div className="luxury-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-serif font-semibold text-[#171715] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#B5935A]" />
                Biometric Identity Baseline
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EBF5F0] text-[#155E43] border border-[#C2E2D3]">
                VERIFIED
              </span>
            </div>
            <p className="text-xs text-[#666156] font-sans leading-relaxed">
              Live biometric authentication verified against your enrolled facial baseline at all private concierge terminals.
            </p>

            <div className="mt-5 flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full bg-[#F5F2EB] border-2 border-[#B5935A] p-0.5 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                {currentSelfieUrl ? (
                  <img src={currentSelfieUrl} alt="Registered Baseline" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Camera className="w-8 h-8 text-[#9A9386]" />
                )}
              </div>
              <div className="text-xs space-y-1">
                <p className="font-serif font-semibold text-base text-[#171715]">{currentUser.full_name}</p>
                <p className="text-[#666156] font-mono text-[11px]">{currentUser.phone}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#155E43] font-medium font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#155E43]" />
                  <span>Enrolled & Authenticated</span>
                </div>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsSelfieModalOpen(true)}
            className="w-full mt-5 py-2.5 px-3 rounded-xl border border-[#E6E0D4] bg-[#F5F2EB] hover:bg-[#EBE6DB] text-[#171715] text-xs font-medium transition tracking-wide"
          >
            Update Reference Portrait
          </motion.button>
        </div>
      </div>

      {/* Temporary Delegations Section (Only 1 primary CTA button) */}
      <div className="luxury-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold text-[#171715]">Authorized Client Representatives</h3>
              <p className="text-xs text-[#666156]">
                Grant trusted family members or private fiduciaries cardless withdrawal authority without sharing cards or PINs.
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsDelegationModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] text-xs font-medium tracking-wider uppercase flex items-center gap-1.5 shadow-sm transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-[#B5935A]" />
            <span>Authorize Representative</span>
          </motion.button>
        </div>

        {delegations.length === 0 ? (
          <div className="py-9 text-center bg-[#F5F2EB]/60 rounded-xl border border-dashed border-[#E6E0D4]">
            <UserCheck className="w-8 h-8 text-[#9A9386] mx-auto mb-2" />
            <p className="text-base font-serif font-medium text-[#171715]">No Active Delegations</p>
            <p className="text-xs text-[#666156] mt-1 max-w-sm mx-auto">
              Grant a trusted representative temporary cardless access. They authenticate at any concierge terminal with their registered mobile phone.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {delegations.map((d) => {
              const remainingPct = Math.min(100, Math.max(0, (d.remaining_limit / (d.max_withdrawal_limit || 1)) * 100));
              return (
                <div
                  key={d.id}
                  className={`p-5 rounded-xl border transition-all ${
                    d.is_active
                      ? 'bg-[#FCFBF8] border-[#E6E0D4] shadow-sm'
                      : 'bg-[#F5F2EB]/50 border-[#E6E0D4]/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        d.is_active
                          ? 'bg-[#EBF5F0] text-[#155E43] border border-[#C2E2D3]'
                          : 'bg-[#EBE6DB] text-[#666156]'
                      }`}>
                        {d.is_active ? 'ACTIVE' : 'EXPIRED'}
                      </span>
                      {d.is_active && (
                        <button
                          onClick={() => handleRevokeDelegation(d.id)}
                          className="p-1 text-[#9A9386] hover:text-[#9F1239] transition"
                          title="Revoke Delegation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <h4 className="text-base font-serif font-semibold text-[#171715]">{d.delegatee_name}</h4>
                    <p className="text-xs text-[#666156] font-mono">{d.delegatee_phone}</p>

                    {/* Limit Progress Bar */}
                    <div className="mt-3.5 space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-[#666156]">Remaining:</span>
                        <span className="font-semibold text-[#102A22] tabular-nums">
                          ₹{d.remaining_limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#EBE6DB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B5935A] rounded-full transition-all duration-500"
                          style={{ width: `${remainingPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#9A9386] font-mono pt-0.5">
                        <span>Max Cap:</span>
                        <span>₹{d.max_withdrawal_limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#E6E0D4] flex items-center gap-1.5 text-[11px] text-[#666156] font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#B5935A]" />
                    <span>Expires: {new Date(d.expires_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="luxury-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold text-[#171715]">Cardless Concierge Ledger</h3>
              <p className="text-xs text-[#666156]">Official audit records of verified cardless cash disbursements.</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] hover:bg-[#F5F2EB] shadow-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#F5F2EB] text-[#666156] uppercase font-mono tracking-wider border-y border-[#E6E0D4]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Terminal ID</th>
                <th className="px-4 py-3">Transaction</th>
                <th className="px-4 py-3">Disbursed</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verification Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D4]/70 font-mono">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#9A9386] font-sans">
                    No cardless withdrawals recorded in private ledger.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F5F2EB]/50 transition">
                    <td className="px-4 py-3.5 text-[#666156] font-mono">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#171715] font-mono">{tx.kiosk_id}</td>
                    <td className="px-4 py-3.5 text-[#666156] font-sans">{tx.transaction_type}</td>
                    <td className="px-4 py-3.5 font-bold text-[#102A22] font-mono text-sm tabular-nums">
                      ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF5F0] text-[#155E43] border border-[#C2E2D3]">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#666156] text-[11px] font-sans">
                      {tx.delegated_by_user_id ? (
                        <span className="text-[#102A22] font-medium">Authorized Client Representative</span>
                      ) : (
                        <span>Biometric Auth (Face + Device Biometrics)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <DelegationModal
        delegatorId={currentUser.id}
        userBalance={liveBalance}
        isOpen={isDelegationModalOpen}
        onClose={() => setIsDelegationModalOpen(false)}
        onCreated={() => {
          fetchData();
          onRefreshUser();
        }}
      />

      <ProfileSelfieModal
        userId={currentUser.id}
        userName={currentUser.full_name}
        currentPhoto={currentSelfieUrl}
        isOpen={isSelfieModalOpen}
        onClose={() => setIsSelfieModalOpen(false)}
        onUpdated={() => {
          fetchData();
          onRefreshUser();
        }}
      />
    </div>
  );
};
