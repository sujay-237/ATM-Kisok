import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

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
    } catch {
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

      if (!res.ok) throw new Error('Failed to update portrait');
      setSuccess(true);
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error updating portrait');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171715]/40 backdrop-blur-sm text-[#171715]">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-md luxury-card rounded-2xl p-6 shadow-xl relative"
        >
          <button
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#9A9386] hover:text-[#171715] hover:bg-[#F5F2EB] transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A] mx-auto mb-3">
              <Camera className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-2xl font-serif font-semibold text-[#171715]">Biometric Identity Baseline</h3>
            <p className="text-xs text-[#666156] mt-1">
              Registered baseline portrait used for cardless biometric identity verification at ATM terminals.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[#FDF2F4] border border-[#F8CBD4] text-[#9F1239] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
              <span>{error}</span>
            </div>
          )}

          {/* Photo Container */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-44 h-44 rounded-full bg-[#F5F2EB] border-2 border-[#B5935A] overflow-hidden relative shadow-sm flex items-center justify-center p-0.5">
              {isWebcamActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover rounded-full transform -scale-x-100"
                />
              ) : preview ? (
                <img src={preview} alt={userName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="text-center p-4 text-[#9A9386] text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-[#9A9386]" />
                  No reference portrait
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

            <div className="flex gap-2 mt-5 w-full">
              {isWebcamActive ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition shadow-sm"
                >
                  Snap Photo
                </motion.button>
              ) : (
                <>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={startWebcam}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-[#B5935A]" />
                    <span>Use Camera</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] hover:bg-[#F5F2EB] text-[#171715] font-medium text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4 text-[#666156]" />
                    <span>Choose File</span>
                  </motion.button>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E6E0D4] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                stopWebcam();
                onClose();
              }}
              className="px-4 py-2 rounded-xl border border-[#E6E0D4] text-[#666156] text-xs font-medium hover:bg-[#F5F2EB] transition"
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={loading || !preview}
              onClick={handleSave}
              className="px-6 py-2 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] text-xs font-medium tracking-wider uppercase shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#B5935A]" />}
              {success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B5935A]" />
                  <span>Saved!</span>
                </>
              ) : loading ? (
                'Saving...'
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B5935A]" />
                  <span>Save Baseline</span>
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
