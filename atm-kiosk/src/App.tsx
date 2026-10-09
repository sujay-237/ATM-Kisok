import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
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
      stepRef.current = 'QR_DISPLAY';
      setStep('QR_DISPLAY');

      // Close previous WebSocket if any
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

        if (payload.event === 'QR_SCANNED' || payload.status === 'QR_SCANNED') {
          if (stepRef.current === 'QR_DISPLAY') {
            sounds.playKeypadBeep();
            setStep('MOBILE_SCANNED');
          }
        } else if (payload.event === 'BIOMETRICS_VERIFIED' || payload.status === 'BIOMETRICS_VERIFIED') {
          if (stepRef.current === 'QR_DISPLAY' || stepRef.current === 'MOBILE_SCANNED') {
            sounds.playKeypadBeep();
            setStep('BIOMETRIC_VERIFYING');
          }
        } else if (payload.event === 'AUTHORIZED' || payload.status === 'AUTHORIZED') {
          if (payload.user) {
            setAuthenticatedUser(payload.user);
          } else if (payload.user_id) {
            try {
              const uRes = await fetch(`${API_BASE}/api/users/${payload.user_id}`);
              if (uRes.ok) {
                const uData = await uRes.json();
                setAuthenticatedUser(uData);
              }
            } catch (err) {
              console.warn('Could not fetch user details from WS payload:', err);
            }
          }
          // Guard: NEVER revert back to SELECT_AMOUNT if already dispensing cash or on receipt screen!
          if (
            stepRef.current !== 'SELECT_AMOUNT' &&
            stepRef.current !== 'DISPENSING' &&
            stepRef.current !== 'SUCCESS'
          ) {
            sounds.playAuthSuccess();
            setStep('SELECT_AMOUNT');
          }
        } else if (payload.event === 'DISPENSING_CASH' || payload.status === 'COMPLETED') {
          // Cash dispense announced
          if (payload.amount) {
            setWithdrawalAmount(payload.amount);
          }
          if (payload.transaction_id) {
            setTransactionData((prev) => ({
              transaction_id: payload.transaction_id,
              amount: payload.amount ?? prev?.amount ?? 1000,
              remaining_balance: payload.remaining_balance ?? prev?.remaining_balance ?? 0,
              anomaly_flag: payload.anomaly_flag ?? prev?.anomaly_flag ?? false,
              timestamp: prev?.timestamp || new Date().toISOString(),
            }));
          }
          // Guard: Only advance to DISPENSING if we have not already completed or currently dispensing
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

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = (e) => {
      console.warn('[ATM WS] Connection warning:', e);
      setWsConnected(false);
    };

    // Heartbeat ping every 25s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [session?.session_id, createNewSession]);

  // Polling fallback: checks backend session status in case WebSocket drops or disconnects
  useEffect(() => {
    if (!session?.session_id) return;
    if (step === 'SELECT_AMOUNT' || step === 'DISPENSING' || step === 'SUCCESS') return;

    let isCancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/session/${session.session_id}`);
        if (!res.ok || isCancelled) return;
        const data = await res.json();
        if (isCancelled) return;

        // Double check real-time step to avoid async promise race conditions
        const curStep = stepRef.current as string;
        if (
          curStep === 'SELECT_AMOUNT' ||
          curStep === 'DISPENSING' ||
          curStep === 'SUCCESS'
        ) {
          return;
        }

        if (data.status === 'QR_SCANNED' && curStep === 'QR_DISPLAY') {
          sounds.playKeypadBeep();
          setStep('MOBILE_SCANNED');
        } else if (data.status === 'BIOMETRICS_VERIFIED' && (curStep === 'QR_DISPLAY' || curStep === 'MOBILE_SCANNED')) {
          sounds.playKeypadBeep();
          setStep('BIOMETRIC_VERIFYING');
        } else if (
          data.status === 'AUTHORIZED' &&
          curStep !== 'SELECT_AMOUNT' &&
          curStep !== 'DISPENSING' &&
          curStep !== 'SUCCESS'
        ) {
          sounds.playAuthSuccess();
          if (data.user) {
            setAuthenticatedUser(data.user);
          } else if (data.user_id) {
            try {
              const uRes = await fetch(`${API_BASE}/api/users/${data.user_id}`);
              if (uRes.ok && !isCancelled) {
                const uData = await uRes.json();
                setAuthenticatedUser(uData);
              }
            } catch (err) {
              console.warn('Could not fetch user info in polling fallback:', err);
            }
          }
          if (
            (stepRef.current as string) !== 'SELECT_AMOUNT' &&
            (stepRef.current as string) !== 'DISPENSING' &&
            (stepRef.current as string) !== 'SUCCESS'
          ) {
            setStep('SELECT_AMOUNT');
          }
        } else if (
          data.status === 'FAILED' &&
          curStep !== 'DISPENSING' &&
          curStep !== 'SUCCESS'
        ) {
          sounds.playError();
          setErrorMessage(data.failure_reason || 'Biometric authentication failed. Access denied.');
          setTimeout(() => {
            if (!isCancelled) createNewSession();
          }, 4000);
        }
      } catch (err) {
        // Silently ignore network blips in polling
      }
    }, 1200);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [session?.session_id, step, createNewSession]);

  // Initial load
  useEffect(() => {
    createNewSession();
  }, [createNewSession]);

  // Execute Withdrawal API call
  const handleConfirmWithdrawal = async (amount: number) => {
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
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Withdrawal failed');
      }

      const txResult = await res.json();
      setWithdrawalAmount(amount);
      const remaining = typeof txResult.remaining_balance === 'number'
        ? txResult.remaining_balance
        : Math.max(0, (authenticatedUser.account_balance - amount));
      setTransactionData({
        transaction_id: txResult.id,
        amount: txResult.amount || amount,
        remaining_balance: remaining,
        anomaly_flag: txResult.anomaly_flag || false,
        timestamp: txResult.created_at || new Date().toISOString(),
      });

      // Update local account balance
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
  };

  const handleDispenseComplete = useCallback(() => {
    console.log('[ATM] Cash dispense finished. Advancing to receipt screen (SUCCESS).');
    stepRef.current = 'SUCCESS';
    setStep('SUCCESS');
  }, []);

  // Helper: 1-Click Simulator to test mobile pairing without opening second window
  const handleSimulateMobileScanAndAuth = async () => {
    if (!session) return;
    try {
      sounds.playKeypadBeep();
      setStep('MOBILE_SCANNED');

      // 1. Scan QR endpoint
      await fetch(`${API_BASE}/api/session/${session.session_id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'alex-placeholder', // Backend accepts username or ID
          device_info: 'ATM Kiosk Simulator',
        }),
      }).catch(() => null);

      // 2. Fetch users to find first registered customer
      const usersRes = await fetch(`${API_BASE}/api/users`);
      const users = await usersRes.json();
      const registeredUser = users.find((u: { role: string }) => u.role === 'user');

      if (!registeredUser) {
        alert('No user accounts registered yet. Please register an account first in the Web Portal (http://localhost:3001) with a selfie!');
        setStep('QR_DISPLAY');
        return;
      }

      // Simulate fingerprint after 800ms
      setTimeout(async () => {
        setStep('BIOMETRIC_VERIFYING');
        await fetch(`${API_BASE}/api/session/${session.session_id}/biometric-auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: registeredUser.id,
            biometric_type: 'FINGERPRINT',
            local_auth_passed: true,
          }),
        }).catch(() => null);

        // Simulate selfie verification with Gemini after 1.2s
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
            }),
          });
        }, 1200);
      }, 800);
    } catch (e) {
      console.error('Simulation error:', e);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Kiosk Top Bar */}
      <Header kioskId={KIOSK_ID} wsConnected={wsConnected} />

      {/* Main Screen Content */}
      <main className="flex-1 flex flex-col justify-center px-4 py-6">
        {step === 'QR_DISPLAY' && (
          <SessionQRCode
            session={session}
            loading={loadingSession}
            onRefresh={createNewSession}
            onSimulateMobileScan={handleSimulateMobileScanAndAuth}
          />
        )}

        {(step === 'MOBILE_SCANNED' || step === 'BIOMETRIC_VERIFYING') && (
          <AuthProcessingScreen
            step={step}
            userName={authenticatedUser?.full_name}
            onCancel={createNewSession}
          />
        )}

        {step === 'SELECT_AMOUNT' && (
          authenticatedUser ? (
            <AmountSelectionScreen
              user={authenticatedUser}
              onConfirmWithdrawal={handleConfirmWithdrawal}
              onCancel={createNewSession}
              loading={loadingSession}
              error={errorMessage}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-10 bg-white rounded-3xl border border-slate-200 shadow-md max-w-md mx-auto text-center">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Account Verified!</h3>
              <p className="text-xs text-slate-500 mt-1">Retrieving account balance and limits...</p>
            </div>
          )
        )}

        {step === 'DISPENSING' && (
          <CashDispenser
            amount={withdrawalAmount}
            onDispenseComplete={handleDispenseComplete}
          />
        )}

        {step === 'SUCCESS' && (
          <TransactionSuccessScreen
            user={authenticatedUser || {
              id: 'user',
              full_name: 'Customer',
              account_balance: 25000,
              role: 'user',
            }}
            data={transactionData || {
              transaction_id: session?.session_id || 'TXN-SUCCESS',
              amount: withdrawalAmount || 1000,
              remaining_balance: (authenticatedUser?.account_balance ?? 25000) - (withdrawalAmount || 1000),
              anomaly_flag: false,
              timestamp: new Date().toISOString(),
            }}
            onFinish={createNewSession}
          />
        )}
      </main>

      {/* Clean Light Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-3 px-8 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Contactless ATM Architecture • Encrypted Cardless Access</span>
        </div>
        <div className="text-slate-400 mt-1 sm:mt-0 font-medium">
          National Trust Bank • Member FDIC
        </div>
      </footer>
    </div>
  );
};
export default App;
