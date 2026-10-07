import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Camera, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface ProfileSelfieModalProps {
  userId: string;
  userName: string;
  currentPhoto: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const ProfileSelfieModal: React.FC<ProfileSelfieModalProps> = ({
  userId,
  userName,
  currentPhoto,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [preview, setPreview] = useState<string | null>(currentPhoto);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  useEffect(() => {
    setPreview(currentPhoto);
    return () => stopWebcam();
  }, [currentPhoto, isOpen]);

  if (!isOpen) return null;

  const startWebcam = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamActive(true);
    } catch (err) {
      setError('Unable to access camera.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setPreview(dataUrl);
      stopWebcam();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreview(reader.result);
        stopWebcam();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!preview) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:8000/api/users/${userId}/reference-photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference_selfie_base64: preview }),
      });

      if (!res.ok) throw new Error('Failed to update photo');
      setSuccess(true);
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error updating photo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative text-slate-900">
        <button
          onClick={() => {
            stopWebcam();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mx-auto mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold">Biometric Reference Baseline</h3>
          <p className="text-xs text-slate-500 mt-1">
            Registered baseline image for Gemini Multimodal facial verification during ATM sessions.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Photo Container */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-48 h-48 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden relative shadow-inner flex items-center justify-center">
            {isWebcamActive ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : preview ? (
              <img src={preview} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4 text-slate-400 text-xs">
                <Camera className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No reference photo registered
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex gap-2 mt-4 w-full">
            {isWebcamActive ? (
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
              >
                Snap Photo
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startWebcam}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choose File</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !preview}
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {success ? 'Saved!' : loading ? 'Saving...' : 'Save Baseline'}
          </button>
        </div>
      </div>
    </div>
  );
};
