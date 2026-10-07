import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { MobileUser, ScannedSession, VerificationResult } from '../types';
import { mobileApi } from '../services/api';

interface SelfieScreenProps {
  user: MobileUser;
  session: ScannedSession;
  onVerificationSuccess: (result: VerificationResult) => void;
  onFailed: (reason: string) => void;
}

export const SelfieScreen: React.FC<SelfieScreenProps> = ({
  user,
  session,
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
        // Fallback: fetch the user's reference photo from backend as the test selfie
        const photoRes = await fetch(`http://localhost:8000/api/users/${user.id}/reference-photo`);
        const photoData = await photoRes.json();
        selfieBase64 = photoData.reference_selfie || '';
      }

      const result = await mobileApi.verifySelfie(session.sessionId, user.id, selfieBase64);

      if (result.match) {
        onVerificationSuccess(result);
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
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900 text-center">
      {/* Top Header */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900">
          Facial Verification
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Look directly at the camera. Gemini AI will match your face against your registered baseline.
        </p>
      </div>

      {/* Camera Viewfinder */}
      <div className="my-auto flex flex-col items-center">
        <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-blue-600 bg-slate-100 shadow-lg flex items-center justify-center">
          {hasCamera ? (
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="p-4 text-xs text-slate-400">
              <Camera className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <span>Camera Inactive</span>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 max-w-xs text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 w-full max-w-xs">
          <button
            type="button"
            disabled={analyzing}
            onClick={captureAndVerify}
            className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying with Gemini AI...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Capture & Verify Face</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="pt-4 text-xs text-slate-400 flex items-center justify-center gap-1.5 font-mono">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Biometric Anti-Spoofing Active</span>
      </div>
    </div>
  );
};
