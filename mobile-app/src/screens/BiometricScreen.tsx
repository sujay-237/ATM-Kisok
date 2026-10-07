import React, { useState, useEffect } from 'react';
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { MobileUser, ScannedSession } from '../types';
import { mobileApi } from '../services/api';

interface BiometricScreenProps {
  user: MobileUser;
  session: ScannedSession;
  onBiometricSuccess: () => void;
  onCancel: () => void;
}

export const BiometricScreen: React.FC<BiometricScreenProps> = ({
  user,
  session,
  onBiometricSuccess,
  onCancel,
}) => {
  const [authenticating, setAuthenticating] = useState<boolean>(false);
  const [verified, setVerified] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const triggerBiometricAuth = async () => {
    try {
      setAuthenticating(true);
      setError(null);

      // Simulate device hardware fingerprint / face authentication
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Call FastAPI backend to update session status
      await mobileApi.verifyLocalBiometrics(session.sessionId, user.id, 'FINGERPRINT');

      setVerified(true);
      setTimeout(() => {
        onBiometricSuccess();
      }, 500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Biometric authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerBiometricAuth();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900 text-center">
      {/* Top Banner */}
      <div className="pt-4">
        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
          ATM Terminal: {session.kioskId}
        </span>
        <h2 className="text-xl font-bold text-slate-900 mt-3">
          Device Authentication
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Confirm your identity using your device's fingerprint or biometric sensor.
        </p>
      </div>

      {/* Sensor Widget */}
      <div className="my-auto flex flex-col items-center">
        <button
          type="button"
          onClick={triggerBiometricAuth}
          disabled={authenticating || verified}
          className="p-8 rounded-full bg-blue-50 border-2 border-blue-200 hover:border-blue-500 transition-all focus:outline-none"
        >
          {verified ? (
            <CheckCircle2 className="w-16 h-16 text-emerald-600 animate-bounce" />
          ) : authenticating ? (
            <RefreshCw className="w-16 h-16 text-blue-700 animate-spin" />
          ) : (
            <Fingerprint className="w-16 h-16 text-blue-700" />
          )}
        </button>

        <p className="mt-4 text-xs font-semibold text-slate-700">
          {verified
            ? 'Biometrics Verified!'
            : authenticating
            ? 'Scanning Fingerprint...'
            : 'Touch Sensor to Authenticate'}
        </p>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Cancel */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          Cancel Transaction
        </button>
      </div>
    </div>
  );
};
