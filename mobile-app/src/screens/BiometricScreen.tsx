import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldCheck, Delete, ArrowLeft } from 'lucide-react';
import { MobileUser, ScannedSession } from '../types';
import { mobileApi } from '../services/api';
import { NativeBiometricAuth, isNativeAndroidApp } from '../services/biometric';

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
  const [hasNativeBiometrics, setHasNativeBiometrics] = useState<boolean>(false);
  const [checkingHardware, setCheckingHardware] = useState<boolean>(true);
  
  // Passcode fallback state (Passcode set to "1111")
  const [usePasscodeMode, setUsePasscodeMode] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const REQUIRED_PASSCODE = '1111';

  // Successful verification complete handler
  const handleAuthComplete = useCallback(async (method: 'FINGERPRINT' | 'PASSCODE_FALLBACK') => {
    try {
      setAuthenticating(true);
      setError(null);
      // Notify FastAPI backend
      await mobileApi.verifyLocalBiometrics(session.sessionId, user.id, method);
      setVerified(true);
      setTimeout(() => {
        onBiometricSuccess();
      }, 600);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed on server');
    } finally {
      setAuthenticating(false);
    }
  }, [session.sessionId, user.id, onBiometricSuccess]);

  // Trigger Phone's Native Fingerprint Scanner Pop-up
  const triggerNativeFingerprint = useCallback(async () => {
    try {
      setAuthenticating(true);
      setError(null);
      setPasscodeError(null);

      // Invoke Android BiometricPrompt popup
      const result = await NativeBiometricAuth.authenticate({
        title: 'ATM Fingerprint Verification',
        subtitle: `Terminal ${session.kioskId} • Place finger on sensor`,
        cancelButtonText: 'Use Passcode (1111)',
      });

      if (result.success) {
        await handleAuthComplete('FINGERPRINT');
      } else {
        // User cancelled or requested fallback passcode
        setError(result.error || 'Fingerprint verification canceled.');
        setUsePasscodeMode(true);
      }
    } catch (err: unknown) {
      console.warn('Native biometric error, switching to passcode fallback:', err);
      setError('Fingerprint hardware unavailable. Please use the 4-digit passcode.');
      setUsePasscodeMode(true);
    } finally {
      setAuthenticating(false);
    }
  }, [session.kioskId, handleAuthComplete]);

  // Initial check on mount
  useEffect(() => {
    let isMounted = true;

    async function checkCapabilities() {
      try {
        const isNative = isNativeAndroidApp();
        if (isNative) {
          const status = await NativeBiometricAuth.checkBiometry();
          if (isMounted) {
            setHasNativeBiometrics(status.isAvailable);
            setCheckingHardware(false);
            if (status.isAvailable) {
              // Immediately trigger phone fingerprint dialog on native Android
              setTimeout(() => {
                triggerNativeFingerprint();
              }, 300);
            } else {
              // No biometrics enrolled or available on hardware -> show passcode 1111 mode
              setUsePasscodeMode(true);
            }
          }
        } else {
          // Running on Web Browser: if no fingerprint is connected, automatically switch to passcode 1111
          if (isMounted) {
            setHasNativeBiometrics(false);
            setCheckingHardware(false);
            setUsePasscodeMode(true);
          }
        }
      } catch {
        if (isMounted) {
          setHasNativeBiometrics(false);
          setCheckingHardware(false);
          setUsePasscodeMode(true);
        }
      }
    }

    checkCapabilities();
    return () => {
      isMounted = false;
    };
  }, [triggerNativeFingerprint]);

  // Handle Passcode Digit Entry
  const handleDigit = (digit: string) => {
    if (passcode.length >= 4) return;
    const nextPin = passcode + digit;
    setPasscode(nextPin);
    setPasscodeError(null);

    if (nextPin.length === 4) {
      if (nextPin === REQUIRED_PASSCODE) {
        handleAuthComplete('PASSCODE_FALLBACK');
      } else {
        setPasscodeError('Incorrect Passcode. (Hint: 1111)');
        setTimeout(() => {
          setPasscode('');
        }, 800);
      }
    }
  };

  const handleBackspace = () => {
    setPasscode((prev) => prev.slice(0, -1));
    setPasscodeError(null);
  };

  const handleClear = () => {
    setPasscode('');
    setPasscodeError(null);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white text-slate-900 animate-fade-in select-none">
      {/* Top Banner */}
      <div className="pt-2 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>ATM Terminal: {session.kioskId}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-2.5">
          {usePasscodeMode ? 'Enter Security Passcode' : 'Fingerprint Verification'}
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          {usePasscodeMode
            ? 'Web / Fallback authentication: enter your 4-digit passcode to authorize ATM withdrawal.'
            : 'Touch your phone’s fingerprint scanner to authenticate.'}
        </p>
      </div>

      {/* Main Content Area: Either Native Sensor or Passcode Keypad */}
      {usePasscodeMode ? (
        /* ================= PASSCODE (1111) MODE ================= */
        <div className="my-auto flex flex-col items-center max-w-xs mx-auto w-full">
          {/* PIN Dots Display */}
          <div className="flex items-center justify-center space-x-3 mb-3">
            {[0, 1, 2, 3].map((idx) => {
              const filled = passcode.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    verified
                      ? 'bg-emerald-500 border-emerald-500 scale-110'
                      : passcodeError
                      ? 'bg-rose-500 border-rose-500 animate-shake'
                      : filled
                      ? 'bg-blue-600 border-blue-600 scale-105'
                      : 'border-slate-300 bg-slate-100'
                  }`}
                />
              );
            })}
          </div>

          {/* Hint badge */}
          <div className="mb-4">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Demo Passcode: <strong className="text-blue-700 font-bold">1111</strong>
            </span>
          </div>

          {passcodeError && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>{passcodeError}</span>
            </div>
          )}

          {verified && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-1.5 animate-bounce">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Passcode Verified!</span>
            </div>
          )}

          {/* Clean Modern 3x4 Keypad */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={authenticating || verified}
                onClick={() => handleDigit(digit)}
                className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-blue-50 active:text-blue-700 border border-slate-200 text-slate-800 font-bold text-lg shadow-sm transition flex items-center justify-center disabled:opacity-50"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={authenticating || verified}
              onClick={handleClear}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-500 text-xs font-semibold shadow-sm transition flex items-center justify-center disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={authenticating || verified}
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-blue-50 active:text-blue-700 border border-slate-200 text-slate-800 font-bold text-lg shadow-sm transition flex items-center justify-center disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={authenticating || verified}
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-500 shadow-sm transition flex items-center justify-center disabled:opacity-50"
            >
              <Delete className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Quick Fill Button */}
          <button
            type="button"
            disabled={authenticating || verified}
            onClick={() => {
              setPasscode('1111');
              handleAuthComplete('PASSCODE_FALLBACK');
            }}
            className="mt-3 text-[11px] text-blue-600 hover:text-blue-800 font-medium underline"
          >
            Auto-fill Passcode 1111
          </button>
        </div>
      ) : (
        /* ================= NATIVE FINGERPRINT SENSOR MODE ================= */
        <div className="my-auto flex flex-col items-center">
          <button
            type="button"
            onClick={triggerNativeFingerprint}
            disabled={authenticating || verified || checkingHardware}
            className={`p-9 rounded-full border-2 transition-all focus:outline-none shadow-sm ${
              verified
                ? 'bg-emerald-50 border-emerald-400'
                : authenticating
                ? 'bg-blue-50 border-blue-400 animate-pulse'
                : 'bg-blue-50/70 border-blue-200 hover:border-blue-500 active:scale-95'
            }`}
          >
            {verified ? (
              <CheckCircle2 className="w-16 h-16 text-emerald-600 animate-bounce" />
            ) : authenticating ? (
              <RefreshCw className="w-16 h-16 text-blue-600 animate-spin" />
            ) : (
              <Fingerprint className="w-16 h-16 text-blue-600" />
            )}
          </button>

          <p className="mt-4 text-xs font-semibold text-slate-800">
            {verified
              ? 'Biometrics Verified!'
              : authenticating
              ? 'Scanning Fingerprint on Device...'
              : 'Tap to Scan Phone Fingerprint'}
          </p>

          <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
            Uses Android BiometricPrompt hardware sensor
          </p>

          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs max-w-xs">
              {error}
            </div>
          )}

          {/* Switch to Passcode Button */}
          <button
            type="button"
            onClick={() => setUsePasscodeMode(true)}
            className="mt-5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-600" />
            <span>Use Passcode (1111) Instead</span>
          </button>
        </div>
      )}

      {/* Footer Controls */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel Session</span>
        </button>

        {usePasscodeMode && hasNativeBiometrics && (
          <button
            type="button"
            onClick={() => {
              setUsePasscodeMode(false);
              triggerNativeFingerprint();
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Switch to Fingerprint</span>
          </button>
        )}
      </div>
    </div>
  );
};
export default BiometricScreen;
