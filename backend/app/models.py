import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_expired(dt: datetime | str | None) -> bool:
    if dt is None:
        return False
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return False
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt < datetime.now(timezone.utc)


def clean_doc(doc: Dict[str, Any] | None) -> Dict[str, Any] | None:
    """Strips MongoDB internal _id field and returns a clean dictionary."""
    if not doc:
        return None
    d = dict(doc)
    d.pop("_id", None)
    return d


class UserDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    phone: str
    full_name: str
    hashed_pin: str
    duress_pin: Optional[str] = None  # Reverse PIN by default for Silent Duress mode
    account_frozen_duress: bool = False  # Set True during Silent Duress to lock remaining funds
    account_balance: float = 1000.0
    reference_selfie: Optional[str] = None
    role: str = "user"  # "user" or "admin"
    is_active: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class AuthSessionDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kiosk_id: str
    user_id: Optional[str] = None
    status: str = "CREATED"  # CREATED, QR_SCANNED, BIOMETRICS_VERIFIED, SELFIE_VERIFIED, AUTHORIZED, COMPLETED, EXPIRED, FAILED, TERMINATED
    failure_reason: Optional[str] = None
    device_info: Optional[str] = None
    prestaged_amount: Optional[float] = None  # Feature 1: Pre-Staged "10-Second" Withdrawal
    risk_score: int = 0  # Feature 2: 0-100 real-time risk score
    risk_factors: List[str] = Field(default_factory=list)
    shoulder_surfing_detected: bool = False  # Feature 3: Threat detection
    disguise_detected: bool = False
    threat_reason: Optional[str] = None
    is_duress: bool = False  # Feature 4: Silent duress flag
    expires_at: datetime
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class TransactionDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: Optional[str] = None
    user_id: str
    delegated_by_user_id: Optional[str] = None
    amount: float
    transaction_type: str = "WITHDRAWAL"
    status: str = "COMPLETED"
    kiosk_id: str
    anomaly_flag: bool = False
    anomaly_reason: Optional[str] = None
    is_duress: bool = False  # Silent duress panic withdrawal
    risk_score: int = 0  # Real-time computed risk score (0-100)
    risk_factors: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class DelegationDoc(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    delegator_id: str
    delegatee_phone: str
    delegatee_name: str
    max_withdrawal_limit: float
    current_withdrawn: float = 0.0
    is_active: bool = True
    expires_at: datetime
    created_at: datetime = Field(default_factory=utc_now)
