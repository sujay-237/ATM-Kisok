import React from 'react';
import { Fingerprint, CheckCircle2, RefreshCw, ShieldCheck, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center max-w-lg mx-auto py-8 px-4 text-center"
    >
      {/* Calm Concentric Ripple Rings in Champagne Gold & Soft Emerald */}
      <div className="relative mb-8 flex items-center justify-center w-36 h-36">
        <motion.div
          animate={{ scale: [1, 1.4, 1.6], opacity: [0.35, 0.12, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border border-[#B5935A]/40 bg-[#F4EFE4]/30 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.25, 1.4], opacity: [0.45, 0.18, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, delay: 0.6, ease: "easeOut" }}
          className="absolute inset-2 rounded-full border border-[#155E43]/30 bg-[#EBF5F0]/40 pointer-events-none"
        />

        {/* Central Core Circle */}
        <div className="w-20 h-20 rounded-full bg-[#FCFBF8] border border-[#E6E0D4] shadow-warm-sm flex items-center justify-center relative z-10">
          {step === 'MOBILE_SCANNED' ? (
            <motion.div
              animate={{ scale: [0.95, 1.05, 0.95] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Fingerprint className="w-10 h-10 text-[#102A22]" />
            </motion.div>
          ) : (
            <motion.div
              animate={{ scale: [0.96, 1.04, 0.96] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            >
              <Camera className="w-9 h-9 text-[#B5935A]" />
            </motion.div>
          )}
        </div>
      </div>

      <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#171715] tracking-tight">
        {step === 'MOBILE_SCANNED'
          ? 'Device Paired • Authenticating'
          : 'Verifying Security Protocol'}
      </h2>

      <p className="text-[#666156] text-xs sm:text-sm mt-2 max-w-md mx-auto font-sans leading-relaxed">
        {step === 'MOBILE_SCANNED'
          ? `Connected to ${userName || 'authorized private device'}. Please provide biometric verification on phone.`
          : 'Sentinel Secure Protocol is validating identity and verifying perimeter security integrity...'}
      </p>

      {/* Verification Steps Card - All 3 Authentication Stages */}
      <div className="w-full max-w-md mt-6 space-y-2.5 text-left">
        {/* Step 1: Cryptographic Handshake */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] shadow-warm-xs">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-[#EBF5F0] border border-[#CDE5D9] flex items-center justify-center text-[#155E43]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#171715] font-sans">1. Client Cryptographic Handshake</p>
              <p className="text-[11px] text-[#666156] font-mono">Encrypted session token validated</p>
            </div>
          </div>
          <span className="text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#EBF5F0] text-[#155E43] border border-[#CDE5D9]">
            PASSED
          </span>
        </div>

        {/* Step 2: Hardware Biometric Validation */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] shadow-warm-xs">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-[#F5F2EB] border border-[#E6E0D4] flex items-center justify-center text-[#666156]">
              {step === 'MOBILE_SCANNED' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B5935A]" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-[#155E43]" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#171715] font-sans">2. Hardware Biometric Validation</p>
              <p className="text-[11px] text-[#666156] font-mono">
                {step === 'MOBILE_SCANNED' ? 'Awaiting touch input on authorized device...' : 'Biometric identity confirmed'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
            step === 'MOBILE_SCANNED'
              ? 'bg-[#FDF6E7] text-[#9A6700] border-[#F0DFB8] animate-pulse'
              : 'bg-[#EBF5F0] text-[#155E43] border-[#CDE5D9]'
          }`}>
            {step === 'MOBILE_SCANNED' ? 'PENDING' : 'VERIFIED'}
          </span>
        </div>

        {/* Step 3: Facial Identity Verification & Threat Surveillance */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] shadow-warm-xs">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-[#F5F2EB] border border-[#E6E0D4] flex items-center justify-center text-[#666156]">
              {step === 'MOBILE_SCANNED' ? (
                <Camera className="w-4 h-4 text-[#9A9386]" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B5935A]" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#171715] font-sans">3. Facial Identity & Perimeter Scan</p>
              <p className="text-[11px] text-[#666156] font-mono">
                {step === 'MOBILE_SCANNED'
                  ? 'Awaiting camera capture on authorized device...'
                  : 'Validating live biometric scan & perimeter security...'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full border ${
            step === 'MOBILE_SCANNED'
              ? 'bg-[#F5F2EB] text-[#9A9386] border-[#E6E0D4]'
              : 'bg-[#FDF6E7] text-[#9A6700] border-[#F0DFB8] animate-pulse'
          }`}>
            {step === 'MOBILE_SCANNED' ? 'AWAITING' : 'VALIDATING'}
          </span>
        </div>
      </div>

      {onCancel && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          className="mt-6 text-xs text-[#9A9386] hover:text-[#171715] font-mono tracking-wider uppercase transition"
        >
          Cancel Authentication
        </motion.button>
      )}
    </motion.div>
  );
};
