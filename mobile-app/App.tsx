import React, { useState } from 'react';
import { ScreenName, MobileUser, ScannedSession, VerificationResult } from './src/types';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { QRScannerScreen } from './src/screens/QRScannerScreen';
import { BiometricScreen } from './src/screens/BiometricScreen';
import { SelfieScreen } from './src/screens/SelfieScreen';
import { SuccessScreen } from './src/screens/SuccessScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('LOGIN');
  const [currentUser, setCurrentUser] = useState<MobileUser | null>(null);
  const [activeSession, setActiveSession] = useState<ScannedSession | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

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
    setCurrentScreen('LOGIN');
  };

  const handleStartATMScan = () => {
    setCurrentScreen('QR_SCANNER');
  };

  const handleScanSuccess = (session: ScannedSession) => {
    setActiveSession(session);
    setCurrentScreen('BIOMETRIC');
  };

  const handleBiometricSuccess = () => {
    setCurrentScreen('SELFIE');
  };

  const handleVerificationSuccess = (result: VerificationResult) => {
    setVerificationResult(result);
    setCurrentScreen('SUCCESS');
  };

  return (
    <div className="mobile-device-frame">
      {/* Device Status Bar */}
      <div className="w-full bg-slate-100 px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-sans font-medium text-slate-600 select-none z-30 border-b border-slate-200">
        <span>9:41</span>
        {/* Subtle camera / speaker pill */}
        <div className="w-16 h-3.5 bg-slate-300/80 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1" />
        </div>
        <div className="flex items-center space-x-1.5 text-[10px]">
          <span>5G</span>
          <span>100%</span>
        </div>
      </div>

      {/* Screen Router */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
        {currentScreen === 'LOGIN' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onGoToRegister={() => setCurrentScreen('REGISTER')}
          />
        )}

        {currentScreen === 'REGISTER' && (
          <RegisterScreen
            onRegisterSuccess={handleRegisterSuccess}
            onBack={() => setCurrentScreen('LOGIN')}
          />
        )}

        {currentScreen === 'HOME' && currentUser && (
          <HomeScreen
            user={currentUser}
            onStartATMScan={handleStartATMScan}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'QR_SCANNER' && currentUser && (
          <QRScannerScreen
            user={currentUser}
            onScanSuccess={handleScanSuccess}
            onBack={() => setCurrentScreen('HOME')}
          />
        )}

        {currentScreen === 'BIOMETRIC' && currentUser && activeSession && (
          <BiometricScreen
            user={currentUser}
            session={activeSession}
            onBiometricSuccess={handleBiometricSuccess}
            onCancel={() => setCurrentScreen('HOME')}
          />
        )}

        {currentScreen === 'SELFIE' && currentUser && activeSession && (
          <SelfieScreen
            user={currentUser}
            session={activeSession}
            onVerificationSuccess={handleVerificationSuccess}
            onFailed={(err) => console.warn(err)}
          />
        )}

        {currentScreen === 'SUCCESS' && verificationResult && (
          <SuccessScreen
            result={verificationResult}
            onFinish={() => setCurrentScreen('HOME')}
          />
        )}
      </div>

      {/* Device Home Indicator Bar */}
      <div className="w-full bg-slate-100 py-2 flex items-center justify-center select-none border-t border-slate-200">
        <div className="w-28 h-1 bg-slate-400 rounded-full" />
      </div>
    </div>
  );
}
