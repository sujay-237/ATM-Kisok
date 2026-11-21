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
  duress_pin?: string;
  account_frozen_duress?: boolean;
}

export interface ScannedSession {
  sessionId: string;
  kioskId: string;
  prestaged_amount?: number | null;
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
  shoulder_surfing_detected?: boolean;
  disguise_detected?: boolean;
  threat_reason?: string;
  is_duress?: boolean;
  prestaged_amount?: number | null;
}

export interface DelegationItem {
  id: string;
  delegator_name: string;
  max_withdrawal_limit: number;
  remaining_limit: number;
  expires_at: string;
  is_active?: boolean;
}