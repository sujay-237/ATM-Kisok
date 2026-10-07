import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight, Receipt, Banknote, RefreshCw, Sparkles, Building2 } from 'lucide-react';
import { VerificationResult, ScannedSession, MobileUser } from '../types';
import { getApiBase } from '../services/api';

interface SuccessScreenProps {
  result: VerificationResult;
  session?: ScannedSession | null;
  user?: MobileUser | null;
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
  onFinish,
}) => {
  const [dispensedTx, setDispensedTx] = useState<CompletedTransaction | null>(null);
  const [waitingForKiosk, setWaitingForKiosk] = useState<boolean>(true);

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
          // Cash dispense finished at ATM kiosk
          if (isSubscribed) {
            setDispensedTx({
              id: data.transaction?.id || `TXN-${session.sessionId.slice(0, 8).toUpperCase()}`,
              amount: data.transaction?.amount || 1000,
              remaining_balance: data.transaction?.remaining_balance ?? (user ? user.account_balance - 1000 : 24000.23),
              timestamp: data.transaction?.created_at || new Date().toISOString(),
              terminal: session.kioskId || 'KIOSK-EAST-01',
            });
            setWaitingForKiosk(false);
          }
        }
      } catch {
        // Silently retry on next tick
      }
    }, 1200);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [session?.sessionId, session?.kioskId, user]);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900 text-center animate-fade-in select-none">
      {/* If cash was dispensed at the ATM, show the Transaction Successful receipt screen */}
      {dispensedTx ? (
        <>
          <div className="pt-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-sm animate-bounce">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 mb-1">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cash Dispensed Successfully</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Transaction Successful
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Please take your cash from the ATM tray.
            </p>
          </div>

          {/* Digital Receipt Card */}
          <div className="my-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-slate-600" />
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">ATM Cash Receipt</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                COMPLETED
              </span>
            </div>

            <div className="py-4 text-center border-b border-slate-200/80">
              <p className="text-[11px] uppercase font-bold text-slate-400">Amount Dispensed</p>
              <p className="text-3xl font-mono font-extrabold text-slate-900 mt-0.5">
                ₹{dispensedTx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Indian Rupees (INR)</p>
            </div>

            <div className="pt-3 space-y-2 text-xs font-mono text-slate-600">
              <div className="flex justify-between">
                <span>Account Holder:</span>
                <span className="font-semibold text-slate-900">{user?.full_name || 'Sujay Lokhande'}</span>
              </div>
              <div className="flex justify-between">
                <span>ATM Terminal:</span>
                <span className="font-semibold text-slate-800">{dispensedTx.terminal}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="text-slate-800">{dispensedTx.id.slice(0, 16)}...</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining Balance:</span>
                <span className="font-bold text-slate-900">
                  ₹{dispensedTx.remaining_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span className="text-[11px] text-slate-500">{new Date(dispensedTx.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onFinish}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Back to Home</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        /* While waiting for user to select amount on ATM kiosk */
        <>
          <div className="pt-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-3">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Authorization Approved
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Your biometric identity was verified. Look at the ATM screen to choose your withdrawal amount.
            </p>
          </div>

          {/* Verification Details */}
          <div className="my-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">ATM Terminal:</span>
              <span className="font-semibold text-slate-800 font-mono">{session?.kioskId || 'KIOSK-EAST-01'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">AI Match Confidence:</span>
              <span className="font-bold text-emerald-600 font-mono">
                {Math.round(result.confidence * 100)}% Match
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500">Liveness Check:</span>
              <span className="font-semibold text-emerald-600 font-mono">PASSED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Verification Engine:</span>
              <span className="font-medium text-slate-700 font-mono">Google Gemini Vision</span>
            </div>

            {/* Waiting for Cash Dispense Pill */}
            <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <div className="text-left">
                <p className="font-bold">Awaiting Cash Dispense on ATM</p>
                <p className="text-[11px] text-blue-700">Select withdrawal amount on the kiosk screen.</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                // Allows immediate receipt preview if user wants
                setDispensedTx({
                  id: `TXN-${(session?.sessionId || '101').slice(0, 8).toUpperCase()}`,
                  amount: 1000,
                  remaining_balance: user ? user.account_balance - 1000 : 24000.23,
                  timestamp: new Date().toISOString(),
                  terminal: session?.kioskId || 'KIOSK-EAST-01',
                });
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition flex items-center justify-center gap-1.5"
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>Simulate Cash Dispense (₹1,000)</span>
            </button>

            <button
              type="button"
              onClick={onFinish}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Done</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
export default SuccessScreen;
