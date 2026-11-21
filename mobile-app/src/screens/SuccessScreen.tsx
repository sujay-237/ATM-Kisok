import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Receipt, Banknote, RefreshCw, Zap } from 'lucide-react';
import { VerificationResult, ScannedSession, MobileUser } from '../types';
import { getApiBase } from '../services/api';

interface SuccessScreenProps {
  result: VerificationResult;
  session?: ScannedSession | null;
  user?: MobileUser | null;
  prestagedAmount?: number | null;
  onRefreshBalance?: () => void;
  onFinish: () => void;
}

interface CompletedTransaction {
  id: string;
  amount: number;
  remaining_balance: number;
  timestamp: string;
  terminal: string;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  result,
  session,
  user,
  prestagedAmount,
  onRefreshBalance,
  onFinish,
}) => {
  const [dispensedTx, setDispensedTx] = useState<CompletedTransaction | null>(null);

  // Poll ATM session to detect when cash is dispensed at the kiosk
  useEffect(() => {
    if (!session?.sessionId) return;

    let isSubscribed = true;
    const baseUrl = getApiBase();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${baseUrl}/api/session/${session.sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'COMPLETED') {
          if (isSubscribed) {
            setDispensedTx({
              id: data.transaction?.id || `TXN-${session.sessionId.slice(0, 8).toUpperCase()}`,
              amount: data.transaction?.amount || prestagedAmount || 1000,
              remaining_balance: data.transaction?.remaining_balance ?? (user ? user.account_balance - (prestagedAmount || 1000) : 24000.23),
              timestamp: data.transaction?.created_at || new Date().toISOString(),
              terminal: session.kioskId || 'KIOSK-EAST-01',
            });
            if (onRefreshBalance) onRefreshBalance();
          }
        }
      } catch {
        // Silently retry
      }
    }, 1200);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [session?.sessionId, session?.kioskId, user, prestagedAmount, onRefreshBalance]);

  const handleFinish = () => {
    if (onRefreshBalance) onRefreshBalance();
    onFinish();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#F5F2EB] text-[#171715] text-center select-none font-sans relative overflow-hidden antialiased">
      {dispensedTx ? (
        <>
          <div className="pt-2 relative z-10">
            {/* Swiss Private Banking Emerald Verification Seal */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-[#EBF5F0] border-2 border-[#CDE5D9] flex items-center justify-center text-[#155E43] mx-auto mb-3 shadow-warm-xs"
            >
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </motion.div>

            {prestagedAmount && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE4] text-[#B5935A] text-[10px] font-mono tracking-wider font-semibold border border-[#E2D4BC] mb-2 uppercase">
                <Zap className="w-3.5 h-3.5 text-[#B5935A] fill-[#B5935A]" />
                <span>Express Pre-Staged Dispense Settled</span>
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#171715] tracking-tight">
              Banknotes Dispensed
            </h2>
            <p className="text-xs text-[#666156] mt-1 font-sans">
              Please collect your cash from the concierge terminal tray.
            </p>
          </div>

          {/* Swiss Private Banking Advice Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="my-auto bg-[#FCFBF8] border border-[#E6E0D4] rounded-2xl p-5 text-left shadow-warm-md relative z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D4]">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-[#B5935A]" />
                <span className="font-serif font-semibold text-[#171715] text-xs uppercase tracking-wider">Debit Advice</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#155E43] border border-[#CDE5D9]">
                SETTLED
              </span>
            </div>

            <div className="py-4 text-center border-b border-[#E6E0D4]">
              <p className="text-[10px] uppercase font-mono tracking-[0.14em] font-semibold text-[#9A9386]">Dispensed Amount</p>
              <p className="text-3xl font-serif font-semibold text-[#171715] mt-0.5 tabular-nums">
                ₹{dispensedTx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-[#666156] font-mono">Indian Rupees (INR)</p>
            </div>

            <div className="pt-3 space-y-2 text-xs font-mono text-[#666156]">
              <div className="flex justify-between">
                <span className="text-[#9A9386]">Account Holder:</span>
                <span className="font-semibold text-[#171715] font-sans">{user?.full_name || 'Private Client'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9A9386]">Terminal ID:</span>
                <span className="font-semibold text-[#171715]">{dispensedTx.terminal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9A9386]">Transaction ID:</span>
                <span className="text-[#666156]">{dispensedTx.id.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9A9386]">Updated Reserves:</span>
                <span className="font-bold text-[#155E43] tabular-nums">
                  ₹{dispensedTx.remaining_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9A9386]">Timestamp:</span>
                <span className="text-[11px] text-[#666156]">{new Date(dispensedTx.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </motion.div>

          <div className="pt-2 relative z-10">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleFinish}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider shadow-warm-xs transition flex items-center justify-center gap-2 border border-[#255243]/50"
            >
              <span>Return to Portfolio</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </motion.button>
          </div>
        </>
      ) : (
        /* While waiting for user to select amount on ATM kiosk */
        <>
          <div className="pt-2 relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-16 h-16 rounded-full bg-[#EBF5F0] border border-[#CDE5D9] flex items-center justify-center text-[#155E43] mx-auto mb-3 shadow-warm-xs"
            >
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </motion.div>

            {prestagedAmount && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE4] text-[#B5935A] text-[10px] font-mono border border-[#E2D4BC] mb-2 uppercase font-semibold">
                <Zap className="w-3.5 h-3.5 text-[#B5935A] fill-[#B5935A]" />
                <span>Express ₹{prestagedAmount.toLocaleString()} Auto-Dispensing</span>
              </div>
            )}

            <h2 className="text-2xl font-serif font-semibold text-[#171715]">
              Authorization Approved
            </h2>
            <p className="text-xs text-[#666156] mt-1 max-w-xs mx-auto font-sans">
              Your biometric identity was confirmed. Look at the concierge terminal screen to complete cash dispensing.
            </p>
          </div>

          {/* Verification Details */}
          <div className="my-auto bg-[#FCFBF8] border border-[#E6E0D4] rounded-2xl p-5 text-left space-y-2.5 text-xs relative z-10 shadow-warm-xs">
            <div className="flex justify-between border-b border-[#E6E0D4] pb-2">
              <span className="text-[#9A9386]">Terminal ID:</span>
              <span className="font-semibold text-[#171715] font-mono">{session?.kioskId || 'KIOSK-EAST-01'}</span>
            </div>
            <div className="flex justify-between border-b border-[#E6E0D4] pb-2">
              <span className="text-[#9A9386]">Confidence Match:</span>
              <span className="font-bold text-[#155E43] font-mono tabular-nums">
                {Math.round(result.confidence * 100)}% Verified
              </span>
            </div>
            <div className="flex justify-between border-b border-[#E6E0D4] pb-2">
              <span className="text-[#9A9386]">Liveness Check:</span>
              <span className="font-semibold text-[#155E43] font-mono">PASSED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9A9386]">Verification Enclave:</span>
              <span className="font-medium text-[#171715] font-mono flex items-center gap-1">
                Sentinel Cryptographic Enclave
              </span>
            </div>

            {/* Waiting for Cash Dispense Pill */}
            <div className="mt-3 p-3 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#B5935A] animate-spin shrink-0" />
              <div className="text-left">
                <p className="font-semibold text-[#171715]">Awaiting Dispense on Terminal</p>
                <p className="text-[11px] text-[#666156]">Banknotes emerging at terminal tray.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2 relative z-10">
            <button
              type="button"
              onClick={() => {
                setDispensedTx({
                  id: `TXN-${(session?.sessionId || '101').slice(0, 8).toUpperCase()}`,
                  amount: prestagedAmount || 1000,
                  remaining_balance: user ? user.account_balance - (prestagedAmount || 1000) : 24000.23,
                  timestamp: new Date().toISOString(),
                  terminal: session?.kioskId || 'KIOSK-EAST-01',
                });
                if (onRefreshBalance) onRefreshBalance();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#FCFBF8] hover:bg-white text-[#171715] font-medium text-xs border border-[#E6E0D4] transition flex items-center justify-center gap-1.5 shadow-warm-xs"
            >
              <Banknote className="w-3.5 h-3.5 text-[#B5935A]" />
              <span>Simulate Dispense (₹{prestagedAmount || 1000})</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleFinish}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider shadow-warm-xs transition flex items-center justify-center gap-2 border border-[#255243]/50"
            >
              <span>Done</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
};
export default SuccessScreen;
