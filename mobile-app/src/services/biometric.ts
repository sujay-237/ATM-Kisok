import { registerPlugin, Capacitor } from '@capacitor/core';

export interface BiometricCheckResult {
  isAvailable: boolean;
  status?: number;
  error?: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  code?: number;
}

export interface BiometricAuthPlugin {
  checkBiometry(): Promise<BiometricCheckResult>;
  authenticate(options?: {
    title?: string;
    subtitle?: string;
    cancelButtonText?: string;
  }): Promise<BiometricAuthResult>;
}

class BiometricAuthWeb implements BiometricAuthPlugin {
  async checkBiometry(): Promise<BiometricCheckResult> {
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return { isAvailable: available };
      } catch {
        return { isAvailable: false };
      }
    }
    return { isAvailable: false };
  }

  async authenticate(): Promise<BiometricAuthResult> {
    return { success: false, error: 'WEB_FALLBACK_REQUIRED' };
  }
}

export const NativeBiometricAuth = registerPlugin<BiometricAuthPlugin>('BiometricAuth', {
  web: () => new BiometricAuthWeb(),
});

export const isNativeAndroidApp = (): boolean => {
  return Capacitor.isNativePlatform();
};
