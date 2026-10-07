import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, UserCheck, ArrowRight, Lock } from 'lucide-react';
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

  // Stop webcam stream when unmounting or deactivated
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
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access webcam. Please verify camera permissions or upload a photo file.');
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

    // Form Validations
    if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !pin) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 numeric digits.');
      return;
    }

    if (pin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    if (!selfieBase64) {
      setError('A facial reference selfie is strictly required for biometric registration.');
      return;
    }

    const balanceNum = parseFloat(initialDeposit);
    if (isNaN(balanceNum) || balanceNum < 0) {
      setError('Initial deposit must be a valid positive amount.');
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
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Account Created Successfully</h2>
        <p className="text-sm text-slate-600 mt-2">
          Welcome to Sentinel Bank, <strong className="text-slate-900">{successData.full_name}</strong>.
          Your cardless biometric profile is now active and ready for ATM transactions.
        </p>

        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left font-sans space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-200/80 pb-2">
            <span className="text-slate-500">Username:</span>
            <span className="font-semibold text-slate-900 font-mono">@{successData.username}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/80 pb-2">
            <span className="text-slate-500">Registered Phone:</span>
            <span className="font-semibold text-slate-900 font-mono">{successData.phone}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/80 pb-2">
            <span className="text-slate-500">Opening Balance:</span>
            <span className="font-bold text-emerald-600 font-mono">${successData.account_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Biometric Reference:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> Enrolled in Gemini Vision
            </span>
          </div>
        </div>

        <button
          onClick={() => onSuccess(successData)}
          className="w-full mt-6 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2"
        >
          <span>Open Account Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5 mb-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mx-auto mb-3">
          <UserCheck className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Open a New Bank Account</h2>
        <p className="text-sm text-slate-600 mt-1">
          Register with your identity and a biometric facial baseline for cardless ATM access.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Johnathan Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. jsmith"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="+1 (555) 019-2834"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
            />
          </div>
        </div>

        {/* Security & Financial */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              4-Digit PIN <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm text-center font-mono tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Confirm PIN <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              maxLength={4}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm text-center font-mono tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Initial Deposit ($)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              placeholder="1000"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Biometric Reference Selfie Section */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-700" />
                Facial Biometric Enrollment
                <span className="text-rose-500">*</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload or capture a clean frontal selfie. This will be stored securely and matched by Gemini Vision during cardless ATM cash withdrawals.
              </p>
            </div>
          </div>

          {cameraError && (
            <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Camera / Preview Area */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-6">
            {/* Viewport Box */}
            <div className="relative w-44 h-44 rounded-xl bg-slate-200 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
              {isWebcamActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : selfieBase64 ? (
                <img src={selfieBase64} alt="Enrolled Selfie" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-3 text-slate-400 text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <span>No photo taken</span>
                </div>
              )}

              {/* Status Badge */}
              {selfieBase64 && !isWebcamActive && (
                <span className="absolute bottom-2 right-2 bg-emerald-600 text-white rounded-full p-1 shadow">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-3 w-full">
              {isWebcamActive ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={captureWebcamSelfie}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Snapshot</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopWebcam}
                    className="w-full py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
                  >
                    Cancel Webcam
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={startWebcam}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Selfie with Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Upload Image File</span>
                  </button>

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
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                  <span className="font-medium">Selfie baseline captured successfully!</span>
                  <button
                    type="button"
                    onClick={() => setSelfieBase64(null)}
                    className="text-rose-600 hover:underline font-semibold ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Tip: Face the camera directly in good lighting. Avoid sunglasses, heavy shadows, or face masks.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            Already have an account? Sign in
          </button>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Registering Account...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Create Bank Account</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
