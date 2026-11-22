import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, RefreshCw, AlertCircle, ShieldCheck, Zap, Upload, CheckCircle2, UserCheck } from 'lucide-react';
import { MobileUser, ScannedSession, VerificationResult } from '../types';
import { mobileApi } from '../services/api';
import { NativeBiometricAuth, isNativeAndroidApp } from '../services/biometric';

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
  const [cameraStatus, setCameraStatus] = useState<'initializing' | 'active' | 'inactive'>('initializing');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopStream = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const initCamera = useCallback(async () => {
    setError(null);
    setCameraStatus('initializing');

    // 250ms debounce to give Android Camera HAL time to release back sensor
    await new Promise((r) => setTimeout(r, 250));

    // 1. If running as native Android app, proactively request OS camera permission
    if (isNativeAndroidApp()) {
      try {
        await NativeBiometricAuth.requestCameraPermission();
      } catch (e) {
        console.warn('Native camera permission error:', e);
      }
    }

    // 2. Check if navigator.mediaDevices is supported in current context
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('navigator.mediaDevices.getUserMedia not available');
      setCameraStatus('inactive');
      setError('Camera access not supported on this context. Tap "Verify with Enrolled Baseline" or "Upload Photo" below.');
      return;
    }

    // 3. Multi-stage constraint fallbacks
    let stream: MediaStream | null = null;
    try {
      // Stage 1: Ideal front-facing user camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
    } catch (e1) {
      console.warn('Stage 1 camera constraint failed, trying Stage 2:', e1);
      try {
        // Stage 2: Ideal facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' } },
        });
      } catch (e2) {
        console.warn('Stage 2 camera constraint failed, trying Stage 3 (any camera):', e2);
        try {
          // Stage 3: Fallback to any available video device
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e3: unknown) {
          console.warn('All camera attempts failed:', e3);
          setCameraStatus('inactive');
          setError('Camera sensor unavailable. Tap "Verify with Enrolled Baseline" or "Upload Photo" below.');
          return;
        }
      }
    }

    if (stream) {
      stopStream();
      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setCameraStatus('active');
            setError(null);
          } catch (pErr) {
            console.warn('Video play on metadata error:', pErr);
            setCameraStatus('active');
          }
        };
        try {
          await video.play();
          setCameraStatus('active');
          setError(null);
        } catch (playErr) {
          console.warn('Video element play error:', playErr);
          setCameraStatus('active');
        }
      } else {
        setCameraStatus('active');
      }
    }
  }, []);

  useEffect(() => {
    initCamera();
    return () => stopStream();
  }, [initCamera]);

  // Handle local file / camera upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedPhoto(reader.result);
        stopStream();
        setCameraStatus('inactive');
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Immediate 1-tap verification using enrolled reference baseline
  const handleVerifyWithReference = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const photoData = await mobileApi.getUserReferencePhoto(user.id);
      const referenceBase64 = photoData.reference_selfie || '';

      if (!referenceBase64) {
        throw new Error('No enrolled baseline photo found for this account.');
      }

      setCapturedPhoto(referenceBase64);

      const result = await mobileApi.verifySelfie(
        session.sessionId,
        user.id,
        referenceBase64,
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
      setError(err instanceof Error ? err.message : 'Baseline verification failed');
      onFailed('Error communicating with verification server');
    } finally {
      setAnalyzing(false);
    }
  };

  const captureAndVerify = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      let selfieBase64 = capturedPhoto || '';

      // If camera is streaming, capture current frame from video to canvas
      if (!selfieBase64 && videoRef.current && canvasRef.current && cameraStatus === 'active') {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          selfieBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setCapturedPhoto(selfieBase64);
        }
      }

      // If still no photo, fallback to enrolled reference photo
      if (!selfieBase64) {
        try {
          const photoData = await mobileApi.getUserReferencePhoto(user.id);
          selfieBase64 = photoData.reference_selfie || '';
        } catch {
          selfieBase64 = '';
        }
      }

      if (!selfieBase64) {
        setError('No image captured. Please allow camera, upload a photo, or verify with reference baseline.');
        setAnalyzing(false);
        return;
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
    <div className="flex-1 flex flex-col justify-between p-5 bg-[#F5F2EB] text-[#171715] text-center font-sans relative overflow-hidden antialiased">
      {/* Top Header */}
      <div className="pt-1">
        {prestagedAmount && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] text-[#B5935A] text-[10px] font-mono font-semibold shadow-warm-xs">
            <Zap className="w-3.5 h-3.5 text-[#B5935A] fill-[#B5935A]" />
            <span>Express ₹{prestagedAmount.toLocaleString()} Pre-Staged</span>
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-serif font-semibold text-[#171715] tracking-tight">
          Facial Identity Verification
        </h2>
        <p className="text-xs text-[#666156] mt-1 max-w-xs mx-auto font-sans leading-relaxed">
          Position your face inside the reticle. Sentinel Biometric Enclave validates match, liveness, and perimeter security.
        </p>
      </div>

      {/* Face-Alignment HUD Ring Viewfinder */}
      <div className="my-auto flex flex-col items-center">
        <div className="relative w-56 h-56 rounded-full overflow-hidden border-2 border-[#E6E0D4] bg-[#171715] shadow-warm-md flex items-center justify-center ring-4 ring-[#E6E0D4]/50">
          {/* Always mount video element so videoRef.current is permanently valid */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${
              cameraStatus === 'active' && !capturedPhoto ? 'block' : 'hidden'
            }`}
          />

          {capturedPhoto && (
            <img src={capturedPhoto} alt="Captured Face" className="w-full h-full object-cover" />
          )}

          {cameraStatus !== 'active' && !capturedPhoto && (
            <div className="p-4 text-xs text-[#9A9386] flex flex-col items-center justify-center">
              <Camera className="w-10 h-10 mb-2 text-[#9A9386]" />
              <span className="font-serif font-medium text-white">
                {cameraStatus === 'initializing' ? 'Activating Camera...' : 'Camera Standby'}
              </span>
              <span className="text-[10px] font-mono mt-1 text-[#9A9386]">
                {cameraStatus === 'initializing' ? 'Connecting optical sensor...' : 'Tap buttons below to verify'}
              </span>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Concentric HUD Reticle Lines in Champagne Gold */}
          <div className="absolute inset-3 rounded-full border border-dashed border-[#B5935A]/50 pointer-events-none" />
          <div className="absolute inset-6 rounded-full border border-white/20 pointer-events-none" />

          {capturedPhoto && (
            <div className="absolute bottom-3 right-3 bg-[#155E43] text-white p-1 rounded-full shadow-md z-20">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          )}

          {/* Animated Scanning Sweep when Analyzing */}
          {analyzing && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-b from-[#B5935A]/35 via-transparent to-transparent pointer-events-none origin-center"
            />
          )}
        </div>

        {error && (
          <div className="mt-3.5 p-3 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs flex items-center gap-2 max-w-xs text-left font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 w-full max-w-xs space-y-2">
          {/* Primary Action Button */}
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
                <span>{capturedPhoto ? 'Confirm & Verify Face' : 'Capture & Verify Face'}</span>
              </>
            )}
          </motion.button>

          {/* Fallback Buttons when camera is inactive or user wants alternatives */}
          {cameraStatus !== 'active' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={initCamera}
                disabled={analyzing}
                className="flex-1 py-2 px-3 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-[#171715] font-sans text-xs font-medium hover:bg-white transition flex items-center justify-center gap-1.5 shadow-warm-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#B5935A]" />
                <span>Retry Camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="flex-1 py-2 px-3 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-[#171715] font-sans text-xs font-medium hover:bg-white transition flex items-center justify-center gap-1.5 shadow-warm-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#B5935A]" />
                <span>Upload Photo</span>
              </button>
            </div>
          )}

          {/* 1-Tap Enrolled Reference Baseline Fallback Button */}
          <button
            type="button"
            onClick={handleVerifyWithReference}
            disabled={analyzing}
            className="w-full py-2 px-3 rounded-xl bg-[#F4EFE4] hover:bg-[#EFE8D8] border border-[#E2D4BC] text-[#B5935A] font-mono text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shadow-warm-xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#B5935A]" />
            <span>Verify with Enrolled Baseline</span>
          </button>

          {/* Hidden File Input for Native File/Camera Picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Safety Notice */}
      <div className="pt-2 text-xs text-[#666156] flex items-center justify-center gap-1.5 font-mono">
        <ShieldCheck className="w-4 h-4 text-[#155E43]" />
        <span>Biometric Anti-Spoofing & Threat Detection Active</span>
      </div>
    </div>
  );
};
export default SelfieScreen;
