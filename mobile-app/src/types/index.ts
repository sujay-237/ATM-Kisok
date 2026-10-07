export type ScreenName =
  | 'LOGIN'
  | 'REGISTER'
  | 'HOME'
  | 'QR_SCANNER'
  | 'BIOMETRIC'
  | 'SELFIE'
  | 'SUCCESS';

export interface MobileUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  account_balance: number;
  has_reference_selfie: boolean;
}

export interface ScannedSession {
  sessionId: string;
  kioskId: string;
}

export interface VerificationResult {
  session_id: string;
  match: boolean;
  confidence: number;
  liveness_passed: boolean;
  reason: string;
  engine: string;
  failover_occurred: boolean;
  status: string;
}

export interface DelegationItem {
  id: string;
  delegator_name: string;
  max_withdrawal_limit: number;
  remaining_limit: number;
  expires_at: string;
}
