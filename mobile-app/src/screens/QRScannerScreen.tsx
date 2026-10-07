import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Scan, Camera, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { MobileUser, ScannedSession } from '../types';
import { mobileApi } from '../services/api';

interface QRScannerScreenProps {
  user: MobileUser;
  onScanSuccess: (session: ScannedSession) => void;
  onBack: () => void;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({
  user,
  onScanSuccess,
  onBack,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.warn('Camera stream error:', err);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleProcessPayload = async (rawPayload: string) => {
    try {
      setLoading(true);
      setError(null);

      let sessionId = rawPayload.trim();
      let kioskId = 'KIOSK-NYC-01';

      if (rawPayload.includes('id=')) {
        const urlParams = new URLSearchParams(rawPayload.split('?')[1]);
        sessionId = urlParams.get('id') || sessionId;
        kioskId = urlParams.get('kiosk') || kioskId;
      }

      await mobileApi.scanSessionQR(sessionId, user.id, 'Mobile Expo Client');
      onScanSuccess({ sessionId, kioskId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid session QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoScanLatestSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kiosk_id: 'KIOSK-NYC-01' }),
      });
      const data = await res.json();
      await handleProcessPayload(data.qr_payload);
    } catch (e: unknown) {
      setError('Could not connect to ATM backend');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <div>
        <div className="flex items-center justify-between pt-2 mb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-slate-800">Scan ATM QR Code</h2>
          <div className="w-9" />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Viewfinder Frame */}
        <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-3xl bg-slate-900 overflow-hidden shadow-lg flex items-center justify-center my-4">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Viewfinder Target Reticle */}
          <div className="absolute inset-8 border-2 border-white/70 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
            <div className="flex justify-between">
              <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400" />
              <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400" />
            </div>
            <div className="flex justify-between">
              <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400" />
              <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400" />
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 max-w-xs mx-auto">
          Point your camera at the dynamic QR code displayed on the ATM screen.
        </p>

        {/* Quick Simulator Scan Action */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={handleAutoScanLatestSession}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Linking ATM Session...</span>
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                <span>Simulate / Scan ATM Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Code Input Option */}
      <div className="pt-4 border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode) handleProcessPayload(manualCode);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Or enter session UUID..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
          >
            Link
          </button>
        </form>
      </div>
    </div>
  );
};
