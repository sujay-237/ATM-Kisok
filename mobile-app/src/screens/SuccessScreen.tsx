import React from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight, Building2 } from 'lucide-react';
import { VerificationResult } from '../types';

interface SuccessScreenProps {
  result: VerificationResult;
  onFinish: () => void;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ result, onFinish }) => {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900 text-center animate-fade-in">
      <div className="pt-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Authorization Approved
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Your biometric identity was confirmed. Look at the ATM screen to select your withdrawal amount.
        </p>
      </div>

      {/* Verification Details */}
      <div className="my-auto bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2 text-xs">
        <div className="flex justify-between border-b border-slate-200/80 pb-2">
          <span className="text-slate-500">ATM Terminal:</span>
          <span className="font-semibold text-slate-800 font-mono">KIOSK-NYC-01</span>
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
          <span className="font-medium text-slate-700 font-mono">Gemini Vision Multimodal</span>
        </div>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={onFinish}
          className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2"
        >
          <span>Done</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
