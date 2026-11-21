import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  QrCode,
  ShieldCheck,
  LogOut,
  UserCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  X,
  CreditCard,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { MobileUser, DelegationItem } from '../types';
import { mobileApi } from '../services/api';

interface HomeScreenProps {
  user: MobileUser;
  prestagedAmount: number | null;
  onSetPrestagedAmount: (amount: number | null) => void;
  onStartATMScan: () => void;
  onRefreshBalance?: () => void;
  onLogout: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  prestagedAmount,
  onSetPrestagedAmount,
  onStartATMScan,
  onRefreshBalance,
  onLogout,
}) => {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [delegations, setDelegations] = useState<DelegationItem[]>([]);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const PRESTAGED_OPTIONS = [500, 1000, 2000, 5000];

  // Refresh balance on mount and load delegations
  useEffect(() => {
    if (onRefreshBalance) {
      onRefreshBalance();
    }
    mobileApi.getDelegationsForPhone(user.phone).then((data) => {
      setDelegations(data.filter((d) => d.is_active));
    }).catch(console.error);

    const onFocus = () => {
      if (onRefreshBalance) onRefreshBalance();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user.phone, onRefreshBalance]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    if (onRefreshBalance) await onRefreshBalance();
    try {
      const data = await mobileApi.getDelegationsForPhone(user.phone);
      setDelegations(data.filter((d) => d.is_active));
    } catch {
      // Ignore
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const handleSelectChip = (amount: number) => {
    if (prestagedAmount === amount) {
      onSetPrestagedAmount(null);
    } else {
      onSetPrestagedAmount(amount);
      setShowCustomInput(false);
      setCustomAmountInput('');
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customAmountInput);
    if (!isNaN(val) && val > 0 && val <= user.account_balance) {
      onSetPrestagedAmount(val);
      setShowCustomInput(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-[#F5F2EB] text-[#171715] overflow-y-auto relative font-sans antialiased">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pt-1 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#102A22] to-[#193D32] flex items-center justify-center text-[#FAF8F3] font-serif font-semibold text-base shadow-warm-xs border border-[#255243]/50">
              {user.full_name.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] text-[#9A9386] font-mono tracking-[0.14em] uppercase">Private Client</p>
              <h2 className="text-sm font-serif font-semibold text-[#171715] tracking-tight">{user.full_name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleManualRefresh}
              className="p-2 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] hover:bg-white transition shadow-warm-xs"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#B5935A]' : ''}`} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onLogout}
              className="p-2 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] hover:bg-white transition shadow-warm-xs"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Active Delegation Alert Card */}
        {delegations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 rounded-2xl bg-[#EBF5F0] border border-[#CDE5D9] text-[#155E43] shadow-warm-xs"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-serif font-semibold flex items-center gap-1.5 text-[#155E43]">
                <UserCheck className="w-4 h-4 text-[#155E43]" />
                Delegated Client Mandate
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-[#155E43] border border-[#CDE5D9]">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#666156] font-sans">
              <strong className="text-[#171715]">{delegations[0].delegator_name}</strong> approved cardless withdrawal up to{' '}
              <strong className="text-[#155E43] font-serif font-semibold tabular-nums">₹{delegations[0].remaining_limit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </p>
          </motion.div>
        )}

        {/* Swiss Private Banking Anchor Hero Card (Deep Heritage Forest Green) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#102A22] via-[#143329] to-[#193D32] text-[#FAF8F3] shadow-warm-md relative overflow-hidden mb-5 border border-[#255243]/60">
          {/* Subtle Champagne Gold Top Line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#B5935A]/60 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#B5935A]" />
              <span className="text-[10px] uppercase font-mono tracking-[0.16em] text-[#D4C3A3] font-medium">
                SENTINEL PRIVATE WEALTH RESERVES
              </span>
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 rounded-lg text-[#D4C3A3] hover:text-[#FAF8F3] transition"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-baseline space-x-1.5 relative z-10">
            <span className="text-2xl font-serif text-[#B5935A]">₹</span>
            <span className="text-3xl font-serif font-semibold tracking-tight text-[#FAF8F3] tabular-nums">
              {showBalance ? user.account_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '••••••••'}
            </span>
            <span className="text-xs text-[#D4C3A3] font-mono">INR</span>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#255243]/80 flex items-center justify-between text-[11px] text-[#D4C3A3] font-mono relative z-10">
            <span className="tracking-widest">•••• 9012</span>
            <span className="flex items-center gap-1.5 text-[#5CE2AA]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#5CE2AA]" /> Hardware Enclave Active
            </span>
          </div>
        </div>

        {/* Feature 1: Express Withdraw (Pre-Stage) Card */}
        <div className="p-4 rounded-2xl bg-[#FCFBF8] border border-[#E6E0D4] mb-5 space-y-3 shadow-warm-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A]">
                <Zap className="w-4 h-4 text-[#B5935A]" />
              </div>
              <div>
                <h4 className="text-xs font-serif font-semibold text-[#171715] flex items-center gap-1.5">
                  Express Pre-Staged Dispense
                  {prestagedAmount && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#F4EFE4] text-[#B5935A] border border-[#E2D4BC] font-semibold">
                      10-SEC READY
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-[#666156]">
                  Pre-stage cash amount to skip ATM screen inputs and dispense in 10s.
                </p>
              </div>
            </div>

            {prestagedAmount && (
              <button
                onClick={() => onSetPrestagedAmount(null)}
                className="p-1 rounded-md text-[#9A9386] hover:text-[#9F1239] transition"
                title="Clear Pre-staged Amount"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Amount Quick-Select Chips */}
          <div className="grid grid-cols-4 gap-2">
            {PRESTAGED_OPTIONS.map((amt) => {
              const isSelected = prestagedAmount === amt;
              return (
                <motion.button
                  key={amt}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => handleSelectChip(amt)}
                  className={`py-2 rounded-xl text-xs font-mono font-semibold transition border tabular-nums ${
                    isSelected
                      ? 'bg-[#102A22] text-[#FAF8F3] border-[#102A22] shadow-warm-xs'
                      : 'bg-[#FCFBF8] border-[#E6E0D4] text-[#171715] hover:border-[#B5935A] hover:bg-white'
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </motion.button>
              );
            })}
          </div>

          {/* Custom Amount Toggle & Input */}
          {!showCustomInput ? (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="text-[11px] text-[#171715] hover:text-[#102A22] font-mono underline underline-offset-2"
              >
                + Enter custom amount
              </button>
              {prestagedAmount && (
                <span className="text-[11px] font-mono font-semibold text-[#155E43] tabular-nums">
                  ₹{prestagedAmount.toLocaleString()} staged
                </span>
              )}
            </div>
          ) : (
            <form onSubmit={handleApplyCustom} className="flex gap-2 pt-1">
              <input
                type="number"
                min="100"
                step="100"
                placeholder="Amount (₹)"
                value={customAmountInput}
                onChange={(e) => setCustomAmountInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-xs font-mono text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-[#102A22] text-[#FAF8F3] font-medium text-xs font-sans"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => setShowCustomInput(false)}
                className="px-2 py-1.5 text-[#9A9386] text-xs"
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Primary Action Button: Cardless ATM Withdrawal */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onStartATMScan}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] shadow-warm-md transition flex items-center justify-between group border border-[#255243]/50"
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-[#B5935A] border border-white/10">
              <QrCode className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-sm font-serif font-semibold text-[#FAF8F3]">Scan Concierge Terminal QR</p>
              <p className="text-xs text-[#D4C3A3] font-sans">
                {prestagedAmount ? `Express ₹${prestagedAmount.toLocaleString()} Ready` : 'Authenticate cardless cash withdrawal'}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#B5935A] group-hover:translate-x-1 transition-transform stroke-[2.5]" />
        </motion.button>

        {/* Security & Features Checklist */}
        <div className="mt-5 bg-[#FCFBF8] border border-[#E6E0D4] rounded-2xl p-4 space-y-2.5 shadow-warm-xs">
          <h4 className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold">
            Biometric Enclave Status
          </h4>
          <div className="flex items-center justify-between text-xs py-1 border-b border-[#E6E0D4]/60">
            <span className="text-[#666156]">Facial Baseline</span>
            <span className="font-semibold text-[#155E43] flex items-center gap-1 font-mono text-[11px]">
              <Sparkles className="w-3 h-3 text-[#B5935A]" /> Enrolled & Verified
            </span>
          </div>
          <div className="flex items-center justify-between text-xs py-1 border-b border-[#E6E0D4]/60">
            <span className="text-[#666156]">Hardware Biometrics</span>
            <span className="font-semibold text-[#155E43] font-mono text-[11px]">Fingerprint / Face ID</span>
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-[#666156]">Skimmer & Card Defense</span>
            <span className="font-semibold text-[#171715] font-mono text-[11px]">100% Cardless Enclave</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 text-center text-[10px] text-[#9A9386] font-mono">
        SENTINEL PRIVATE BANK • GENÈVE • SWISS PRIVATE BANKING ACCREDITATION
      </div>
    </div>
  );
};
export default HomeScreen;
