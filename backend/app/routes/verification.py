import io
import base64
from typing import Optional
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from PIL import Image

from app.database import get_db
from app.models import utc_now, is_expired
from app.schemas import VerifySelfieRequest, VerifySelfieResponse
from app.gemini_rotator import rotator
from app.websocket_manager import ws_manager
from app.risk_engine import calculate_risk_score

router = APIRouter(prefix="/api", tags=["Biometric Verification & AI Engine"])


class UpdateKeysRequest(BaseModel):
    key1: Optional[str] = None
    key2: Optional[str] = None
    key3: Optional[str] = None


def _ensure_valid_b64_image(b64: Optional[str]) -> str:
    if not b64 or len(b64.strip()) < 20:
        img = Image.new('RGB', (120, 120), color=(50, 100, 180))
        buf = io.BytesIO()
        img.save(buf, format='JPEG')
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    return b64


@router.post("/verify-selfie", response_model=VerifySelfieResponse)
async def verify_selfie(
    payload: VerifySelfieRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Core AI Biometric Verification & Threat Surveillance Route:
    1. Validates the ATM Auth Session in MongoDB.
    2. Checks whether user account is locked by duress protocol.
    3. Fetches user's registered reference ID profile photo.
    4. Calls the 3-Key Gemini Rotator for full-frame multimodal analysis (Biometrics + Shoulder-Surfing + Disguises).
    5. Calculates 0–100 Real-Time Risk Score based on threats, velocity, nocturnal hours, and attempts.
    6. Forwards threat indicators & prestaged_amount over WebSocket to ATM Kiosk.
    """
    now = utc_now()

    # 1. Fetch Session from MongoDB
    session_doc = await db["auth_sessions"].find_one({"id": payload.session_id})
    if not session_doc:
        raise HTTPException(status_code=404, detail="ATM Session not found")

    if is_expired(session_doc.get("expires_at")):
        await db["auth_sessions"].update_one(
            {"id": payload.session_id},
            {"$set": {"status": "EXPIRED", "updated_at": now}}
        )
        raise HTTPException(status_code=400, detail="ATM Session has expired. Please refresh the QR code.")

    # 2. Fetch User from MongoDB
    user_doc = await db["users"].find_one(
        {"$or": [{"id": payload.user_id}, {"username": payload.user_id}]}
    )
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found")

    # Check if account is locked via silent duress
    if user_doc.get("account_frozen_duress", False):
        raise HTTPException(
            status_code=403,
            detail="Account security hold active. Please contact customer security or visit a local branch.",
        )

    live_b64 = _ensure_valid_b64_image(payload.live_selfie_base64)
    ref_b64 = _ensure_valid_b64_image(user_doc.get("reference_selfie") or live_b64)

    # If reference selfie is not set yet, enroll current one as baseline
    if not user_doc.get("reference_selfie"):
        await db["users"].update_one(
            {"id": user_doc["id"]},
            {"$set": {"reference_selfie": ref_b64, "updated_at": now}}
        )
        user_doc["reference_selfie"] = ref_b64

    # 3. Call Gemini Multimodal Rotator for full-frame analysis
    ai_result = await rotator.verify_selfie(
        reference_image_b64=ref_b64,
        live_selfie_b64=live_b64,
        user_name=user_doc["full_name"],
    )

    is_match = ai_result.get("match", False)
    shoulder_surfing = ai_result.get("shoulder_surfing_detected", False)
    disguise = ai_result.get("disguise_detected", False)
    threat_reason = ai_result.get("threat_reason")
    threat_flag = bool(shoulder_surfing or disguise)

    # 4. Compute Real-Time Risk Score
    five_min_ago = now - timedelta(minutes=5)
    recent_velocity = await db["auth_sessions"].count_documents(
        {"user_id": user_doc["id"], "created_at": {"$gte": five_min_ago}}
    )
    is_duress = bool(payload.is_duress or session_doc.get("is_duress", False))

    risk_score, risk_factors = calculate_risk_score(
        failed_attempts=0 if is_match else 1,
        rapid_sessions_count=recent_velocity,
        threat_or_disguise_detected=threat_flag,
        is_duress=is_duress,
        now=now,
    )

    # Determine staged amount
    prestaged = payload.prestaged_amount if payload.prestaged_amount is not None else session_doc.get("prestaged_amount")
    if prestaged is not None and prestaged > 0:
        # Validate balance for pre-staged amount
        if user_doc.get("account_balance", 0.0) < prestaged:
            prestaged = None  # Reset if insufficient balance

    if is_match:
        await db["auth_sessions"].update_one(
            {"id": payload.session_id},
            {"$set": {
                "status": "AUTHORIZED",
                "user_id": user_doc["id"],
                "failure_reason": None,
                "prestaged_amount": prestaged,
                "risk_score": risk_score,
                "risk_factors": risk_factors,
                "shoulder_surfing_detected": shoulder_surfing,
                "disguise_detected": disguise,
                "threat_reason": threat_reason,
                "is_duress": is_duress,
                "updated_at": now,
            }}
        )

        user_info = {
            "id": user_doc["id"],
            "full_name": user_doc["full_name"],
            "account_balance": user_doc.get("account_balance", 0.0),
            "role": user_doc.get("role", "user"),
        }

        # Update active session tracker for Admin Dashboard
        await ws_manager.update_session_state(payload.session_id, {
            "status": "AUTHORIZED",
            "step": "AUTHORIZED",
            "user_id": user_doc["id"],
            "user_name": user_doc["full_name"],
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "shoulder_surfing_detected": shoulder_surfing,
            "disguise_detected": disguise,
            "threat_reason": threat_reason,
            "prestaged_amount": prestaged,
            "is_duress": is_duress,
        })

        # Real-time WebSocket broadcast to the ATM Kiosk
        await ws_manager.broadcast_session_update(
            payload.session_id,
            {
                "event": "AUTHORIZED",
                "session_id": payload.session_id,
                "status": "AUTHORIZED",
                "user": user_info,
                "engine": ai_result.get("engine", "Google Gemini Vision"),
                "confidence": ai_result.get("confidence", 0.96),
                "prestaged_amount": prestaged,
                "shoulder_surfing_detected": shoulder_surfing,
                "disguise_detected": disguise,
                "threat_reason": threat_reason,
                "risk_score": risk_score,
                "risk_factors": risk_factors,
                "is_duress": is_duress,
                "message": f"Biometrics verified! Welcome, {user_doc['full_name']}.",
            },
        )

        return VerifySelfieResponse(
            session_id=payload.session_id,
            match=True,
            confidence=ai_result.get("confidence", 0.96),
            liveness_passed=ai_result.get("liveness_passed", True),
            shoulder_surfing_detected=shoulder_surfing,
            disguise_detected=disguise,
            threat_reason=threat_reason,
            risk_score=risk_score,
            risk_factors=risk_factors,
            prestaged_amount=prestaged,
            is_duress=is_duress,
            reason=ai_result.get("reason", "Facial landmarks verified by Google Gemini."),
            engine=ai_result.get("engine", "Google Gemini Vision"),
            failover_occurred=ai_result.get("failover_occurred", False),
            key_used=ai_result.get("key_used"),
            keys_attempted=ai_result.get("keys_attempted"),
            status="AUTHORIZED",
            user=user_info,
        )
    else:
        reason_msg = ai_result.get("reason", "Facial biometrics do not match registered profile.")
        fail_risk, fail_factors = calculate_risk_score(
            failed_attempts=1,
            rapid_sessions_count=recent_velocity,
            threat_or_disguise_detected=threat_flag,
            now=now,
        )

        await db["auth_sessions"].update_one(
            {"id": payload.session_id},
            {"$set": {
                "status": "FAILED",
                "failure_reason": reason_msg,
                "risk_score": fail_risk,
                "risk_factors": fail_factors,
                "shoulder_surfing_detected": shoulder_surfing,
                "disguise_detected": disguise,
                "threat_reason": threat_reason,
                "updated_at": now,
            }}
        )

        await ws_manager.update_session_state(payload.session_id, {
            "status": "FAILED",
            "step": "FAILED",
            "failure_reason": reason_msg,
            "risk_score": fail_risk,
            "risk_factors": fail_factors,
        })

        # Alert the ATM Kiosk
        await ws_manager.broadcast_session_update(
            payload.session_id,
            {
                "event": "AUTH_FAILED",
                "session_id": payload.session_id,
                "status": "FAILED",
                "reason": reason_msg,
                "risk_score": fail_risk,
                "risk_factors": fail_factors,
            },
        )

        return VerifySelfieResponse(
            session_id=payload.session_id,
            match=False,
            confidence=ai_result.get("confidence", 0.0),
            liveness_passed=ai_result.get("liveness_passed", False),
            shoulder_surfing_detected=shoulder_surfing,
            disguise_detected=disguise,
            threat_reason=threat_reason,
            risk_score=fail_risk,
            risk_factors=fail_factors,
            prestaged_amount=prestaged,
            is_duress=is_duress,
            reason=reason_msg,
            engine=ai_result.get("engine", "Google Gemini Vision"),
            failover_occurred=ai_result.get("failover_occurred", False),
            key_used=ai_result.get("key_used"),
            keys_attempted=ai_result.get("keys_attempted"),
            status="FAILED",
            user=None,
        )


@router.get("/gemini/status")
async def get_rotator_status():
    """Returns current health metrics for all 3 Gemini API key slots."""
    return rotator.get_status()


@router.post("/gemini/update-keys")
async def update_gemini_keys(payload: UpdateKeysRequest):
    """Allows administrators to update Gemini API keys at runtime."""
    rotator.update_keys(payload.key1, payload.key2, payload.key3)
    return {
        "message": "Gemini API key rotator updated successfully.",
        "status": rotator.get_status(),
    }
