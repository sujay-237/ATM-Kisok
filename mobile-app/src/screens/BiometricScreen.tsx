import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldCheck, Delete, ArrowLeft, Zap } from 'lucide-react';
import { MobileUser, ScannedSession } from '../types';
import { mobileApi } from '../services/api';
import { NativeBiometricAuth, isNativeAndroidApp } from '../services/biometric';

interface BiometricScreenProps {
  user: MobileUser;
  session: ScannedSession;
  prestagedAmount?: number | null;
  onBiometricSuccess: () => void;
  onTriggerDuress?: () => void;
  onCancel: () => void;
}

export const BiometricScreen: React.FC<BiometricScreenProps> = ({
  user,
  session,
  prestagedAmount,
  onBiometricSuccess,
  onTriggerDuress,
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

  // Discreet duress long-press state
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const REQUIRED_PASSCODE = '1111';
  const DURESS_PASSCODE = user.duress_pin || '4321';

  const handleAuthComplete = useCallback(async (method: 'FINGERPRINT' | 'PASSCODE_FALLBACK', isDuress: boolean = false) => {
    try {
      setAuthenticating(true);
      setError(null);
      if (isDuress && onTriggerDuress) {
        onTriggerDuress();
      }

      await mobileApi.verifyLocalBiometrics(session.sessionId, user.id, method, isDuress);
      setVerified(true);
      setTimeout(() => {
        onBiometricSuccess();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed on server');
    } finally {
      setAuthenticating(false);
    }
  }, [session.sessionId, user.id, onTriggerDuress, onBiometricSuccess]);

  const triggerNativeFingerprint = useCallback(async () => {
    try {
      setAuthenticating(true);
      setError(null);
      setPasscodeError(null);

      const result = await NativeBiometricAuth.authenticate({
        title: 'Private Wealth Biometric Access',
        subtitle: `Concierge Terminal ${session.kioskId} • Touch sensor`,
        cancelButtonText: 'Use Security Code (1111)',
      });

      if (result.success) {
        await handleAuthComplete('FINGERPRINT', false);
      } else {
        setError(result.error || 'Biometric verification canceled.');
        setUsePasscodeMode(true);
      }
    } catch (err: unknown) {
      console.warn('Native biometric error, switching to passcode fallback:', err);
      setError('Biometric hardware unavailable. Please use the 4-digit security code.');
      setUsePasscodeMode(true);
    } finally {
      setAuthenticating(false);
    }
  }, [session.kioskId, handleAuthComplete]);

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
              setTimeout(() => {
                triggerNativeFingerprint();
              }, 300);
            } else {
              setUsePasscodeMode(true);
            }
          }
        } else {
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

  const handleDigit = (digit: string) => {
    if (passcode.length >= 4) return;
    const nextPin = passcode + digit;
    setPasscode(nextPin);
    setPasscodeError(null);

    if (nextPin.length === 4) {
      if (nextPin === DURESS_PASSCODE) {
        handleAuthComplete('PASSCODE_FALLBACK', true);
      } else if (nextPin === REQUIRED_PASSCODE) {
        handleAuthComplete('PASSCODE_FALLBACK', false);
      } else {
        setPasscodeError('Incorrect Security Code. (Hint: 1111)');
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

  // Feature 4: Discreet Long-press (2s) on the Shield Icon for Silent Duress
  const handleShieldTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (onTriggerDuress) {
        onTriggerDuress();
      }
      handleAuthComplete('PASSCODE_FALLBACK', true);
    }, 2000);
  };

  const handleShieldTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-[#F5F2EB] text-[#171715] select-none font-sans relative overflow-hidden antialiased">
      {/* Top Banner */}
      <div className="pt-1 text-center relative z-10">
        <div
          onTouchStart={handleShieldTouchStart}
          onTouchEnd={handleShieldTouchEnd}
          onMouseDown={handleShieldTouchStart}
          onMouseUp={handleShieldTouchEnd}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FCFBF8] text-[#171715] text-[11px] font-semibold border border-[#E6E0D4] shadow-warm-xs cursor-pointer"
          title="Hardware Protected Enclave"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#155E43]" />
          <span className="font-mono">Concierge Terminal: {session.kioskId}</span>
        </div>

        {prestagedAmount && (
          <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F4EFE4] border border-[#E2D4BC] text-[#B5935A] text-[10px] font-mono font-semibold">
            <Zap className="w-3 h-3 text-[#B5935A] fill-[#B5935A]" />
            <span>Express ₹{prestagedAmount.toLocaleString()} Pre-Staged</span>
          </div>
        )}

        <h2 className="text-xl sm:text-2xl font-serif font-semibold text-[#171715] mt-2.5 tracking-tight">
          {usePasscodeMode ? 'Enter Security Code' : 'Biometric Identity Verification'}
        </h2>
        <p className="text-xs text-[#666156] mt-1 max-w-xs mx-auto font-sans leading-relaxed">
          {usePasscodeMode
            ? 'Enter your 4-digit security code to authorize this concierge withdrawal.'
            : 'Touch the hardware biometric sensor to verify your identity.'}
        </p>
      </div>

      {/* Main Content Area */}
      {usePasscodeMode ? (
        /* ================= PASSCODE (1111) MODE ================= */
        <div className="my-auto flex flex-col items-center max-w-xs mx-auto w-full relative z-10">
          {/* PIN Dots Display */}
          <div className="flex items-center justify-center space-x-3.5 mb-3">
            {[0, 1, 2, 3].map((idx) => {
              const filled = passcode.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border transition-all duration-200 ${
                    verified
                      ? 'bg-[#155E43] border-[#155E43] scale-110 shadow-warm-xs'
                      : passcodeError
                      ? 'bg-[#9F1239] border-[#9F1239]'
                      : filled
                      ? 'bg-[#102A22] border-[#102A22] scale-105'
                      : 'border-[#D8D2C5] bg-[#FCFBF8]'
                  }`}
                />
              );
            })}
          </div>

          <div className="mb-4">
            <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-[#F4EFE4] text-[#B5935A] border border-[#E2D4BC]">
              Standard Code: <strong className="text-[#102A22] font-bold">1111</strong>
            </span>
          </div>

          {passcodeError && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs flex items-center gap-1.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#9F1239]" />
              <span>{passcodeError}</span>
            </div>
          )}

          {verified && (
            <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#EBF5F0] border border-[#CDE5D9] text-[#155E43] text-xs flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#155E43]" />
              <span>Identity Verified</span>
            </div>
          )}

          {/* Clean Tactile 3x4 Keypad in Swiss Warm Styling */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <motion.button
                key={digit}
                whileTap={{ scale: 0.94 }}
                type="button"
                disabled={authenticating || verified}
                onClick={() => handleDigit(digit)}
                className="h-12 rounded-xl bg-[#FCFBF8] hover:bg-white border border-[#E6E0D4] text-[#171715] font-mono font-semibold text-lg shadow-warm-xs transition flex items-center justify-center disabled:opacity-50 hover:border-[#B5935A]"
              >
                {digit}
              </motion.button>
            ))}
            <button
              type="button"
              disabled={authenticating || verified}
              onClick={handleClear}
              className="h-12 rounded-xl bg-[#F5F2EB] hover:bg-white border border-[#E6E0D4] text-[#666156] text-xs font-mono font-medium transition flex items-center justify-center disabled:opacity-50"
            >
              CLR
            </button>
            <motion.button
              whileTap={{ scale: 0.94 }}
              type="button"
              disabled={authenticating || verified}
              onClick={() => handleDigit('0')}
              className="h-12 rounded-xl bg-[#FCFBF8] hover:bg-white border border-[#E6E0D4] text-[#171715] font-mono font-semibold text-lg shadow-warm-xs transition flex items-center justify-center disabled:opacity-50 hover:border-[#B5935A]"
            >
              0
            </motion.button>
            <button
              type="button"
              disabled={authenticating || verified}
              onClick={handleBackspace}
              className="h-12 rounded-xl bg-[#F5F2EB] hover:bg-white border border-[#E6E0D4] text-[#666156] transition flex items-center justify-center disabled:opacity-50"
            >
              <Delete className="w-4 h-4 text-[#666156]" />
            </button>
          </div>

          <button
            type="button"
            disabled={authenticating || verified}
            onClick={() => {
              setPasscode('1111');
              handleAuthComplete('PASSCODE_FALLBACK', false);
            }}
            className="mt-3.5 text-[11px] text-[#666156] hover:text-[#102A22] font-mono underline"
          >
            Auto-fill Security Code 1111
          </button>
        </div>
      ) : (
        /* ================= NATIVE FINGERPRINT SENSOR MODE WITH CONCENTRIC CALM BREATHING RINGS ================= */
        <div className="my-auto flex flex-col items-center relative z-10">
          <div className="relative flex items-center justify-center p-8">
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.35, 0.65, 0.35],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full bg-[#F4EFE4]/80 border border-[#B5935A]/30"
            />
            <motion.div
              animate={{
                scale: [1, 1.45, 1],
                opacity: [0.15, 0.4, 0.15],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.4,
              }}
              className="absolute inset-[-12px] rounded-full bg-[#EBF5F0]/60 border border-[#155E43]/20"
            />

            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={triggerNativeFingerprint}
              disabled={authenticating || verified || checkingHardware}
              className={`p-9 rounded-full border-2 transition-all focus:outline-none relative z-10 ${
                verified
                  ? 'bg-[#EBF5F0] border-[#155E43] shadow-warm-sm'
                  : authenticating
                  ? 'bg-[#FCFBF8] border-[#B5935A] shadow-warm-sm'
                  : 'bg-[#FCFBF8] border-[#E6E0D4] hover:border-[#B5935A] shadow-warm-md'
              }`}
            >
              {verified ? (
                <CheckCircle2 className="w-16 h-16 text-[#155E43]" />
              ) : authenticating ? (
                <RefreshCw className="w-16 h-16 text-[#B5935A] animate-spin" />
              ) : (
                <Fingerprint className="w-16 h-16 text-[#102A22]" />
              )}
            </motion.button>
          </div>

          <p className="mt-4 text-xs font-serif font-semibold text-[#171715]">
            {verified
              ? 'Biometrics Verified!'
              : authenticating
              ? 'Scanning Fingerprint on Enclave...'
              : 'Tap to Scan Device Fingerprint'}
          </p>

          <p className="text-[10px] text-[#9A9386] mt-1 max-w-[220px] font-mono text-center">
            Hardware Biometric Enclave
          </p>

          {error && (
            <div className="mt-3 p-2.5 rounded-xl bg-[#FDF2F4] border border-[#F7D1D9] text-[#9F1239] text-xs max-w-xs font-mono">
              {error}
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setUsePasscodeMode(true)}
            className="mt-5 px-4 py-2 rounded-xl bg-[#FCFBF8] hover:bg-white border border-[#E6E0D4] text-[#171715] text-xs font-sans font-medium flex items-center gap-1.5 transition shadow-warm-xs"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#B5935A]" />
            <span>Use Security Code (1111) Instead</span>
          </motion.button>
        </div>
      )}

      {/* Footer Controls */}
      <div className="pt-3 border-t border-[#E6E0D4] flex items-center justify-between relative z-10">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#666156] hover:text-[#171715] font-sans font-medium flex items-center gap-1 transition"
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
            className="text-xs text-[#102A22] hover:underline font-sans font-medium flex items-center gap-1 transition"
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
