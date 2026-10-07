export type KioskStep =
  | 'QR_DISPLAY'
  | 'MOBILE_SCANNED'
  | 'BIOMETRIC_VERIFYING'
  | 'AUTHORIZED'
  | 'SELECT_AMOUNT'
  | 'DISPENSING'
  | 'SUCCESS'
  | 'ERROR';

export interface KioskUser {
  id: string;
  full_name: string;
  account_balance: number;
  role: string;
}

export interface KioskSession {
  session_id: string;
  kiosk_id: string;
  status: string;
  expires_at: string;
  qr_payload: string;
  user_id?: string;
  created_at: string;
}

export interface TransactionSuccessData {
  transaction_id: string;
  amount: number;
  remaining_balance: number;
  anomaly_flag: boolean;
  timestamp: string;
}
