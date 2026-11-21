import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { KioskSession } from '../types';

interface SessionQRCodeProps {
  session: KioskSession | null;
  loading: boolean;
  onRefresh: () => void;
  onSimulateMobileScan?: () => void;
}

export const SessionQRCode: React.FC<SessionQRCodeProps> = ({
  session,
  loading,
  onRefresh,
  onSimulateMobileScan,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(180);

  useEffect(() => {
    if (session?.qr_payload && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, session.qr_payload, {
        width: 230,
        margin: 1,
        color: {
          dark: '#171715',
          light: '#FFFFFF',
        },
      }, (err) => {
        if (err) console.error('QR code render error:', err);
      });
    }
  }, [session?.qr_payload]);

  useEffect(() => {
    if (!session?.expires_at) return;
    const expiryTime = new Date(session.expires_at).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.expires_at]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpiringSoon = timeLeft < 30;
  const progressRatio = Math.max(0, Math.min(1, timeLeft / 180));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center max-w-xl mx-auto py-4"
    >
      {/* Title & Help */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] text-[10px] font-mono tracking-[0.14em] uppercase text-[#B5935A] font-semibold mb-3">
          <Sparkles className="w-3 h-3 text-[#B5935A]" />
          <span>Cardless Biometric Terminal</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-[#171715] tracking-tight">
          Client Authentication
        </h2>
        <p className="text-[#666156] text-xs sm:text-sm mt-1.5 max-w-md mx-auto font-sans leading-relaxed">
          Open the Sentinel Mobile App on your authorized device and present camera to verify identity.
        </p>
      </div>

      {/* Main QR Card with Warm Ivory & Champagne Gold Corners */}
      <div className="w-full max-w-sm bg-[#FCFBF8] border border-[#E6E0D4] rounded-3xl p-7 flex flex-col items-center relative shadow-warm-lg">
        {/* Decorative Delicate Corner Accents */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#B5935A]/50 rounded-tl-sm pointer-events-none" />
        <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#B5935A]/50 rounded-tr-sm pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#B5935A]/50 rounded-bl-sm pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#B5935A]/50 rounded-br-sm pointer-events-none" />

        {/* QR Code Container with Gold Border Frame */}
        <div className="p-3.5 bg-white border border-[#E6E0D4] rounded-2xl flex items-center justify-center shadow-inner relative">
          {loading ? (
            <div className="w-[230px] h-[230px] flex flex-col items-center justify-center gap-2 text-[#9A9386]">
              <RefreshCw className="w-7 h-7 animate-spin text-[#B5935A]" />
              <span className="text-xs font-mono tracking-wider">GENERATING KEY...</span>
            </div>
          ) : (
            <canvas ref={canvasRef} className="rounded-lg" />
          )}
        </div>

        {/* Expiry Progress Bar */}
        <div className="w-full mt-6">
          <div className="flex items-center justify-between text-[11px] font-mono tracking-wider text-[#666156] mb-1.5">
            <span className="uppercase text-[10px]">Session Key Validity</span>
            <span className={`tabular-nums font-semibold ${isExpiringSoon ? 'text-[#9F1239]' : 'text-[#171715]'}`}>
              {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#E6E0D4]/70 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full transition-all duration-1000 ${
                isExpiringSoon ? 'bg-[#9F1239]' : 'bg-[#102A22]'
              }`}
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full mt-6 flex gap-2.5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ y: -1 }}
            type="button"
            onClick={onRefresh}
            className="flex-1 py-2.5 px-3 rounded-xl border border-[#E6E0D4] bg-[#F5F2EB] hover:bg-white text-[#171715] font-sans font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-warm-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#666156]" />
            <span>Regenerate Key</span>
          </motion.button>

          {onSimulateMobileScan && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={{ y: -1 }}
              type="button"
              onClick={onSimulateMobileScan}
              className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs flex items-center justify-center gap-1.5 transition shadow-warm-xs border border-[#255243]/50"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#B5935A]" />
              <span>Simulate Scan</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Steps Pill */}
      <div className="mt-7 flex items-center gap-3 text-xs text-[#666156] font-sans">
        <span className="flex items-center gap-1.5 font-medium text-[#171715]">
          <span className="w-5 h-5 rounded-full bg-[#102A22] text-[#FAF8F3] text-[10px] font-mono font-bold flex items-center justify-center">1</span>
          Scan Key
        </span>
        <span className="text-[#D8D2C5]">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#E6E0D4] text-[#666156] text-[10px] font-mono font-bold flex items-center justify-center">2</span>
          Touch Biometric
        </span>
        <span className="text-[#D8D2C5]">→</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#E6E0D4] text-[#666156] text-[10px] font-mono font-bold flex items-center justify-center">3</span>
          Collect Banknotes
        </span>
      </div>
    </motion.div>
  );
};
