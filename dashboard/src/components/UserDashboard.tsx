import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Clock,
  ShieldCheck,
  UserCheck,
  Camera,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { User, Transaction, Delegation } from '../types';
import { DelegationModal } from './DelegationModal';
import { ProfileSelfieModal } from './ProfileSelfieModal';

interface UserDashboardProps {
  currentUser: User;
  onRefreshUser: () => void;
  onLogout: () => void;
}

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
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome / Account Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider font-mono">Personal Checking Account</span>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">Welcome, {currentUser.full_name}</h2>
          <p className="text-xs text-slate-500 font-mono mt-1">
            ACCOUNT •••• {currentUser.id.slice(0, 4).toUpperCase()} | USERNAME: @{currentUser.username} | PHONE: {currentUser.phone}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Refresh Account Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Account Balance & Biometrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-blue-200 text-xs font-medium uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                <span>Available Balance</span>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-light text-blue-200">₹</span>
              <span className="text-5xl font-extrabold font-mono tracking-tight">
                {showBalance ? currentUser.account_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '••••••••'}
              </span>
              <span className="text-xs text-blue-200 font-mono">INR</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-blue-100">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Cardless ATM Anti-Skimming Protection: <strong>Enabled</strong></span>
            </div>
            <button
              onClick={() => setIsDelegationModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-900 font-semibold text-xs shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Delegation</span>
            </button>
          </div>
        </div>

        {/* Biometric Face Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-700" />
                Enrolled Face Baseline
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gemini Vision compares this baseline image against the live front camera selfie captured at the ATM.
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center">
                {currentSelfieUrl ? (
                  <img src={currentSelfieUrl} alt="Registered Selfie" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-slate-900">{currentUser.full_name}</p>
                <p className="text-slate-500 font-mono text-[11px]">{currentUser.phone}</p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enrolled Baseline</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsSelfieModalOpen(true)}
            className="w-full mt-4 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            Update Reference Photo
          </button>
        </div>
      </div>

      {/* Temporary Delegations Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Temporary Delegations</h3>
              <p className="text-xs text-slate-500">
                Authorize family members or staff for cardless cash withdrawals without sharing cards or PINs.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDelegationModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Delegation</span>
          </button>
        </div>

        {delegations.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <UserCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Active Delegations</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Grant a family member temporary withdrawal authority. They scan the ATM QR code from their authorized device.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {delegations.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      d.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {d.is_active ? 'ACTIVE' : 'EXPIRED'}
                    </span>
                    {d.is_active && (
                      <button
                        onClick={() => handleRevokeDelegation(d.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Revoke Delegation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{d.delegatee_name}</h4>
                  <p className="text-xs text-slate-500 font-mono">{d.delegatee_phone}</p>

                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Max Cap:</span>
                      <span className="font-semibold text-slate-900 font-mono">₹{d.max_withdrawal_limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Remaining:</span>
                      <span className="font-bold text-emerald-600 font-mono">₹{d.remaining_limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires: {new Date(d.expires_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction History Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cardless ATM Transaction History</h3>
              <p className="text-xs text-slate-500">Withdrawals verified with dynamic QR & mobile biometrics.</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-y border-slate-200">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Terminal ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verification Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No ATM cash withdrawals recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 font-mono">{tx.kiosk_id}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.transaction_type}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600 font-mono text-sm">
                      ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {tx.delegated_by_user_id ? (
                        <span className="text-indigo-600 font-medium">Family Delegated Withdrawal</span>
                      ) : (
                        <span>Biometric Auth (Face + Fingerprint)</span>
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
        userBalance={currentUser.account_balance}
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
