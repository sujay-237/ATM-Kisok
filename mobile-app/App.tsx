import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenName, MobileUser, ScannedSession, VerificationResult } from './src/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { BiometricScreen } from './src/screens/BiometricScreen';
import { SelfieScreen } from './src/screens/SelfieScreen';
import { SuccessScreen } from './src/screens/SuccessScreen';
import { mobileApi } from './src/services/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('LOGIN');
  const [currentUser, setCurrentUser] = useState<MobileUser | null>(null);
  const [activeSession, setActiveSession] = useState<ScannedSession | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [prestagedAmount, setPrestagedAmount] = useState<number | null>(null);
  const [isDuressMode, setIsDuressMode] = useState<boolean>(false);

  // Critical Balance Deduction: Refresh user profile directly from fresh MongoDB state
  const refreshUserBalance = useCallback(async () => {
    if (!currentUser) return;
    try {
      const freshUser = await mobileApi.getUser(currentUser.id);
      if (freshUser) {
        setCurrentUser(freshUser);
      }
    } catch (err) {
      console.warn('Could not refresh user balance:', err);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: MobileUser) => {
    setCurrentUser(user);
    setCurrentScreen('HOME');
  };

  const handleRegisterSuccess = (user: MobileUser) => {
    setCurrentUser(user);
    setCurrentScreen('HOME');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSession(null);
    setVerificationResult(null);
    setPrestagedAmount(null);
    setIsDuressMode(false);
    setCurrentScreen('LOGIN');
  };

  const handleStartATMScan = () => {
    setCurrentScreen('QR_SCANNER');
  };

  const handleScanSuccess = (session: ScannedSession) => {
    setActiveSession({
      ...session,
      prestaged_amount: prestagedAmount,
    });
    setCurrentScreen('BIOMETRIC');
  };

  const handleBiometricSuccess = () => {
    setCurrentScreen('SELFIE');
  };

  const handleTriggerDuress = () => {
    setIsDuressMode(true);
  };

  const handleVerificationSuccess = (result: VerificationResult) => {
    setVerificationResult({
      ...result,
      prestaged_amount: prestagedAmount,
      is_duress: isDuressMode,
    });
    setCurrentScreen('SUCCESS');
  };

  const handleFinishSession = () => {
    refreshUserBalance();
    setActiveSession(null);
    setVerificationResult(null);
    setPrestagedAmount(null);
    setIsDuressMode(false);
    setCurrentScreen('HOME');
  };

  return (
    <div className="mobile-device-frame bg-[#F5F2EB] text-[#171715] flex flex-col font-sans select-none overflow-hidden antialiased relative">
      {/* Device Status Bar - Swiss Private Banking Refined Header */}
      <div className="w-full bg-[#FCFBF8]/95 px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-mono text-[#666156] select-none z-30 border-b border-[#E6E0D4]">
        <span className="font-semibold text-[#171715] tracking-wider">9:41</span>
        {/* Subtle camera / speaker notch */}
        <div className="w-16 h-3 bg-[#F5F2EB] border border-[#E6E0D4] rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#9A9386] mr-1" />
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] text-[#666156] font-mono">
          <span className="font-bold text-[#102A22]">5G</span>
          <span>100%</span>
        </div>
      </div>

      {/* Screen Router with AnimatePresence */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#F5F2EB]">
        <AnimatePresence mode="wait">
          {currentScreen === 'LOGIN' && (
            <motion.div
              key="screen-login"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <LoginScreen
                onLoginSuccess={handleLoginSuccess}
                onGoToRegister={() => setCurrentScreen('REGISTER')}
              />
            </motion.div>
          )}

          {currentScreen === 'REGISTER' && (
            <motion.div
              key="screen-register"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <RegisterScreen
                onRegisterSuccess={handleRegisterSuccess}
                onBack={() => setCurrentScreen('LOGIN')}
              />
            </motion.div>
          )}

          {currentScreen === 'HOME' && currentUser && (
            <motion.div
              key="screen-home"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <HomeScreen
                user={currentUser}
                prestagedAmount={prestagedAmount}
                onSetPrestagedAmount={setPrestagedAmount}
                onStartATMScan={handleStartATMScan}
                onRefreshBalance={refreshUserBalance}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {currentScreen === 'QR_SCANNER' && currentUser && (
            <motion.div
              key="screen-qr"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <QRScannerScreen
                user={currentUser}
                prestagedAmount={prestagedAmount}
                onScanSuccess={handleScanSuccess}
                onBack={() => setCurrentScreen('HOME')}
              />
            </motion.div>
          )}

          {currentScreen === 'BIOMETRIC' && currentUser && activeSession && (
            <motion.div
              key="screen-biometric"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <BiometricScreen
                user={currentUser}
                session={activeSession}
                prestagedAmount={prestagedAmount}
                onBiometricSuccess={handleBiometricSuccess}
                onTriggerDuress={handleTriggerDuress}
                onCancel={() => setCurrentScreen('HOME')}
              />
            </motion.div>
          )}

          {currentScreen === 'SELFIE' && currentUser && activeSession && (
            <motion.div
              key="screen-selfie"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <SelfieScreen
                user={currentUser}
                session={activeSession}
                prestagedAmount={prestagedAmount}
                isDuressMode={isDuressMode}
                onVerificationSuccess={handleVerificationSuccess}
                onFailed={(err) => console.warn(err)}
              />
            </motion.div>
          )}

          {currentScreen === 'SUCCESS' && verificationResult && (
            <motion.div
              key="screen-success"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <SuccessScreen
                result={verificationResult}
                session={activeSession}
                user={currentUser}
                prestagedAmount={prestagedAmount}
                onRefreshBalance={refreshUserBalance}
                onFinish={handleFinishSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Device Home Indicator Bar */}
      <div className="w-full bg-[#FCFBF8] py-2.5 flex items-center justify-center select-none border-t border-[#E6E0D4]">
        <div className="w-28 h-1 bg-[#D8D2C5] rounded-full" />
      </div>
    </div>
  );
}
