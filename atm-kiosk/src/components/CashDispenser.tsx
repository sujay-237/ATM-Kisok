import React, { useEffect, useState, useRef } from 'react';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '../utils/sound';

interface CashDispenserProps {
  amount: number;
  newBalance?: number;
  isExpress?: boolean;
  onDispenseComplete: () => void;
}

export const CashDispenser: React.FC<CashDispenserProps> = ({
  amount,
  newBalance,
  isExpress = false,
  onDispenseComplete,
}) => {
  const [dispenseProgress, setDispenseProgress] = useState<'COUNTING' | 'DISPENSING' | 'COLLECT' | 'COMPLETE'>('COUNTING');
  const [billsCount, setBillsCount] = useState(0);
  const [rollingAmount, setRollingAmount] = useState(0);

  const onDispenseCompleteRef = useRef(onDispenseComplete);
  onDispenseCompleteRef.current = onDispenseComplete;
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    sounds.playCashDispenser();

    // 1. Rolling number counter from ₹0 up to requested amount
    const durationMs = 2200;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const current = Math.floor(progress * amount);
      setRollingAmount(current);
      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 40);

    // 2. Step transitions
    const step2Timer = setTimeout(() => {
      setDispenseProgress('DISPENSING');
    }, 900);

    // Note emergence sequence (1, 2, 3 bills emerging sequentially)
    const billInterval = setInterval(() => {
      setBillsCount((prev) => {
        if (prev >= 3) {
          clearInterval(billInterval);
          return 3;
        }
        return prev + 1;
      });
    }, 450);

    const step3Timer = setTimeout(() => {
      setDispenseProgress('COLLECT');
      sounds.playAuthSuccess();
    }, 2800);

    const completeTimer = setTimeout(() => {
      setDispenseProgress('COMPLETE');
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        setTimeout(() => {
          onDispenseCompleteRef.current();
        }, 800);
      }
    }, 3600);

    return () => {
      clearInterval(interval);
      clearTimeout(step2Timer);
      clearInterval(billInterval);
      clearTimeout(step3Timer);
      clearTimeout(completeTimer);
    };
  }, [amount]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center max-w-xl mx-auto py-6 px-4 text-center font-sans"
    >
      {/* Express badge if pre-staged */}
      {isExpress && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] text-[#B5935A] text-[10px] font-mono tracking-[0.14em] uppercase font-semibold mb-3 shadow-warm-xs"
        >
          <Zap className="w-3.5 h-3.5 text-[#B5935A] fill-[#B5935A]" />
          <span>Express Pre-Staged Dispense</span>
        </motion.div>
      )}

      {/* Status Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FCFBF8] border border-[#E6E0D4] text-xs font-mono font-medium text-[#171715] mb-4 shadow-warm-xs">
        <span className="w-2 h-2 rounded-full bg-[#155E43] animate-pulse" />
        <span>
          {dispenseProgress === 'COUNTING' && 'COUNTING SECURED BANKNOTES...'}
          {dispenseProgress === 'DISPENSING' && 'DISPENSING BANKNOTES...'}
          {(dispenseProgress === 'COLLECT' || dispenseProgress === 'COMPLETE') && 'PLEASE COLLECT YOUR BANKNOTES'}
        </span>
      </div>

      {/* Live Rolling Currency Counter in Editorial Serif */}
      <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-[#171715] tracking-tight">
        Dispensing <span className="tabular-nums text-[#155E43]">₹{rollingAmount.toLocaleString('en-IN')}</span>
      </h2>
      <p className="text-[#666156] text-xs mt-1.5 font-sans">
        Mechanical dispenser active. Banknotes are emerging from the secured tray below.
      </p>

      {/* ATM Dispenser Slot Housing (Swiss Architectural Styling) */}
      <div className="w-full max-w-md mt-6 p-6 rounded-2xl bg-[#FCFBF8] border border-[#E6E0D4] shadow-warm-md relative">
        {/* Housing Header */}
        <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#666156] mb-3 px-1">
          <span className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              dispenseProgress === 'COLLECT' || dispenseProgress === 'COMPLETE'
                ? 'bg-[#155E43] shadow-[0_0_8px_#155E43]'
                : 'bg-[#B5935A] animate-pulse'
            }`} />
            <span className="font-semibold text-[#171715] uppercase text-[10px]">Concierge Dispenser Tray</span>
          </span>
          <span className="text-[10px] font-mono text-[#9A9386]">
            COUNT: <strong className="text-[#171715] font-bold">{billsCount} NOTES</strong>
          </span>
        </div>

        {/* Brushed Metallic Bronze/Slate Slot Housing */}
        <div className="w-full h-36 bg-gradient-to-b from-[#E6E0D4] via-[#F5F2EB] to-[#E6E0D4] rounded-xl p-3 border border-[#D8D2C5] shadow-inner flex flex-col justify-center relative overflow-hidden">
          {/* Recessed Dark Horizontal Slot */}
          <div className="w-full h-20 bg-[#171715] rounded-lg relative overflow-hidden shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] flex items-center justify-center">
            {/* Subtle Champagne Gold Guide Line */}
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#B5935A]/60" />

            {/* Stylized Currency Notes Sliding Out Downward */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <AnimatePresence>
                {billsCount >= 1 && (
                  <motion.div
                    key="bill-1"
                    initial={{ y: -60, scale: 0.92, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1, rotate: -1.5 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 180 }}
                    className="absolute w-64 h-12 rounded-md bg-[#FAF8F3] border border-[#B5935A] shadow-md flex items-center justify-between px-4 text-[#171715] font-mono text-xs z-10"
                  >
                    <span className="font-bold text-[#102A22]">₹500</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#666156] font-sans font-semibold">Reserve Bank of India</span>
                    <span className="font-bold text-[#102A22]">₹500</span>
                  </motion.div>
                )}

                {billsCount >= 2 && (
                  <motion.div
                    key="bill-2"
                    initial={{ y: -60, scale: 0.92, opacity: 0 }}
                    animate={{ y: 6, scale: 1, opacity: 1, rotate: 1 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 0.08 }}
                    className="absolute w-64 h-12 rounded-md bg-[#FAF8F3] border border-[#B5935A] shadow-lg flex items-center justify-between px-4 text-[#171715] font-mono text-xs z-20"
                  >
                    <span className="font-bold text-[#102A22]">₹500</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#666156] font-sans font-semibold">Reserve Bank of India</span>
                    <span className="font-bold text-[#102A22]">₹500</span>
                  </motion.div>
                )}

                {billsCount >= 3 && (
                  <motion.div
                    key="bill-3"
                    initial={{ y: -60, scale: 0.92, opacity: 0 }}
                    animate={{ y: 12, scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 180, delay: 0.08 }}
                    className="absolute w-64 h-12 rounded-md bg-[#FAF8F3] border border-[#B5935A] shadow-xl flex items-center justify-between px-4 text-[#171715] font-mono text-xs z-30"
                  >
                    <span className="font-bold text-[#102A22]">₹500</span>
                    <span className="text-[9px] uppercase tracking-wider text-[#666156] font-sans font-semibold">Reserve Bank of India</span>
                    <span className="font-bold text-[#102A22]">₹500</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Updated Remaining Balance Confirmation Strip */}
        <div className="mt-4 pt-3 border-t border-[#E6E0D4] flex items-center justify-between text-xs text-[#666156] font-mono">
          <span>Status: <strong className="text-[#155E43] font-semibold">{dispenseProgress === 'COMPLETE' ? 'DISPENSED' : 'PROCESSING'}</strong></span>
          {typeof newBalance === 'number' && (
            <span>Updated Reserves: <strong className="text-[#171715] tabular-nums font-bold">₹{newBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
