import React, { useEffect, useState, useRef } from 'react';
import { Banknote } from 'lucide-react';
import { sounds } from '../utils/sound';

interface CashDispenserProps {
  amount: number;
  onDispenseComplete: () => void;
}

export const CashDispenser: React.FC<CashDispenserProps> = ({
  amount,
  onDispenseComplete,
}) => {
  const [shutterOpen, setShutterOpen] = useState(false);
  const [billsCount, setBillsCount] = useState(0);
  const onDispenseCompleteRef = useRef(onDispenseComplete);
  onDispenseCompleteRef.current = onDispenseComplete;
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    sounds.playCashDispenser();

    const openTimer = setTimeout(() => {
      setShutterOpen(true);
    }, 700);

    const countTimer = setInterval(() => {
      setBillsCount((prev) => {
        if (prev >= 4) {
          clearInterval(countTimer);
          return 4;
        }
        return prev + 1;
      });
    }, 300);

    const completeTimer = setTimeout(() => {
      if (!hasFinishedRef.current) {
        hasFinishedRef.current = true;
        sounds.playAuthSuccess();
        console.log('[CashDispenser] Dispense animation complete. Switching to receipt page...');
        onDispenseCompleteRef.current();
      }
    }, 3600);

    return () => {
      clearTimeout(openTimer);
      clearInterval(countTimer);
      clearTimeout(completeTimer);
    };
  }, [amount]);

  return (
    <div className="flex flex-col items-center justify-center max-w-lg mx-auto py-10 px-4 text-center">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
        <Banknote className="w-4 h-4 text-emerald-600" />
        Dispensing Cash
      </div>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Dispensing ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </h2>
      <p className="text-slate-500 text-xs mt-1">Please retrieve your notes from the cash tray below.</p>

      {/* ATM Cash Tray Chassis */}
      <div className="w-full max-w-md mt-6 p-6 rounded-3xl bg-slate-100 border border-slate-300 shadow-md relative overflow-hidden">
        {/* Shutter door */}
        <div className="w-full h-24 bg-slate-900 rounded-xl relative flex items-center justify-center overflow-hidden shadow-inner">
          <div
            className={`absolute inset-0 bg-slate-700 transition-transform duration-700 ease-in-out border-b-2 border-emerald-400 ${
              shutterOpen ? '-translate-y-full' : 'translate-y-0'
            }`}
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-300">
                AUTOMATED CASH SHUTTER
              </span>
            </div>
          </div>

          {/* Bills */}
          {shutterOpen && (
            <div className="relative flex items-center justify-center animate-bounce">
              <div className="w-56 h-12 bg-emerald-700 rounded shadow-lg border border-emerald-400 flex items-center justify-between px-4 text-white font-bold tracking-wider">
                <span className="text-sm font-mono">₹500</span>
                <span className="text-[10px] font-mono uppercase bg-emerald-900 px-2 py-0.5 rounded">
                  RESERVE BANK OF INDIA
                </span>
                <span className="text-sm font-mono">₹500</span>
              </div>
            </div>
          )}

          {/* Green illumination light */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-400" />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500 px-1">
          <span>Tray Status: <strong className="text-slate-800">{shutterOpen ? 'OPEN' : 'READY'}</strong></span>
          <span>Notes Count: <strong className="text-slate-800">{billsCount}</strong></span>
        </div>
      </div>
    </div>
  );
};
