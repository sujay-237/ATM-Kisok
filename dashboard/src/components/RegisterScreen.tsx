import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';
import { User } from '../types';

interface RegisterScreenProps {
  onSuccess: (user: User) => void;
  onGoToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onSuccess, onGoToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [initialDeposit, setInitialDeposit] = useState('1000');
  
  // Selfie State
  const [selfieBase64, setSelfieBase64] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<User | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    setError(null);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamActive(true);
    } catch {
      setCameraError('Unable to access camera. Please verify permissions or upload a portrait photo.');
      setIsWebcamActive(false);
    }
  };

  const captureWebcamSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSelfieBase64(dataUrl);
      stopWebcam();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG or PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelfieBase64(reader.result);
        stopWebcam();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !pin) {
      setError('Please fill in all required private client fields.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('Security PIN must be exactly 4 numeric digits.');
      return;
    }

    if (pin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    if (!selfieBase64) {
      setError('A facial reference portrait is strictly required for biometric terminal custody.');
      return;
    }

    const balanceNum = parseFloat(initialDeposit);
    if (isNaN(balanceNum) || balanceNum < 0) {
      setError('Initial reserve deposit must be a valid positive amount.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          pin,
          account_balance: balanceNum,
          reference_selfie_base64: selfieBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed. Please verify your information.');
      }

      setSuccessData(data.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto luxury-card rounded-2xl p-8 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-[#EBF5F0] border border-[#C2E2D3] flex items-center justify-center text-[#155E43] mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 stroke-[1.8]" />
        </div>
        <h2 className="text-3xl font-serif font-semibold text-[#171715] tracking-tight">Account Enrolled Successfully</h2>
        <p className="text-sm text-[#666156] mt-2">
          Welcome to Sentinel Private Bank, <strong className="text-[#102A22]">{successData.full_name}</strong>.
          Your private client profile and biometric baseline are now active for cardless terminal access.
        </p>

        <div className="mt-6 p-4 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-left font-sans space-y-2 text-sm">
          <div className="flex justify-between border-b border-[#E6E0D4] pb-2">
            <span className="text-[#666156]">Client ID:</span>
            <span className="font-semibold text-[#171715] font-mono">@{successData.username}</span>
          </div>
          <div className="flex justify-between border-b border-[#E6E0D4] pb-2">
            <span className="text-[#666156]">Registered Mobile:</span>
            <span className="font-semibold text-[#171715] font-mono">{successData.phone}</span>
          </div>
          <div className="flex justify-between border-b border-[#E6E0D4] pb-2">
            <span className="text-[#666156]">Opening Reserve:</span>
            <span className="font-bold text-[#102A22] font-serif text-base tabular-nums">
              ₹{successData.account_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#666156]">Biometric Baseline:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#155E43] text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Enrolled & Verified
            </span>
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onSuccess(successData)}
          className="w-full mt-6 py-3.5 px-4 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Open Account Dashboard</span>
          <ArrowRight className="w-4 h-4 text-[#B5935A]" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto luxury-card rounded-2xl p-8"
    >
      {/* Header */}
      <div className="border-b border-[#E6E0D4] pb-5 mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#F4EFE4] border border-[#E2D4BC] flex items-center justify-center text-[#B5935A] mx-auto mb-3">
          <UserCheck className="w-6 h-6 stroke-[1.8]" />
        </div>
        <h2 className="text-3xl font-serif font-semibold text-[#171715] tracking-tight">Open a Private Client Account</h2>
        <p className="text-xs text-[#666156] mt-1.5 leading-relaxed">
          Enroll with your legal identity and a biometric facial baseline for cardless concierge terminal access.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FDF2F4] border border-[#F8CBD4] text-[#9F1239] text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#9F1239]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Full Legal Name <span className="text-[#9F1239]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Johnathan Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm focus:outline-none focus:border-[#B5935A] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Client ID / Username <span className="text-[#9F1239]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="jsmith"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm font-mono focus:outline-none focus:border-[#B5935A] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Email Address <span className="text-[#9F1239]">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm focus:outline-none focus:border-[#B5935A] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Mobile Phone <span className="text-[#9F1239]">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm font-mono focus:outline-none focus:border-[#B5935A] transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E6E0D4]">
          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              4-Digit PIN <span className="text-[#9F1239]">*</span>
            </label>
            <input
              type="password"
              required
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm text-center font-mono tracking-widest focus:outline-none focus:border-[#B5935A] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Confirm PIN <span className="text-[#9F1239]">*</span>
            </label>
            <input
              type="password"
              required
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm text-center font-mono tracking-widest focus:outline-none focus:border-[#B5935A] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[#666156] uppercase tracking-wider mb-1.5">
              Initial Reserve (₹)
            </label>
            <input
              type="number"
              min="0"
              step="500"
              placeholder="1000"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F2EB] border border-[#E6E0D4] text-[#171715] text-sm font-mono focus:outline-none focus:border-[#B5935A] transition"
            />
          </div>
        </div>

        {/* Biometric Reference Selfie Section */}
        <div className="pt-4 border-t border-[#E6E0D4]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-serif font-semibold text-[#171715] flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-[#B5935A]" />
                Facial Biometric Enrollment Baseline
                <span className="text-[#9F1239]">*</span>
              </h3>
              <p className="text-xs text-[#666156] mt-0.5">
                Capture or upload a clean frontal portrait. Stored with end-to-end cryptographic custody for cardless terminal verification.
              </p>
            </div>
          </div>

          {cameraError && (
            <div className="mb-3 p-3 rounded-lg bg-[#FDF6E7] border border-[#F5DEB3] text-[#9A6700] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#9A6700]" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="bg-[#F5F2EB] border border-[#E6E0D4] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-40 h-40 rounded-full bg-[#FCFBF8] border-2 border-[#B5935A] overflow-hidden flex items-center justify-center shrink-0 shadow-sm p-0.5">
              {isWebcamActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover rounded-full transform -scale-x-100"
                />
              ) : selfieBase64 ? (
                <img src={selfieBase64} alt="Enrolled Baseline" className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="text-center p-3 text-[#9A9386] text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-1 text-[#9A9386]" />
                  <span>No photo</span>
                </div>
              )}

              {selfieBase64 && !isWebcamActive && (
                <span className="absolute bottom-2 right-2 bg-[#155E43] text-white rounded-full p-1 shadow">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              )}
            </div>

            <div className="flex-1 space-y-3 w-full">
              {isWebcamActive ? (
                <div className="flex flex-col gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={captureWebcamSelfie}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-[#B5935A]" />
                    <span>Capture Portrait</span>
                  </motion.button>
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="w-full py-2 px-4 rounded-xl bg-white border border-[#E6E0D4] text-[#666156] font-medium text-xs transition"
                  >
                    Cancel Webcam
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={startWebcam}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-[#B5935A]" />
                    <span>Use Camera</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#FCFBF8] hover:bg-[#F5F2EB] text-[#171715] border border-[#E6E0D4] font-medium text-xs transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-[#666156]" />
                    <span>Upload Portrait</span>
                  </motion.button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {selfieBase64 && !isWebcamActive && (
                <div className="p-2.5 rounded-lg bg-[#EBF5F0] border border-[#C2E2D3] text-[#155E43] text-xs flex items-center justify-between font-mono">
                  <span>Portrait baseline captured successfully!</span>
                  <button
                    type="button"
                    onClick={() => setSelfieBase64(null)}
                    className="text-[#9F1239] hover:underline font-semibold ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}

              <p className="text-[11px] text-[#9A9386]">
                Guideline: Face camera directly in balanced lighting. Avoid sunglasses, heavy hats, or facial coverings.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-[#E6E0D4] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-sm font-medium text-[#666156] hover:text-[#171715] transition"
          >
            Already a private client? Sign in
          </button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#102A22] hover:bg-[#193D32] text-[#FAF8F3] font-medium text-xs tracking-wider uppercase shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#B5935A]" />
                <span>Enrolling Client Account...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#B5935A]" />
                <span>Open Private Client Account</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};
