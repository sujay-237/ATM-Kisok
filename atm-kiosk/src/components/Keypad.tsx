import React from 'react';
import { Delete, CornerDownLeft, X } from 'lucide-react';
import { sounds } from '../utils/sound';

interface KeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter: () => void;
  disabled?: boolean;
}

export const Keypad: React.FC<KeypadProps> = ({
  onDigit,
  onBackspace,
  onClear,
  onEnter,
  disabled = false,
}) => {
  const handleKeyClick = (action: () => void) => {
    if (disabled) return;
    sounds.playKeypadBeep();
    action();
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-100 border border-slate-300 shadow-inner max-w-xs mx-auto">
      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => handleKeyClick(() => onDigit(key))}
            className="atm-keypad-btn h-14 rounded-xl text-xl font-bold font-mono flex items-center justify-center transition"
          >
            {key}
          </button>
        ))}

        {/* Clear Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleKeyClick(onClear)}
          className="atm-keypad-btn h-14 rounded-xl text-xs font-bold uppercase text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 flex flex-col items-center justify-center transition"
          title="Clear"
        >
          <X className="w-4 h-4 mb-0.5" />
          <span>Clear</span>
        </button>

        {/* Zero */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleKeyClick(() => onDigit('0'))}
          className="atm-keypad-btn h-14 rounded-xl text-xl font-bold font-mono flex items-center justify-center transition"
        >
          0
        </button>

        {/* Backspace */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleKeyClick(onBackspace)}
          className="atm-keypad-btn h-14 rounded-xl text-xs font-bold uppercase text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300 flex flex-col items-center justify-center transition"
          title="Delete"
        >
          <Delete className="w-4 h-4 mb-0.5" />
          <span>Del</span>
        </button>
      </div>

      {/* Enter Action */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleKeyClick(onEnter)}
        className="w-full mt-3 h-12 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
      >
        <CornerDownLeft className="w-4 h-4" />
        <span>Confirm Amount</span>
      </button>
    </div>
  );
};
