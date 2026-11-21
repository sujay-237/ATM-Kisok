import React, { useState } from 'react';
import { Wallet, Eye, EyeOff, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { KioskUser } from '../types';
import { Keypad } from './Keypad';
import { sounds } from '../utils/sound';

interface AmountSelectionScreenProps {
  user: KioskUser;
  onConfirmWithdrawal: (amount: number, pin?: string, isDuress?: boolean) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
  shoulderSurfingDetected?: boolean;
  disguiseDetected?: boolean;
  threatReason?: string | null;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000];

export const AmountSelectionScreen: React.FC<AmountSelectionScreenProps> = ({
  user,
  onConfirmWithdrawal,
  onCancel,
  loading,
  error,
  shoulderSurfingDetected = false,
  disguiseDetected = false,
  threatReason,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('1000');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [showBalance, setShowBalance] = useState<boolean>(true);

  // Feature 3: Privacy Shield Mode
  const initialThreat = Boolean(shoulderSurfingDetected || disguiseDetected);
  const [privacyShieldActive, setPrivacyShieldActive] = useState<boolean>(initialThreat);

  const handlePresetClick = (amount: number) => {
    sounds.playKeypadBeep();
    setSelectedPreset(amount);
    setCustomAmountStr(amount.toString());
    setIsCustomMode(false);
  };

  const handleDigit = (digit: string) => {
    setIsCustomMode(true);
    setSelectedPreset(null);
    setCustomAmountStr((prev) => {
      if (prev === '0' || prev === '100') return digit;
      if (prev.length >= 6) return prev;
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setIsCustomMode(true);
    setSelectedPreset(null);
    setCustomAmountStr((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleClear = () => {
    setIsCustomMode(true);
    setSelectedPreset(null);
    setCustomAmountStr('0');
  };

  const handleConfirm = () => {
    if (loading) return;
    const val = parseFloat(customAmountStr);
    if (!isNaN(val) && val > 0) {
      sounds.playKeypadBeep();
      onConfirmWithdrawal(val);
    } else {
      sounds.playError();
    }
  };

  const currentAmount = parseFloat(customAmountStr) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mx-auto py-2 px-4"
    >
      {/* Feature 3: Privacy Shield Threat Banner (Burnished Ochre) */}
      <AnimatePresence>
        {privacyShieldActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-2xl bg-[#FDF6E7] border border-[#F0DFB8] text-[#9A6700] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-warm-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-[#9A6700]" />
              </div>
              <div>
                <p className="text-xs font-mono tracking-wider uppercase font-semibold text-[#9A6700]">
                  Surveillance Privacy Shield Active
                </p>
                <p className="text-xs text-[#666156] mt-0.5 font-sans">
                  {threatReason || (shoulderSurfingDetected ? "Perimeter sensor detected observer standing near terminal. Figures shielded." : "Camera view partially obstructed.")}
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
              onClick={() => {
                sounds.playKeypadBeep();
                setPrivacyShieldActive(false);
              }}
              className="px-4 py-2 rounded-xl bg-[#9A6700] hover:bg-[#835600] text-white font-sans font-medium text-xs transition shadow-warm-xs shrink-0 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Perimeter & Reveal</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#B5935A] font-semibold block mb-0.5">
            Concierge Cash Service
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-[#171715] tracking-tight">
            Select Withdrawal Amount
          </h2>
        </div>

        {/* User Cardless Balance Strip */}
        <div className={`p-3.5 px-5 rounded-2xl bg-[#FCFBF8] border border-[#E6E0D4] shadow-warm-xs flex items-center space-x-4 transition-all duration-300 ${
          privacyShieldActive ? 'blur-md select-none' : ''
        }`}>
          <div className="w-8 h-8 rounded-lg bg-[#EBF5F0] border border-[#CDE5D9] text-[#155E43] flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[9px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold">Available Reserves</p>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-serif font-semibold text-[#171715] tabular-nums">
                {showBalance ? `₹${(user.account_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-[#9A9386] hover:text-[#171715] p-0.5 transition"
              >
                {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs font-mono font-medium">
          {error}
        </div>
      )}

      {/* Main Grid: Preset Chips & Numeric Keypad */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${
        privacyShieldActive ? 'blur-md select-none pointer-events-none' : ''
      }`}>
        {/* Left Column: Preset Chips & Display */}
        <div className="space-y-4">
          <div className="bg-[#FCFBF8] border border-[#E6E0D4] rounded-2xl p-6 shadow-warm-xs">
            <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-2">
              Requested Banknotes (INR)
            </label>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4]">
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-serif text-[#9A9386]">₹</span>
                <span className="text-4xl font-serif font-semibold text-[#171715] tabular-nums tracking-tight">
                  {currentAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-[#666156] bg-[#FCFBF8] px-2.5 py-1 rounded-md border border-[#E6E0D4]">
                INR
              </span>
            </div>

            {/* Fast Quick Select Chips */}
            <div className="mt-5">
              <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold block mb-2.5">
                Standard Denominations
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = selectedPreset === amt && !isCustomMode;
                  return (
                    <motion.button
                      key={amt}
                      whileTap={{ scale: 0.98 }}
                      whileHover={{ y: -1 }}
                      type="button"
                      onClick={() => handlePresetClick(amt)}
                      className={`py-3 px-2 rounded-xl text-xs font-mono font-semibold transition border ${
                        isSelected
                          ? 'bg-[#102A22] text-[#FAF8F3] border-[#102A22] shadow-warm-xs'
                          : 'bg-[#FCFBF8] border-[#E6E0D4] text-[#171715] hover:border-[#B5935A] hover:bg-white'
                      }`}
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Quick Helper */}
            <div className="mt-5 pt-4 border-t border-[#E6E0D4]/70 flex items-center justify-between text-xs text-[#9A9386] font-mono">
              <span>Daily Concierge Limit: ₹50,000</span>
              <button
                type="button"
                onClick={onCancel}
                className="text-[#9F1239] hover:underline font-medium transition"
              >
                Cancel Session
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Keypad */}
        <div className="flex flex-col justify-center">
          <Keypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            onClear={handleClear}
            onEnter={handleConfirm}
            disabled={loading}
          />
        </div>
      </div>
    </motion.div>
  );
};
