import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ArrowLeft, ArrowRight, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera failed:', err);
      setError('Could not access front camera. You can choose a photo file instead.');
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
      setError('PIN must be 4 digits.');
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
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-white text-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pt-2 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-bold text-slate-800">Create Bank Account</h2>
          <div className="w-9" />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+1 555-0192"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                4-Digit PIN *
              </label>
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-center font-mono tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                Confirm PIN *
              </label>
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-center font-mono tracking-widest text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Selfie Biometrics Enrollment Section */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
              Biometric Selfie Baseline *
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Take a front camera photo to enroll for ATM facial recognition.
            </p>

            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="w-20 h-20 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden relative flex items-center justify-center shrink-0">
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
                  <Camera className="w-7 h-7 text-slate-400" />
                )}
                {selfieBase64 && !isCameraActive && (
                  <span className="absolute bottom-1 right-1 bg-emerald-600 text-white p-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-sm"
                  >
                    Take Snapshot
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full py-2 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition"
                    >
                      Use Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-1.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-xs transition"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Enrolling Account...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Complete Registration</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
