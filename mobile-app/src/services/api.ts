import { MobileUser, VerificationResult, DelegationItem } from '../types';

const API_BASE = 'http://localhost:8000';

export const mobileApi = {
  async getUsers(): Promise<MobileUser[]> {
    const res = await fetch(`${API_BASE}/api/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getUser(id: string): Promise<MobileUser> {
    const res = await fetch(`${API_BASE}/api/users/${id}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },

  async login(username: string, pin: string): Promise<{ token: string; user: MobileUser }> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
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
    reference_selfie_base64: string;
  }): Promise<{ token: string; user: MobileUser }> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async scanSessionQR(sessionId: string, userId: string, deviceInfo: string = 'Mobile App (Expo Client)'): Promise<any> {
    const res = await fetch(`${API_BASE}/api/session/${sessionId}/scan`, {
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
    const res = await fetch(`${API_BASE}/api/session/${sessionId}/biometric-auth`, {
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
    const res = await fetch(`${API_BASE}/api/verify-selfie`, {
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

  async getDelegationsForPhone(phone: string): Promise<DelegationItem[]> {
    const res = await fetch(`${API_BASE}/api/delegations?delegatee_phone=${encodeURIComponent(phone)}`);
    if (!res.ok) return [];
    return res.json();
  },
};
