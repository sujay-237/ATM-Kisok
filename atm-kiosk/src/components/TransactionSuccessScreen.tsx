import React, { useEffect, useState } from 'react';
import { CheckCircle2, Receipt, ArrowRight, Printer } from 'lucide-react';
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
  const [countdown, setCountdown] = useState<number>(12);
  const [printed, setPrinted] = useState<boolean>(false);

  useEffect(() => {
    sounds.playAuthSuccess();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onFinish]);

  const handlePrint = () => {
    sounds.playKeypadBeep();
    setPrinted(true);
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 stroke-[2.5]" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Transaction Complete
      </h2>
      <p className="text-slate-500 text-xs mt-1">
        Please take your cash and receipt. Thank you for banking with us.
      </p>

      {/* Digital Receipt Card */}
      <div className="mt-6 p-6 rounded-2xl bg-white border border-slate-200 text-left shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-slate-600" />
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">ATM Cash Receipt</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            COMPLETED
          </span>
        </div>

        <div className="py-5 text-center border-b border-slate-100">
          <p className="text-[11px] uppercase font-bold text-slate-400">Cash Dispensed</p>
          <p className="text-3xl font-mono font-bold text-slate-900 mt-0.5">
            ₹{data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-400">INR</span>
          </p>
        </div>

        <div className="py-4 space-y-2 font-mono text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Account Holder:</span>
            <span className="text-slate-900 font-semibold">{user.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Transaction ID:</span>
            <span className="text-slate-800">{data.transaction_id.slice(0, 16)}...</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining Balance:</span>
            <span className="text-slate-900 font-semibold">₹{data.remaining_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span>{new Date(data.timestamp).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={handlePrint}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            printed
              ? 'bg-slate-50 border-slate-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>{printed ? 'Receipt Dispatched' : 'Print Receipt'}</span>
        </button>

        <button
          onClick={() => {
            sounds.playKeypadBeep();
            onFinish();
          }}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition"
        >
          <span>Done ({countdown}s)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
