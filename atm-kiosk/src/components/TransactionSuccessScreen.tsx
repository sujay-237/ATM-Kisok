import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Receipt, ArrowRight, Printer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { TransactionSuccessData, KioskUser } from '../types';
import { sounds } from '../utils/sound';

interface TransactionSuccessScreenProps {
  user: KioskUser;
  data: TransactionSuccessData;
  onFinish: () => void;
}

export const TransactionSuccessScreen: React.FC<TransactionSuccessScreenProps> = ({
  user,
  data,
  onFinish,
}) => {
  const [countdown, setCountdown] = useState<number>(15);
  const [printed, setPrinted] = useState<boolean>(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const finishedTriggeredRef = useRef(false);

  useEffect(() => {
    sounds.playAuthSuccess();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!finishedTriggeredRef.current) {
            finishedTriggeredRef.current = true;
            onFinishRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePrint = () => {
    sounds.playKeypadBeep();
    setPrinted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-md mx-auto py-6 px-4 text-center font-sans"
    >
      {/* Swiss Private Banking Gold/Emerald Verification Seal */}
      <div className="w-16 h-16 rounded-full bg-[#EBF5F0] border border-[#CDE5D9] flex items-center justify-center text-[#155E43] mx-auto mb-3 shadow-warm-xs">
        <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#171715] tracking-tight">
        Withdrawal Complete
      </h2>
      <p className="text-[#666156] text-xs mt-1.5 font-sans">
        Please collect your banknotes from the secured tray. Digital advice transmitted to device.
      </p>

      {/* Swiss Private Banking Voucher Receipt Card */}
      <div className="mt-5 p-6 rounded-2xl bg-[#FCFBF8] border border-[#E6E0D4] text-left shadow-warm-md relative">
        {/* Subtle Luxury Corner Accents */}
        <div className="absolute top-2.5 left-2.5 w-2.5 h-2.5 border-t border-l border-[#B5935A]/40 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 border-t border-r border-[#B5935A]/40 rounded-tr-sm pointer-events-none" />

        {data.prestaged && (
          <div className="mb-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] text-[#B5935A] text-[10px] font-mono tracking-[0.14em] uppercase font-semibold">
            <Zap className="w-3.5 h-3.5 text-[#B5935A] fill-[#B5935A]" />
            <span>Express Pre-Staged Dispense</span>
          </div>
        )}

        <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E0D4]">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-[#B5935A]" />
            <span className="font-serif font-semibold text-[#171715] text-xs tracking-wider uppercase">Voucher of Dispense</span>
          </div>
          <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#155E43] border border-[#CDE5D9]">
            SETTLED
          </span>
        </div>

        <div className="py-4 text-center border-b border-[#E6E0D4]">
          <p className="text-[10px] uppercase font-mono tracking-[0.14em] text-[#9A9386] font-semibold">Amount Dispensed</p>
          <p className="text-3xl font-serif font-semibold text-[#171715] mt-0.5 tabular-nums tracking-tight">
            ₹{Number(data?.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-xs text-[#666156] font-mono font-normal">INR</span>
          </p>
        </div>

        <div className="py-3.5 space-y-2 font-mono text-xs text-[#666156]">
          <div className="flex justify-between">
            <span className="text-[#9A9386]">Account Holder:</span>
            <span className="text-[#171715] font-semibold font-sans">{user?.full_name || 'Private Client'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9A9386]">Transaction ID:</span>
            <span className="text-[#171715]">
              {(data?.transaction_id || 'TXN-SUCCESS').slice(0, 18)}...
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9A9386]">Remaining Reserves:</span>
            <span className="text-[#155E43] font-bold tabular-nums">
              ₹{Number(data?.remaining_balance ?? user?.account_balance ?? 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9A9386]">Timestamp:</span>
            <span className="text-[#666156] tabular-nums text-[11px]">
              {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center justify-center gap-2.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -1 }}
          onClick={handlePrint}
          className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition ${
            printed
              ? 'bg-[#EBF5F0] border-[#CDE5D9] text-[#155E43]'
              : 'bg-[#FCFBF8] border-[#E6E0D4] text-[#171715] hover:bg-[#F5F2EB]'
          }`}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{printed ? 'Printed Advice' : 'Print Advice'}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          whileHover={{ y: -1 }}
          onClick={() => {
            sounds.playKeypadBeep();
            onFinish();
          }}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-warm-xs transition border border-[#255243]/50"
        >
          <span>Done ({countdown}s)</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </motion.button>
      </div>
    </motion.div>
  );
};
