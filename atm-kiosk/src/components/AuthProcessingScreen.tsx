import React from 'react';
import { Fingerprint, CheckCircle2, Shield, RefreshCw } from 'lucide-react';

interface AuthProcessingProps {
  step: 'MOBILE_SCANNED' | 'BIOMETRIC_VERIFYING';
  userName?: string;
  onCancel?: () => void;
}

export const AuthProcessingScreen: React.FC<AuthProcessingProps> = ({
  step,
  userName,
  onCancel,
}) => {
  return (
    <div className="flex flex-col items-center justify-center max-w-xl mx-auto py-10 px-4 text-center">
      {/* Visual ring */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center relative shadow-sm">
          {step === 'MOBILE_SCANNED' ? (
            <Fingerprint className="w-12 h-12 text-blue-600 animate-pulse" />
          ) : (
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        {step === 'MOBILE_SCANNED'
          ? 'Mobile Device Connected'
          : 'Verifying Security Credentials'}
      </h2>

      <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
        {step === 'MOBILE_SCANNED'
          ? `Connected to ${userName || 'your device'}. Please complete biometric verification on your phone.`
          : 'Verifying live selfie against registered account profile...'}
      </p>

      {/* Progress Cards */}
      <div className="w-full max-w-md mt-6 space-y-2.5 text-left">
        {/* Step 1 */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">1. QR Code Paired</p>
              <p className="text-[11px] text-slate-500">Encrypted token verified</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            PASSED
          </span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3">
            {step === 'MOBILE_SCANNED' ? (
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold text-slate-900">2. Device Biometrics</p>
              <p className="text-[11px] text-slate-500">
                {step === 'MOBILE_SCANNED' ? 'Waiting for fingerprint / touch on phone...' : 'Hardware fingerprint authenticated'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
            step === 'MOBILE_SCANNED'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {step === 'MOBILE_SCANNED' ? 'IN PROGRESS' : 'VERIFIED'}
          </span>
        </div>

        {/* Step 3 */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3">
            {step === 'BIOMETRIC_VERIFYING' ? (
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            ) : (
              <Shield className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <div>
              <p className="text-xs font-bold text-slate-900">3. Biometric Facial Verification</p>
              <p className="text-[11px] text-slate-500">Matching live selfie with account baseline</p>
            </div>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
            step === 'BIOMETRIC_VERIFYING'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-slate-50 text-slate-500 border-slate-200'
          }`}>
            {step === 'BIOMETRIC_VERIFYING' ? 'VERIFYING' : 'QUEUED'}
          </span>
        </div>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-6 text-xs text-slate-500 hover:text-slate-800 transition"
        >
          Cancel Session
        </button>
      )}
    </div>
  );
};
