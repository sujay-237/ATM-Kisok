export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  full_name: string;
  role: 'user' | 'admin';
  account_balance: number;
  is_active: boolean;
  has_reference_selfie: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  session_id?: string;
  user_id: string;
  delegated_by_user_id?: string;
  amount: number;
  transaction_type: string;
  status: string;
  kiosk_id: string;
  anomaly_flag: boolean;
  anomaly_reason?: string;
  created_at: string;
}

export interface Delegation {
  id: string;
  delegator_id: string;
  delegator_name?: string;
  delegatee_phone: string;
  delegatee_name: string;
  max_withdrawal_limit: number;
  current_withdrawn: number;
  remaining_limit: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export interface KeySlotStatus {
  key_id: string;
  masked_key: string;
  is_placeholder: boolean;
  is_cooling_down: boolean;
  remaining_cooldown_seconds: number;
  total_requests: number;
  success_count: number;
  rate_limit_count: number;
  other_errors_count: number;
  last_used_at?: string;
  last_error?: string;
}

export interface RotatorStatus {
  slots: KeySlotStatus[];
  current_index: number;
  has_live_keys: boolean;
  recent_failovers: Array<{
    timestamp: string;
    key_id: string;
    event: string;
    reason: string;
    cooldown_seconds: number;
  }>;
  active_available_keys: number;
}
