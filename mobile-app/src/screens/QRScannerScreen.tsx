import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { ArrowLeft, Scan, Camera, AlertCircle, RefreshCw, QrCode, CheckCircle2, Zap } from 'lucide-react';
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
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(true);

  const handleProcessPayload = useCallback(async (rawPayload: string) => {
    try {
      setLoading(true);
      setError(null);

      let sessionId = rawPayload.trim();
      let kioskId = 'KIOSK-EAST-01';

      // Parse atm://session?id=...&kiosk=...
      if (rawPayload.includes('id=')) {
        const queryPart = rawPayload.includes('?') ? rawPayload.split('?')[1] : rawPayload;
        const urlParams = new URLSearchParams(queryPart);
        sessionId = urlParams.get('id') || sessionId;
        kioskId = urlParams.get('kiosk') || kioskId;
      } else {
        // Try extracting standard UUID
        const uuidMatch = rawPayload.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
        if (uuidMatch) {
          sessionId = uuidMatch[0];
        }
      }

      setScannedFeedback(`Session Linked: ${sessionId.slice(0, 8)}...`);

      // Notify backend that mobile device paired with this kiosk session
      await mobileApi.scanSessionQR(sessionId, user.id, 'Mobile Android App');

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      setTimeout(() => {
        onScanSuccess({ sessionId, kioskId });
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid session QR code.');
      isScanningRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [user.id, onScanSuccess]);

  // Frame scanner loop
  const scanLoop = useCallback(() => {
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Real-time QR decoding with jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && code.data.trim()) {
            console.log('[QR Scanner] Detected QR payload:', code.data);
            isScanningRef.current = false;
            handleProcessPayload(code.data);
            return;
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanLoop);
  }, [handleProcessPayload]);

  useEffect(() => {
    isScanningRef.current = true;
    let localStream: MediaStream | null = null;

    navigator.mediaDevices?.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
      .then((s) => {
        localStream = s;
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().then(() => {
            setCameraActive(true);
            animationFrameRef.current = requestAnimationFrame(scanLoop);
          }).catch(console.warn);
        }
      })
      .catch((err) => {
        console.warn('Camera stream error:', err);
        setCameraActive(false);
      });

    return () => {
      isScanningRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scanLoop]);

  // Connects to the active live session displayed on the ATM screen
  const handlePairWithActiveATM = async () => {
    try {
      setLoading(true);
      setError(null);
      isScanningRef.current = false;
      const activeSession = await mobileApi.getActiveKioskSession('KIOSK-EAST-01');
      if (activeSession && activeSession.session_id) {
        await handleProcessPayload(activeSession.session_id);
      } else {
        throw new Error('No active ATM session found on the kiosk.');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || 'Could not connect to active ATM screen.');
      isScanningRef.current = true;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-slate-50 text-slate-900">
      {/* Top Bar */}
      <div>
        <div className="flex items-center justify-between pt-2 mb-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-bold text-slate-800">Scan ATM QR Code</h2>
            <p className="text-[10px] text-slate-500 font-mono">Live Hardware Scanner</p>
          </div>
          <div className="w-9" />
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {scannedFeedback && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{scannedFeedback}</span>
          </div>
        )}

        {/* Live Camera Viewfinder */}
        <div className="relative aspect-square w-full max-w-[270px] mx-auto rounded-3xl bg-slate-950 overflow-hidden shadow-xl flex items-center justify-center my-3 border-2 border-slate-800">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Animated Laser Scanning Line */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
          </div>

          {/* Viewfinder Bounding Corners */}
          <div className="absolute inset-6 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
            <div className="flex justify-between">
              <div className="w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl" />
              <div className="w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr" />
            </div>
            <div className="flex justify-between">
              <div className="w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl" />
              <div className="w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br" />
            </div>
          </div>

          {!cameraActive && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs text-white font-medium">Starting Camera...</p>
              <p className="text-[10px] text-slate-400 mt-1">Please allow camera permissions</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 max-w-xs mx-auto">
          Hold your phone steady and point camera at the QR code on the ATM kiosk display.
        </p>

        {/* 1-Tap Link to Active ATM Screen */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handlePairWithActiveATM}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Linking Active ATM Screen...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Pair with Active ATM Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Code Input Option */}
      <div className="pt-3 border-t border-slate-200">
        <p className="text-[11px] text-slate-500 font-medium mb-1.5 text-center">
          Or Enter Session UUID Code:
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) handleProcessPayload(manualCode.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="e.g. 8e98444c..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
          >
            Link
          </button>
        </form>
      </div>
    </div>
  );
};
