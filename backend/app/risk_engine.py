from datetime import datetime, timezone
from typing import List, Tuple, Optional

def calculate_risk_score(
    failed_attempts: int = 0,
    is_unusual_hours: Optional[bool] = None,
    rapid_sessions_count: int = 0,
    threat_or_disguise_detected: bool = False,
    is_duress: bool = False,
    now: Optional[datetime] = None,
) -> Tuple[int, List[str]]:
    """
    Computes a 0–100 risk_score and list of risk_factors based on:
      - Silent duress trigger (Forces risk_score=100)
      - Failed selfie or biometric attempts (+25 each)
      - Unusual withdrawal hours (12:00 AM – 5:00 AM) (+20)
      - Rapid consecutive sessions within 5 minutes (+25)
      - Background threat/disguise detection from Gemini (+30)
    """
    if is_duress:
        return 100, ["Silent Duress Panic Protocol Activated"]

    risk_score = 0
    factors: List[str] = []

    # 1. Failed attempts (+25 each)
    if failed_attempts > 0:
        penalty = min(50, failed_attempts * 25)
        risk_score += penalty
        factors.append(f"{failed_attempts} Failed Authentication Attempt{'s' if failed_attempts > 1 else ''} (+{penalty})")

    # 2. Unusual withdrawal hours (12:00 AM – 5:00 AM) (+20)
    if is_unusual_hours is None:
        current_dt = now or datetime.now(timezone.utc)
        # Check current hour in local/UTC (0 to 4 inclusive is 12:00 AM - 4:59 AM)
        is_unusual_hours = current_dt.hour in (0, 1, 2, 3, 4)

    if is_unusual_hours:
        risk_score += 20
        factors.append("Unusual Nocturnal Hours (12:00 AM – 5:00 AM) (+20)")

    # 3. Rapid consecutive sessions within 5 minutes (+25)
    if rapid_sessions_count >= 2:
        risk_score += 25
        factors.append(f"Rapid Consecutive Sessions Velocity ({rapid_sessions_count} in 5 min) (+25)")

    # 4. Background threat/disguise detection from Gemini (+30)
    if threat_or_disguise_detected:
        risk_score += 30
        factors.append("Gemini AI Threat / Shoulder-Surfing Detected (+30)")

    final_score = min(100, max(0, risk_score))
    return final_score, factors
