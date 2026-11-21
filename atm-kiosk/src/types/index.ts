export type KioskStep =
  | 'QR_DISPLAY'
  | 'MOBILE_SCANNED'
  | 'BIOMETRIC_VERIFYING'
  | 'AUTHORIZED'
  | 'SELECT_AMOUNT'
  | 'DISPENSING'
  | 'SUCCESS'
  | 'ERROR'
  | 'TERMINATED';

export interface KioskUser {
  id: string;
  full_name: string;
  account_balance: number;
  role: string;
  duress_pin?: string;
  account_frozen_duress?: boolean;
}

export interface KioskSession {
  session_id: string;
  kiosk_id: string;
  status: string;
  expires_at: string;
  qr_payload: string;
  user_id?: string;
  prestaged_amount?: number | null;
  risk_score?: number;
  risk_factors?: string[];
  shoulder_surfing_detected?: boolean;
  disguise_detected?: boolean;
  threat_reason?: string | null;
  is_duress?: boolean;
  created_at: string;
}

export interface TransactionSuccessData {
  transaction_id: string;
  amount: number;
  remaining_balance: number;
  anomaly_flag: boolean;
  timestamp: string;
  is_duress?: boolean;
  prestaged?: boolean;
  risk_score?: number;
}
