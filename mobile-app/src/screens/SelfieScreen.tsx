import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, RefreshCw, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import { MobileUser, ScannedSession, VerificationResult } from '../types';
import { mobileApi } from '../services/api';

interface SelfieScreenProps {
  user: MobileUser;
  session: ScannedSession;
  prestagedAmount?: number | null;
  isDuressMode?: boolean;
  onVerificationSuccess: (result: VerificationResult) => void;
  onFailed: (reason: string) => void;
}

export const SelfieScreen: React.FC<SelfieScreenProps> = ({
  user,
  session,
  prestagedAmount,
  isDuressMode = false,
  onVerificationSuccess,
  onFailed,
}) => {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.warn('Front camera not directly available:', err);
        setHasCamera(false);
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureAndVerify = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      let selfieBase64 = '';

      if (videoRef.current && canvasRef.current && hasCamera) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 320;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          selfieBase64 = canvas.toDataURL('image/jpeg', 0.85);
        }
      }

      if (!selfieBase64) {
        try {
          const photoData = await mobileApi.getUserReferencePhoto(user.id);
          selfieBase64 = photoData.reference_selfie || '';
        } catch {
          selfieBase64 = '';
        }
      }

      const result = await mobileApi.verifySelfie(
        session.sessionId,
        user.id,
        selfieBase64,
        prestagedAmount,
        isDuressMode
      );

      if (result.match) {
        onVerificationSuccess({
          ...result,
          prestaged_amount: prestagedAmount,
          is_duress: isDuressMode,
        });
      } else {
        setError(result.reason || 'Facial verification failed.');
        onFailed(result.reason || 'Facial mismatch');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Facial verification failed');
      onFailed('Error communicating with verification server');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#F5F2EB] text-[#171715] text-center font-sans relative overflow-hidden antialiased">
      {/* Top Header */}
      <div className="pt-2">
        {prestagedAmount && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] text-[#B5935A] text-[10px] font-mono font-semibold shadow-warm-xs">
            <Zap className="w-3.5 h-3.5 text-[#B5935A] fill-[#B5935A]" />
            <span>Express ₹{prestagedAmount.toLocaleString()} Pre-Staged</span>
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-serif font-semibold text-[#171715] tracking-tight">
          Facial Identity Verification
        </h2>
        <p className="text-xs text-[#666156] mt-1.5 max-w-xs mx-auto font-sans leading-relaxed">
          Look directly into the camera. Sentinel Biometric Enclave validates match, liveness, and perimeter security.
        </p>
      </div>

      {/* Face-Alignment HUD Ring Viewfinder with Champagne Gold Reticle */}
      <div className="my-auto flex flex-col items-center">
        <div className="relative w-56 h-56 rounded-full overflow-hidden border-2 border-[#E6E0D4] bg-[#171715] shadow-warm-md flex items-center justify-center ring-4 ring-[#E6E0D4]/40">
          {hasCamera ? (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="p-4 text-xs text-[#9A9386]">
              <Camera className="w-10 h-10 mx-auto mb-2 text-[#9A9386]" />
              <span>Camera Inactive</span>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Concentric HUD Reticle Lines in Champagne Gold */}
          <div className="absolute inset-3 rounded-full border border-dashed border-[#B5935A]/50 pointer-events-none" />
          <div className="absolute inset-6 rounded-full border border-white/20 pointer-events-none" />

          {/* Animated Scanning Sweep when Analyzing */}
          {analyzing && (
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-0 bg-gradient-to-b from-[#B5935A]/30 via-transparent to-transparent pointer-events-none origin-center"
            />
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs flex items-center gap-2 max-w-xs text-left font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 w-full max-w-xs">
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            disabled={analyzing}
            onClick={captureAndVerify}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider shadow-warm-xs transition flex items-center justify-center gap-2 disabled:opacity-50 border border-[#255243]/50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#B5935A]" />
                <span>Validating Biometric Baseline...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 text-[#B5935A]" />
                <span>Capture & Verify Face</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="pt-4 text-xs text-[#666156] flex items-center justify-center gap-1.5 font-mono">
        <ShieldCheck className="w-4 h-4 text-[#155E43]" />
        <span>Biometric Anti-Spoofing & Threat Detection Active</span>
      </div>
    </div>
  );
};
export default SelfieScreen;
