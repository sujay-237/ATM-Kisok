from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


# ===================== USER SCHEMAS =====================

class UserBase(BaseModel):
    username: str
    email: str
    phone: str
    full_name: str
    role: str = "user"


class UserResponse(UserBase):
    id: str
    account_balance: float
    is_active: bool
    has_reference_selfie: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserLoginRequest(BaseModel):
    username: str
    pin: str


class UserRegisterRequest(BaseModel):
    full_name: str
    username: str
    email: str
    phone: str
    pin: str
    initial_deposit: Optional[float] = Field(default=1000.0, ge=0.0)
    account_balance: Optional[float] = None
    reference_selfie_base64: str = Field(..., description="Base64 selfie photo required for biometric registration")


class LoginResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"


class UpdateReferencePhotoRequest(BaseModel):
    reference_selfie_base64: str


# ===================== ATM SESSION SCHEMAS =====================

class SessionCreateRequest(BaseModel):
    kiosk_id: str = "KIOSK-EAST-01"


class SessionResponse(BaseModel):
    session_id: str
    kiosk_id: str
    status: str
    expires_at: datetime
    qr_payload: str
    user_id: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    transaction: Optional[Dict[str, Any]] = None
    created_at: datetime


class SessionScanRequest(BaseModel):
    user_id: str
    device_info: Optional[str] = "Mobile App (Expo Client)"


class BiometricAuthRequest(BaseModel):
    user_id: str
    biometric_type: str = "FINGERPRINT"  # "FINGERPRINT" or "FACE_ID"
    local_auth_passed: bool = True


# ===================== GEMINI / SELFIE VERIFICATION =====================

class VerifySelfieRequest(BaseModel):
    session_id: str
    user_id: str
    live_selfie_base64: Optional[str] = ""
    device_info: Optional[str] = None


class VerifySelfieResponse(BaseModel):
    session_id: str
    match: bool
    confidence: float
    liveness_passed: bool
    reason: str
    engine: str
    failover_occurred: bool
    status: str
    user: Optional[Dict[str, Any]] = None


# ===================== TRANSACTIONS =====================

class WithdrawalRequest(BaseModel):
    session_id: str
    user_id: str
    amount: float = Field(..., gt=0, description="Amount to withdraw")
    pin: Optional[str] = None
    delegation_id: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    session_id: Optional[str]
    user_id: str
    delegated_by_user_id: Optional[str]
    amount: float
    transaction_type: str
    status: str
    kiosk_id: str
    anomaly_flag: bool
    anomaly_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AnomalyFlagRequest(BaseModel):
    anomaly_flag: bool
    anomaly_reason: str


# ===================== DELEGATIONS =====================

class DelegationCreateRequest(BaseModel):
    delegator_id: str
    delegatee_phone: str
    delegatee_name: str
    max_withdrawal_limit: float = Field(..., gt=0)
    duration_hours: int = Field(default=24, ge=1, le=168)  # 1 hour to 7 days


class DelegationResponse(BaseModel):
    id: str
    delegator_id: str
    delegator_name: Optional[str] = None
    delegatee_phone: str
    delegatee_name: str
    max_withdrawal_limit: float
    current_withdrawn: float
    remaining_limit: float
    is_active: bool
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
