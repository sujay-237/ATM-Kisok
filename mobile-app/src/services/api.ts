import { Capacitor } from '@capacitor/core';
import { MobileUser, VerificationResult, DelegationItem } from '../types';

// Default LAN IP of development host machine
const DEFAULT_HOST_IP = '192.168.1.13';

export function getDefaultApiBase(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('atm_api_base');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }

  // Check if running inside Capacitor Android native container
  if (Capacitor.isNativePlatform()) {
    return `http://${DEFAULT_HOST_IP}:8000`;
  }

  // Running in browser
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:8000`;
  }

  return 'http://localhost:8000';
}

export function setApiBase(url: string): string {
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem('atm_api_base', cleaned);
  }
  return cleaned;
}

export function getApiBase(): string {
  return getDefaultApiBase();
}

export const mobileApi = {
  getBaseUrl(): string {
    return getApiBase();
  },

  setBaseUrl(url: string): string {
    return setApiBase(url);
  },

  async testConnection(customUrl?: string): Promise<{ ok: boolean; message: string }> {
    const target = customUrl ? customUrl.trim().replace(/\/+$/, '') : getApiBase();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${target}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return { ok: true, message: 'Server is online and reachable!' };
      }
      return { ok: false, message: `Server returned status ${res.status}` };
    } catch (e: unknown) {
      const err = e as { name?: string };
      return {
        ok: false,
        message: err.name === 'AbortError' ? 'Connection timed out (check port 8000 & Wi-Fi)' : 'Failed to reach server (ensure PC & phone are on same Wi-Fi)',
      };
    }
  },

  async getUsers(): Promise<MobileUser[]> {
    const res = await fetch(`${getApiBase()}/api/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getUser(id: string): Promise<MobileUser> {
    const res = await fetch(`${getApiBase()}/api/users/${id}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  async login(username: string, pin: string): Promise<{ token: string; user: MobileUser }> {
    const res = await fetch(`${getApiBase()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, pin }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid username or PIN');
    }
    return res.json();
  },

  async register(data: {
    full_name: string;
    username: string;
    email: string;
    phone: string;
    pin: string;
    account_balance?: number;
    initial_deposit?: number;
    reference_selfie_base64: string;
  }): Promise<{ token: string; user: MobileUser }> {
    const res = await fetch(`${getApiBase()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        initial_deposit: data.account_balance || data.initial_deposit || 1000,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async getActiveKioskSession(kioskId: string = 'KIOSK-EAST-01'): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/session/active/latest?kiosk_id=${encodeURIComponent(kioskId)}`);
    if (!res.ok) throw new Error('Could not fetch active kiosk session');
    return res.json();
  },

  async scanSessionQR(sessionId: string, userId: string, deviceInfo: string = 'Mobile App (Expo Client)'): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/session/${sessionId}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        device_info: deviceInfo,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to scan session QR');
    }
    return res.json();
  },

  async verifyLocalBiometrics(sessionId: string, userId: string, biometricType: string = 'FINGERPRINT'): Promise<any> {
    const res = await fetch(`${getApiBase()}/api/session/${sessionId}/biometric-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        biometric_type: biometricType,
        local_auth_passed: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Local biometric verification failed');
    }
    return res.json();
  },

  async verifySelfie(sessionId: string, userId: string, liveSelfieBase64: string): Promise<VerificationResult> {
    const res = await fetch(`${getApiBase()}/api/verify-selfie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        live_selfie_base64: liveSelfieBase64,
        device_info: 'Expo Front Camera',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Selfie verification failed');
    }
    return res.json();
  },

  async getUserReferencePhoto(userId: string): Promise<{ reference_selfie: string }> {
    const res = await fetch(`${getApiBase()}/api/users/${userId}/reference-photo`);
    if (!res.ok) throw new Error('Failed to fetch reference selfie');
    return res.json();
  },

  async getDelegationsForPhone(phone: string): Promise<DelegationItem[]> {
    const res = await fetch(`${getApiBase()}/api/delegations?delegatee_phone=${encodeURIComponent(phone)}`);
    if (!res.ok) return [];
    return res.json();
  },
};
