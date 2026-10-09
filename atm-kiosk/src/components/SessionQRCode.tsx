import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Smartphone, RefreshCw, AlertCircle, Fingerprint, Camera } from 'lucide-react';
import { KioskSession } from '../types';
import { sounds } from '../utils/sound';

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
        width: 250,
        margin: 2,
        color: {
          dark: '#0f172a', // Deep slate black
          light: '#ffffff', // Crisp pure white
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

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto py-6">
      {/* Title & Help */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Cardless ATM Access
        </h2>
        <p className="text-slate-600 text-sm mt-1 max-w-md mx-auto">
          Scan the QR code with your mobile banking app to verify your identity and withdraw cash securely.
        </p>
      </div>

      {/* Main QR Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-md flex flex-col items-center">
        {/* QR Code Container */}
        <div className="relative p-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center min-w-[260px] min-h-[260px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-slate-600 text-xs font-medium">Generating Session...</p>
            </div>
          ) : (
            <canvas ref={canvasRef} className="rounded-lg" />
          )}

          {timeLeft === 0 && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
              <p className="text-slate-900 font-bold text-sm">QR Code Expired</p>
              <p className="text-slate-500 text-xs mt-1 mb-3">Session expired for your security.</p>
              <button
                onClick={() => {
                  sounds.playKeypadBeep();
                  onRefresh();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh QR Code
              </button>
            </div>
          )}
        </div>

        {/* Expiry Bar */}
        <div className="mt-5 flex items-center justify-between w-full px-1 text-xs text-slate-500 font-medium">
          <span>Session Token: <strong className="text-slate-700 font-mono">{session?.session_id ? `${session.session_id.slice(0, 8)}...` : '---'}</strong></span>
          <span className={`px-2 py-0.5 rounded font-mono ${isExpiringSoon ? 'bg-rose-50 text-rose-600 font-bold' : 'text-slate-600'}`}>
            Expires: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </span>
        </div>

        {/* 3 Steps Guide */}
        <div className="grid grid-cols-3 gap-2.5 w-full mt-6 pt-5 border-t border-slate-100 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <Smartphone className="w-4 h-4 text-blue-600 mb-1" />
            <span className="text-[11px] font-semibold text-slate-800">1. Open App</span>
            <span className="text-[10px] text-slate-500">Scan QR Code</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <Fingerprint className="w-4 h-4 text-blue-600 mb-1" />
            <span className="text-[11px] font-semibold text-slate-800">2. Fingerprint</span>
            <span className="text-[10px] text-slate-500">Verify Device</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <Camera className="w-4 h-4 text-blue-600 mb-1" />
            <span className="text-[11px] font-semibold text-slate-800">3. Live Selfie</span>
            <span className="text-[10px] text-slate-500">Face Match</span>
          </div>
        </div>
      </div>

      {/* Simulator Shortcut for convenient demoing */}
      {onSimulateMobileScan && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playKeypadBeep();
              onSimulateMobileScan();
            }}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-xl flex items-center gap-2 shadow-sm transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulate Mobile Scan & Biometrics</span>
          </button>
          <button
            onClick={() => {
              sounds.playKeypadBeep();
              onRefresh();
            }}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition shadow-sm"
            title="Refresh QR"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
