import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowLeft, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { MobileUser } from '../types';
import { mobileApi } from '../services/api';

interface RegisterScreenProps {
  onRegisterSuccess: (user: MobileUser) => void;
  onBack: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegisterSuccess, onBack }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('1000');

  // Selfie capture state
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'user' }, width: { ideal: 480 }, height: { ideal: 480 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera failed:', err);
      setError('Could not access camera. You can choose a photo file instead.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelfieBase64(dataUrl);
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelfieBase64(reader.result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !pin) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('Security PIN must be 4 digits.');
      return;
    }

    if (pin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    if (!selfieBase64) {
      setError('A face selfie photo is required for biometric enrollment.');
      return;
    }

    try {
      setLoading(true);
      const res = await mobileApi.register({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        pin,
        account_balance: parseFloat(initialDeposit) || 1000,
        reference_selfie_base64: selfieBase64,
      });

      onRegisterSuccess(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(`${msg} (Backend: ${mobileApi.getBaseUrl()})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-[#F5F2EB] text-[#171715] overflow-y-auto font-sans relative antialiased">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pt-1 mb-4">
          <motion.button
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#666156] hover:text-[#171715] transition shadow-warm-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h2 className="text-sm font-serif font-semibold text-[#171715]">Open Private Client Account</h2>
          <div className="w-9" />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#9F1239]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-[#171715] font-mono focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-[#171715] font-mono focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1">
                4-Digit Security PIN *
              </label>
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-center font-mono tracking-widest text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#9A9386] font-semibold mb-1">
                Confirm PIN *
              </label>
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FCFBF8] border border-[#E6E0D4] text-xs text-center font-mono tracking-widest text-[#171715] focus:outline-none focus:ring-1 focus:ring-[#B5935A] focus:border-[#B5935A] transition shadow-warm-xs"
              />
            </div>
          </div>

          {/* Selfie Biometrics Enrollment Section */}
          <div className="pt-2 border-t border-[#E6E0D4]">
            <label className="block text-[10px] font-mono tracking-[0.14em] uppercase text-[#171715] font-semibold mb-1">
              Biometric Facial Baseline *
            </label>
            <p className="text-[11px] text-[#666156] mb-2 font-sans">
              Capture front face photo to enroll in Sentinel Biometric Enclave.
            </p>

            <div className="flex items-center gap-3 bg-[#FCFBF8] p-3 rounded-2xl border border-[#E6E0D4] shadow-warm-xs">
              <div className="w-20 h-20 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] overflow-hidden relative flex items-center justify-center shrink-0">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : selfieBase64 ? (
                  <img src={selfieBase64} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-7 h-7 text-[#9A9386]" />
                )}
                {selfieBase64 && !isCameraActive && (
                  <span className="absolute bottom-1 right-1 bg-[#155E43] text-white p-0.5 rounded-full shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                {isCameraActive ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={capturePhoto}
                    className="w-full py-2 px-3 rounded-xl bg-[#102A22] text-[#FAF8F3] font-medium text-xs shadow-warm-xs font-sans"
                  >
                    Take Snapshot
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={startCamera}
                      className="w-full py-2 px-3 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider transition shadow-warm-xs border border-[#255243]/50"
                    >
                      Use Camera
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1.5 px-3 rounded-xl border border-[#E6E0D4] bg-[#FCFBF8] text-[#171715] font-sans font-medium text-xs hover:bg-white transition"
                    >
                      Upload Photo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-[#102A22] to-[#193D32] hover:from-[#193D32] hover:to-[#225042] text-[#FAF8F3] font-sans font-medium text-xs uppercase tracking-wider shadow-warm-xs transition flex items-center justify-center gap-2 disabled:opacity-50 border border-[#255243]/50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#B5935A]" />
                <span>Enrolling Account...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 stroke-[2.5] text-[#B5935A]" />
                <span>Complete Registration</span>
              </>
            )}
          </motion.button>
        </form>
      </div>
    </div>
  );
};
export default RegisterScreen;
