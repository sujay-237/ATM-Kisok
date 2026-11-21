import React from 'react';
import { Delete, CornerDownLeft, X } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="p-6 rounded-2xl bg-[#FCFBF8] border border-[#E6E0D4] max-w-xs mx-auto shadow-warm-sm">
      <div className="grid grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
          <motion.button
            key={key}
            type="button"
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -1 }}
            disabled={disabled}
            onClick={() => handleKeyClick(() => onDigit(key))}
            className="h-12 rounded-xl text-lg font-semibold font-mono flex items-center justify-center transition disabled:opacity-40 bg-[#FCFBF8] hover:bg-white border border-[#E6E0D4] text-[#171715] hover:border-[#B5935A] shadow-warm-xs"
          >
            {key}
          </motion.button>
        ))}

        {/* Clear Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -1 }}
          disabled={disabled}
          onClick={() => handleKeyClick(onClear)}
          className="h-12 rounded-xl text-[11px] font-mono tracking-wider font-semibold uppercase text-[#9A6700] border border-[#F0DFB8] bg-[#FDF6E7] hover:bg-[#FBEFD5] flex flex-col items-center justify-center transition disabled:opacity-40 shadow-warm-xs"
          title="Clear"
        >
          <X className="w-3.5 h-3.5 mb-0.5" />
          <span>CLR</span>
        </motion.button>

        {/* Zero */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -1 }}
          disabled={disabled}
          onClick={() => handleKeyClick(() => onDigit('0'))}
          className="h-12 rounded-xl text-lg font-semibold font-mono flex items-center justify-center transition disabled:opacity-40 bg-[#FCFBF8] hover:bg-white border border-[#E6E0D4] text-[#171715] hover:border-[#B5935A] shadow-warm-xs"
        >
          0
        </motion.button>

        {/* Backspace */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          whileHover={{ y: -1 }}
          disabled={disabled}
          onClick={() => handleKeyClick(onBackspace)}
          className="h-12 rounded-xl text-[11px] font-mono tracking-wider font-semibold uppercase text-[#9F1239] border border-[#F7D1D9] bg-[#FDF2F4] hover:bg-[#FBE4E8] flex flex-col items-center justify-center transition disabled:opacity-40 shadow-warm-xs"
          title="Delete"
        >
          <Delete className="w-3.5 h-3.5 mb-0.5" />
          <span>DEL</span>
        </motion.button>
      </div>

      {/* Enter Action in Deep Forest Green */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        whileHover={{ y: -1 }}
        disabled={disabled}
        onClick={() => handleKeyClick(onEnter)}
        className="w-full mt-3.5 h-12 py-2.5 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-warm-xs transition disabled:opacity-40 border border-[#255243]/50"
      >
        <CornerDownLeft className="w-4 h-4 stroke-[2.2] text-[#B5935A]" />
        <span>Confirm Amount</span>
      </motion.button>
    </div>
  );
};
