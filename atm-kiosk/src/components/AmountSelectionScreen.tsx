import React, { useState } from 'react';
import { IndianRupee, Wallet, Eye, EyeOff, UserCheck, AlertTriangle } from 'lucide-react';
import { KioskUser } from '../types';
import { Keypad } from './Keypad';
import { sounds } from '../utils/sound';

interface AmountSelectionScreenProps {
  user: KioskUser;
  onConfirmWithdrawal: (amount: number) => void;
  onCancel: () => void;
  loading: boolean;
  error?: string | null;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000];

export const AmountSelectionScreen: React.FC<AmountSelectionScreenProps> = ({
  user,
  onConfirmWithdrawal,
  onCancel,
  loading,
  error,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(1000);
  const [customAmountStr, setCustomAmountStr] = useState<string>('1000');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [showBalance, setShowBalance] = useState<boolean>(true);

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
      if (prev.length >= 5) return prev;
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
    <div className="max-w-4xl mx-auto py-4 px-4">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 shadow-sm mb-6">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Welcome, {user.full_name}</h2>
            <p className="text-xs text-slate-500 font-medium">Identity verified via mobile biometrics</p>
          </div>
        </div>

        {/* Balance Preview */}
        <div className="mt-3 sm:mt-0 flex items-center space-x-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
          <Wallet className="w-4 h-4 text-blue-700" />
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Checking Balance</p>
            <p className="text-base font-bold text-slate-900 font-mono">
              {showBalance ? `₹${user.account_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••••••'}
            </p>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-[11px] transition shrink-0"
          >
            Start New Session
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Fast Cash Presets */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fast Cash</h3>
            <p className="text-xs text-slate-500">Select a preset amount or type below.</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_AMOUNTS.map((amt) => {
              const isSelected = selectedPreset === amt && !isCustomMode;
              return (
                <button
                  key={amt}
                  type="button"
                  disabled={loading}
                  onClick={() => handlePresetClick(amt)}
                  className={`p-4 rounded-xl flex flex-col items-center justify-center font-mono transition border ${
                    isSelected
                      ? 'bg-blue-700 text-white font-bold border-blue-700 shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-900 font-bold border-slate-200 shadow-sm'
                  }`}
                >
                  <span className="text-[11px] opacity-70">INR</span>
                  <span className="text-xl mt-0.5">₹{amt.toLocaleString('en-IN')}</span>
                </button>
              );
            })}
          </div>

          {/* Amount Box */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Withdrawal Amount</p>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl text-slate-400 font-mono font-bold">₹</span>
                <span className="text-4xl font-mono font-bold text-slate-900 tracking-tight">
                  {customAmountStr || '0'}
                </span>
                <span className="text-xs text-slate-400 font-mono">.00</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || currentAmount <= 0}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition flex items-center gap-1.5"
              >
                <IndianRupee className="w-4 h-4 stroke-[2.5]" />
                {loading ? 'Processing...' : 'Dispense Cash'}
              </button>
            </div>
          </div>
        </div>

        {/* Tactile Keypad */}
        <div className="md:col-span-5 flex flex-col items-center">
          <div className="w-full text-center mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Numeric Keypad
            </span>
          </div>
          <Keypad
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            onClear={handleClear}
            onEnter={handleConfirm}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
};
