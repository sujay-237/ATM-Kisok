import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, AlertCircle, RefreshCw, CheckCircle2, Zap } from 'lucide-react';
import { MobileUser, ScannedSession } from '../types';
import { mobileApi } from '../services/api';
import { NativeBiometricAuth, isNativeAndroidApp } from '../services/biometric';

interface QRScannerScreenProps {
  user: MobileUser;
  prestagedAmount: number | null;
  onScanSuccess: (session: ScannedSession) => void;
  onBack: () => void;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({
  user,
  prestagedAmount,
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

      if (rawPayload.includes('id=')) {
        const queryPart = rawPayload.includes('?') ? rawPayload.split('?')[1] : rawPayload;
        const urlParams = new URLSearchParams(queryPart);
        sessionId = urlParams.get('id') || sessionId;
        kioskId = urlParams.get('kiosk') || kioskId;
      } else {
        const uuidMatch = rawPayload.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
        if (uuidMatch) {
          sessionId = uuidMatch[0];
        }
      }

      setScannedFeedback(`Key Verified: ${sessionId.slice(0, 8)}...`);

      await mobileApi.scanSessionQR(sessionId, user.id, 'Mobile Android App', prestagedAmount);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setTimeout(() => {
        onScanSuccess({ sessionId, kioskId, prestaged_amount: prestagedAmount });
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid session key.');
      isScanningRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [user.id, prestagedAmount, onScanSuccess]);

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

          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data && code.data.trim()) {
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

    const startCamera = async () => {
      if (isNativeAndroidApp()) {
        try {
          await NativeBiometricAuth.requestCameraPermission();
        } catch (e) {
          console.warn('Native camera permission error:', e);
        }
      }

      let s: MediaStream | null = null;
      try {
        s = await navigator.mediaDevices?.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch (e1) {
        console.warn('Environment facing camera failed, falling back to any camera:', e1);
        try {
          s = await navigator.mediaDevices?.getUserMedia({ video: true });
        } catch (e2) {
          console.warn('All camera constraints failed:', e2);
          setCameraActive(false);
          return;
        }
      }

      if (s) {
        localStream = s;
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          videoRef.current.muted = true;
          videoRef.current.play().then(() => {
            setCameraActive(true);
            animationFrameRef.current = requestAnimationFrame(scanLoop);
          }).catch(console.warn);
        }
      }
    };

    startCamera();

    return () => {
      isScanningRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (localStream) {
        (localStream as MediaStream).getTracks().forEach((track) => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [scanLoop]);

  const handlePairWithActiveATM = async () => {
    try {
      setLoading(true);
      setError(null);
      isScanningRef.current = false;
      const activeSession = await mobileApi.getActiveKioskSession('KIOSK-EAST-01');
      if (activeSession && activeSession.session_id) {
        await handleProcessPayload(activeSession.session_id);
      } else {
        throw new Error('No active session found on the concierge terminal.');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || 'Could not connect to active concierge terminal.');
      isScanningRef.current = true;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-[#F5F2EB] text-[#171715] font-sans antialiased">
      {/* Top Bar */}
      <div>
        <div className="flex items-center justify-between pt-1 mb-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onBack}
            className="p-2 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] transition shadow-warm-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="text-center">
            <h2 className="text-base font-serif font-semibold text-[#171715]">Scan Concierge Key</h2>
            <p className="text-[10px] text-[#9A9386] font-mono tracking-wider uppercase">Dynamic Terminal Pairing</p>
          </div>
          <div className="w-9" />
        </div>

        {/* Feature 1: Express Pre-staged Pill Banner */}
        {prestagedAmount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-3 px-3 py-1.5 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] text-[#B5935A] text-xs flex items-center justify-center gap-1.5 font-mono shadow-warm-xs font-semibold"
          >
            <Zap className="w-3.5 h-3.5 text-[#B5935A] fill-[#B5935A]" />
            <span>Express ₹{prestagedAmount.toLocaleString()} Pre-Staged</span>
          </motion.div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
            <span>{error}</span>
          </div>
        )}

        {scannedFeedback && (
          <div className="mb-3 p-3 rounded-xl bg-[#EBF5F0] border border-[#CDE5D9] text-[#155E43] text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#155E43]" />
            <span>{scannedFeedback}</span>
          </div>
        )}

        {/* Viewfinder with Champagne Gold Corner Brackets */}
        <div className="relative aspect-square w-full max-w-[270px] mx-auto rounded-3xl bg-[#171715] overflow-hidden shadow-warm-md flex items-center justify-center my-3 border border-[#E6E0D4]">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Laser Scan Line in Soft Emerald */}
          <motion.div
            animate={{
              y: [-110, 110, -110],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-x-4 h-0.5 bg-[#B5935A] shadow-[0_0_8px_#B5935A] pointer-events-none"
          />

          {/* Champagne Gold Viewfinder Corner Brackets */}
          <div className="absolute inset-5 border border-dashed border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
            <div className="flex justify-between">
              <div className="w-6 h-6 border-t-2 border-l-2 border-[#B5935A] rounded-tl" />
              <div className="w-6 h-6 border-t-2 border-r-2 border-[#B5935A] rounded-tr" />
            </div>
            <div className="flex justify-between">
              <div className="w-6 h-6 border-b-2 border-l-2 border-[#B5935A] rounded-bl" />
              <div className="w-6 h-6 border-b-2 border-r-2 border-[#B5935A] rounded-br" />
            </div>
          </div>

          {!cameraActive && (
            <div className="absolute inset-0 bg-[#171715]/90 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="w-8 h-8 text-[#9A9386] mb-2" />
              <p className="text-xs text-[#FAF8F3] font-serif font-semibold">Initializing Optical Sensor...</p>
              <p className="text-[10px] text-[#9A9386] mt-1 font-mono">Please grant camera permissions</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#666156] max-w-xs mx-auto font-sans">
          Hold steady and center the cryptographic QR code displayed on the concierge terminal.
        </p>

        {/* 1-Tap Link to Active ATM Screen */}
        <div className="mt-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handlePairWithActiveATM}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider shadow-warm-xs transition flex items-center justify-center gap-2 disabled:opacity-50 border border-[#255243]/50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#B5935A]" />
                <span>Linking Active Terminal...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-[#B5935A] fill-[#B5935A]" />
                <span>Pair with Active Terminal</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Manual Code Input Option */}
      <div className="pt-3 border-t border-[#E6E0D4]">
        <p className="text-[10px] text-[#9A9386] font-mono tracking-wider uppercase mb-1.5 text-center">
          Or Enter Session Code:
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
            className="flex-1 px-3 py-2 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] font-mono shadow-warm-xs"
          />
          <button
            type="submit"
            disabled={!manualCode.trim() || loading}
            className="px-4 py-2 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] text-xs font-sans font-medium disabled:opacity-50 transition shadow-warm-xs"
          >
            Pair
          </button>
        </form>
      </div>
    </div>
  );
};
export default QRScannerScreen;
