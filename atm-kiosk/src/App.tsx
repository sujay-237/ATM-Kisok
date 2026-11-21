import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { SessionQRCode } from './components/SessionQRCode';
import { AuthProcessingScreen } from './components/AuthProcessingScreen';
import { AmountSelectionScreen } from './components/AmountSelectionScreen';
import { CashDispenser } from './components/CashDispenser';
import { TransactionSuccessScreen } from './components/TransactionSuccessScreen';
import { KioskStep, KioskSession, KioskUser, TransactionSuccessData } from './types';
import { sounds } from './utils/sound';

const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
const API_BASE = `http://${hostname}:8000`;
const WS_BASE = `ws://${hostname}:8000`;
const KIOSK_ID = 'KIOSK-EAST-01';

export const App: React.FC = () => {
  const [step, setStep] = useState<KioskStep>('QR_DISPLAY');
  const [session, setSession] = useState<KioskSession | null>(null);
  const [loadingSession, setLoadingSession] = useState<boolean>(true);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<KioskUser | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [transactionData, setTransactionData] = useState<TransactionSuccessData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Security & Feature State
  const [isExpressWithdrawal, setIsExpressWithdrawal] = useState<boolean>(false);
  const [shoulderSurfingDetected, setShoulderSurfingDetected] = useState<boolean>(false);
  const [disguiseDetected, setDisguiseDetected] = useState<boolean>(false);
  const [threatReason, setThreatReason] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const isWithdrawingRef = useRef<boolean>(false);
  const stepRef = useRef<KioskStep>(step);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Initialize a new session token from FastAPI backend
  const createNewSession = useCallback(async () => {
    try {
      setLoadingSession(true);
      setErrorMessage(null);
      setAuthenticatedUser(null);
      setTransactionData(null);
      setIsExpressWithdrawal(false);
      setShoulderSurfingDetected(false);
      setDisguiseDetected(false);
      setThreatReason(null);
      setTerminationReason(null);
      stepRef.current = 'QR_DISPLAY';
      setStep('QR_DISPLAY');

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      const res = await fetch(`${API_BASE}/api/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kiosk_id: KIOSK_ID }),
      });

      if (!res.ok) {
        throw new Error('Failed to create kiosk session');
      }

      const data: KioskSession = await res.json();
      setSession(data);
    } catch (err: unknown) {
      console.error('Session creation error:', err);
      setErrorMessage('Could not connect to ATM backend server. Please verify backend is running on port 8000.');
    } finally {
      setLoadingSession(false);
    }
  }, []);

  // Execute Withdrawal API call
  const handleConfirmWithdrawal = useCallback(async (amount: number, pin?: string, isDuress?: boolean) => {
    if (!session || !authenticatedUser) return;
    if (isWithdrawingRef.current || loadingSession) return;
    isWithdrawingRef.current = true;

    try {
      setLoadingSession(true);
      setErrorMessage(null);

      const res = await fetch(`${API_BASE}/api/transactions/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.session_id,
          user_id: authenticatedUser.id,
          amount: amount,
          pin: pin,
          is_duress: isDuress || false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Withdrawal failed');
      }

      const txResult = await res.json();
      const actualDispensed = txResult.amount || amount;
      setWithdrawalAmount(actualDispensed);

      // Extract fresh remaining balance from backend
      const remaining = typeof txResult.remaining_balance === 'number'
        ? txResult.remaining_balance
        : typeof txResult.new_balance === 'number'
        ? txResult.new_balance
        : Math.max(0, (authenticatedUser.account_balance - actualDispensed));
      
      setTransactionData({
        transaction_id: txResult.id,
        amount: actualDispensed,
        remaining_balance: remaining,
        anomaly_flag: txResult.anomaly_flag || false,
        is_duress: txResult.is_duress || false,
        prestaged: isExpressWithdrawal,
        timestamp: txResult.created_at || new Date().toISOString(),
      });

      // Update user account balance state immediately
      setAuthenticatedUser((prev) => (prev ? { ...prev, account_balance: remaining } : prev));
      setErrorMessage(null);
      stepRef.current = 'DISPENSING';
      setStep('DISPENSING');
    } catch (err: unknown) {
      sounds.playError();
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      setErrorMessage(msg);
    } finally {
      setLoadingSession(false);
      isWithdrawingRef.current = false;
    }
  }, [session, authenticatedUser, loadingSession, isExpressWithdrawal]);

  // Connect WebSocket listening for this session ID
  useEffect(() => {
    if (!session?.session_id) return;

    const wsUrl = `${WS_BASE}/ws/kiosk/${session.session_id}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      console.log(`[ATM WS] Connected to session ${session.session_id}`);
    };

    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[ATM WS] Incoming update:', payload);

        // Feature 2: Admin Kill Switch (SESSION_TERMINATED)
        if (payload.type === 'SESSION_TERMINATED' || payload.event === 'SESSION_TERMINATED') {
          sounds.playError();
          setTerminationReason(payload.reason || 'Terminated by Central Risk Committee');
          stepRef.current = 'TERMINATED';
          setStep('TERMINATED');
          setTimeout(() => {
            createNewSession();
          }, 5000);
          return;
        }

        if (payload.event === 'QR_SCANNED' || payload.status === 'QR_SCANNED') {
          if (stepRef.current === 'QR_DISPLAY') {
            sounds.playKeypadBeep();
            if (payload.prestaged_amount) {
              setWithdrawalAmount(payload.prestaged_amount);
              setIsExpressWithdrawal(true);
            }
            setStep('MOBILE_SCANNED');
          }
        } else if (payload.event === 'BIOMETRICS_VERIFIED' || payload.status === 'BIOMETRICS_VERIFIED') {
          if (stepRef.current === 'QR_DISPLAY' || stepRef.current === 'MOBILE_SCANNED') {
            sounds.playKeypadBeep();
            setStep('BIOMETRIC_VERIFYING');
          }
        } else if (payload.event === 'AUTHORIZED' || payload.status === 'AUTHORIZED') {
          let userObj = payload.user;
          if (!userObj && payload.user_id) {
            try {
              const uRes = await fetch(`${API_BASE}/api/users/${payload.user_id}`);
              if (uRes.ok) userObj = await uRes.json();
            } catch (err) {
              console.warn('Could not fetch user details:', err);
            }
          }
          if (userObj) {
            setAuthenticatedUser(userObj);
          }

          // Feature 3: Check Threat / Shoulder Surfing Detection
          const threatDetected = Boolean(payload.shoulder_surfing_detected || payload.disguise_detected);
          setShoulderSurfingDetected(Boolean(payload.shoulder_surfing_detected));
          setDisguiseDetected(Boolean(payload.disguise_detected));
          setThreatReason(payload.threat_reason || null);

          // Feature 1: Pre-Staged "10-Second" Withdrawals Check
          const prestaged = payload.prestaged_amount ? parseFloat(payload.prestaged_amount) : null;

          if (prestaged && prestaged > 0 && !threatDetected) {
            // No threat hold -> skip AmountSelectionScreen and trigger instant withdrawal!
            setIsExpressWithdrawal(true);
            setWithdrawalAmount(prestaged);
            sounds.playAuthSuccess();
            if (userObj) {
              try {
                const res = await fetch(`${API_BASE}/api/transactions/withdraw`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    session_id: session.session_id,
                    user_id: userObj.id,
                    amount: prestaged,
                    is_duress: Boolean(payload.is_duress),
                  }),
                });
                if (res.ok) {
                  const txResult = await res.json();
                  const remaining = typeof txResult.remaining_balance === 'number'
                    ? txResult.remaining_balance
                    : typeof txResult.new_balance === 'number'
                    ? txResult.new_balance
                    : Math.max(0, (userObj.account_balance - prestaged));
                  setTransactionData({
                    transaction_id: txResult.id,
                    amount: txResult.amount || prestaged,
                    remaining_balance: remaining,
                    anomaly_flag: txResult.anomaly_flag || false,
                    is_duress: txResult.is_duress || false,
                    prestaged: true,
                    timestamp: txResult.created_at || new Date().toISOString(),
                  });
                  setAuthenticatedUser((prev) => (prev ? { ...prev, account_balance: remaining } : prev));
                  setStep('DISPENSING');
                  stepRef.current = 'DISPENSING';
                  return;
                }
              } catch (e) {
                console.warn('Instant express withdrawal fallback to manual screen:', e);
              }
            }
          }

          // If threat detected or manual amount needed:
          if (
            stepRef.current !== 'SELECT_AMOUNT' &&
            stepRef.current !== 'DISPENSING' &&
            stepRef.current !== 'SUCCESS'
          ) {
            sounds.playAuthSuccess();
            setStep('SELECT_AMOUNT');
          }
        } else if (payload.event === 'DISPENSING_CASH' || payload.status === 'COMPLETED') {
          if (payload.amount) {
            setWithdrawalAmount(payload.amount);
          }
          const remaining = payload.remaining_balance ?? payload.new_balance;
          if (typeof remaining === 'number') {
            setAuthenticatedUser((prev) => (prev ? { ...prev, account_balance: remaining } : prev));
          }
          if (payload.transaction_id) {
            setTransactionData((prev) => ({
              transaction_id: payload.transaction_id,
              amount: payload.amount ?? prev?.amount ?? 1000,
              remaining_balance: remaining ?? prev?.remaining_balance ?? 0,
              anomaly_flag: payload.anomaly_flag ?? prev?.anomaly_flag ?? false,
              is_duress: payload.is_duress ?? prev?.is_duress ?? false,
              prestaged: isExpressWithdrawal,
              timestamp: prev?.timestamp || new Date().toISOString(),
            }));
          }
          if (stepRef.current !== 'DISPENSING' && stepRef.current !== 'SUCCESS') {
            setStep('DISPENSING');
          }
        } else if (payload.event === 'AUTH_FAILED' || payload.status === 'FAILED') {
          if (stepRef.current !== 'DISPENSING' && stepRef.current !== 'SUCCESS') {
            sounds.playError();
            setErrorMessage(payload.reason || 'Biometric authentication failed. Access denied.');
            setTimeout(() => {
              createNewSession();
            }, 4000);
          }
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [session?.session_id, createNewSession, isExpressWithdrawal]);

  // Polling fallback
  useEffect(() => {
    if (!session?.session_id) return;
    if (step === 'SELECT_AMOUNT' || step === 'DISPENSING' || step === 'SUCCESS' || step === 'TERMINATED') return;

    let isCancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/session/${session.session_id}`);
        if (!res.ok || isCancelled) return;
        const data = await res.json();
        if (isCancelled) return;

        const curStep = stepRef.current as string;
        if (curStep === 'SELECT_AMOUNT' || curStep === 'DISPENSING' || curStep === 'SUCCESS' || curStep === 'TERMINATED') {
          return;
        }

        if (data.status === 'TERMINATED') {
          sounds.playError();
          setTerminationReason('Terminated by Central Risk Committee');
          setStep('TERMINATED');
          setTimeout(() => {
            if (!isCancelled) createNewSession();
          }, 5000);
          return;
        }

        if (data.status === 'QR_SCANNED' && curStep === 'QR_DISPLAY') {
          sounds.playKeypadBeep();
          setStep('MOBILE_SCANNED');
        } else if (data.status === 'BIOMETRICS_VERIFIED' && (curStep === 'QR_DISPLAY' || curStep === 'MOBILE_SCANNED')) {
          sounds.playKeypadBeep();
          setStep('BIOMETRIC_VERIFYING');
        } else if (data.status === 'AUTHORIZED') {
          sounds.playAuthSuccess();
          if (data.user) setAuthenticatedUser(data.user);
          setStep('SELECT_AMOUNT');
        } else if (data.status === 'FAILED') {
          sounds.playError();
          setErrorMessage(data.failure_reason || 'Biometric authentication failed.');
          setTimeout(() => {
            if (!isCancelled) createNewSession();
          }, 4000);
        }
      } catch {
        // Ignore polling errors
      }
    }, 1200);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [session?.session_id, step, createNewSession]);

  useEffect(() => {
    createNewSession();
  }, [createNewSession]);

  const handleDispenseComplete = useCallback(() => {
    console.log('[ATM] Cash dispense finished. Advancing to receipt screen.');
    stepRef.current = 'SUCCESS';
    setStep('SUCCESS');
  }, []);

  // Simulator helper
  const handleSimulateMobileScanAndAuth = async () => {
    if (!session) return;
    try {
      sounds.playKeypadBeep();
      setStep('MOBILE_SCANNED');

      await fetch(`${API_BASE}/api/session/${session.session_id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'sujay',
          device_info: 'Sentinel Concierge Simulator',
          prestaged_amount: 1000,
        }),
      }).catch(() => null);

      const usersRes = await fetch(`${API_BASE}/api/users`);
      const users = await usersRes.json();
      const registeredUser = users.find((u: { role: string }) => u.role === 'user') || users[0];

      if (!registeredUser) {
        alert('No user accounts registered yet.');
        setStep('QR_DISPLAY');
        return;
      }

      setTimeout(async () => {
        setStep('BIOMETRIC_VERIFYING');
        await fetch(`${API_BASE}/api/session/${session.session_id}/biometric-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: registeredUser.id,
            biometric_type: 'FINGERPRINT',
            local_auth_passed: true,
            prestaged_amount: 1000,
          }),
        }).catch(() => null);

        setTimeout(async () => {
          const photoRes = await fetch(`${API_BASE}/api/users/${registeredUser.id}/reference-photo`);
          const photoData = await photoRes.json();

          await fetch(`${API_BASE}/api/verify-selfie`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: session.session_id,
              user_id: registeredUser.id,
              live_selfie_base64: photoData.reference_selfie || '',
              prestaged_amount: 1000,
            }),
          });
        }, 1200);
      }, 800);
    } catch (e) {
      console.error('Simulation error:', e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F2EB] text-[#171715] flex flex-col justify-between selection:bg-[#E2D4BC] selection:text-[#171715] font-sans relative">
      {/* Concierge Terminal Top Bar */}
      <Header kioskId={KIOSK_ID} wsConnected={wsConnected} />

      {/* Main Screen Content with AnimatePresence */}
      <main className="flex-1 flex flex-col justify-center px-4 py-6 relative z-10">
        <AnimatePresence mode="wait">
          {step === 'QR_DISPLAY' && (
            <SessionQRCode
              key="qr"
              session={session}
              loading={loadingSession}
              onRefresh={createNewSession}
              onSimulateMobileScan={handleSimulateMobileScanAndAuth}
            />
          )}

          {(step === 'MOBILE_SCANNED' || step === 'BIOMETRIC_VERIFYING') && (
            <AuthProcessingScreen
              key="auth-processing"
              step={step}
              userName={authenticatedUser?.full_name}
              onCancel={createNewSession}
            />
          )}

          {step === 'SELECT_AMOUNT' && (
            authenticatedUser ? (
              <AmountSelectionScreen
                key="amount"
                user={authenticatedUser}
                onConfirmWithdrawal={handleConfirmWithdrawal}
                onCancel={createNewSession}
                loading={loadingSession}
                error={errorMessage}
                shoulderSurfingDetected={shoulderSurfingDetected}
                disguiseDetected={disguiseDetected}
                threatReason={threatReason}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 bg-[#FCFBF8] border border-[#E6E0D4] rounded-3xl max-w-sm mx-auto text-center shadow-warm-sm">
                <RefreshCw className="w-8 h-8 text-[#B5935A] animate-spin mb-3" />
                <h3 className="text-base font-serif font-semibold text-[#171715]">Client Verified</h3>
                <p className="text-xs text-[#666156] mt-1 font-sans">Retrieving account limits and reserves...</p>
              </div>
            )
          )}

          {step === 'DISPENSING' && (
            <CashDispenser
              key="dispensing"
              amount={withdrawalAmount}
              newBalance={transactionData?.remaining_balance}
              isExpress={isExpressWithdrawal}
              onDispenseComplete={handleDispenseComplete}
            />
          )}

          {step === 'SUCCESS' && (
            <TransactionSuccessScreen
              key="success"
              user={authenticatedUser || {
                id: 'user',
                full_name: 'Private Client',
                account_balance: 25000,
                role: 'user',
              }}
              data={transactionData || {
                transaction_id: session?.session_id || 'TXN-SUCCESS',
                amount: withdrawalAmount || 1000,
                remaining_balance: (authenticatedUser?.account_balance ?? 25000) - (withdrawalAmount || 1000),
                anomaly_flag: false,
                prestaged: isExpressWithdrawal,
                timestamp: new Date().toISOString(),
              }}
              onFinish={createNewSession}
            />
          )}

          {/* Feature 2: Admin Kill Switch Lockout Overlay Screen */}
          {step === 'TERMINATED' && (
            <motion.div
              key="terminated"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto p-8 rounded-3xl bg-[#FDF2F4] border border-[#F7D1D9] shadow-warm-lg text-center my-auto"
            >
              <div className="w-16 h-16 rounded-full bg-[#FAF8F3] border border-[#F7D1D9] flex items-center justify-center mx-auto mb-4 text-[#9F1239]">
                <Lock className="w-8 h-8 stroke-[2.2]" />
              </div>
              <h2 className="text-2xl font-serif font-semibold text-[#9F1239] tracking-tight">
                Session Terminated by Risk Operations
              </h2>
              <p className="text-xs text-[#9F1239] font-mono mt-2 mb-4">
                {terminationReason || 'Terminal lockout enforced by Central Risk Committee.'}
              </p>
              <div className="p-3 rounded-xl bg-[#FAF8F3] border border-[#F7D1D9] text-[#666156] text-xs font-sans">
                This transaction has been securely halted. Resetting terminal in 5 seconds...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Swiss Private Banking Footer */}
      <footer className="w-full bg-[#FCFBF8]/95 border-t border-[#E6E0D4] py-3.5 px-8 text-center text-xs text-[#666156] flex flex-col sm:flex-row items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#155E43] inline-block" />
          <span className="text-[#171715] font-medium font-sans">Sentinel Core Architecture • Cryptographic Isolation Active</span>
        </div>
        <div className="text-[#9A9386] font-mono text-[11px] mt-1 sm:mt-0">
          SENTINEL PRIVATE BANK • GENÈVE • SWISS PRIVATE BANKING ACCREDITATION • TERMINAL #{KIOSK_ID}
        </div>
      </footer>
    </div>
  );
};
export default App;
