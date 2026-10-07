from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now, is_expired
from app.schemas import VerifySelfieRequest, VerifySelfieResponse
from app.gemini_rotator import rotator
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/api", tags=["Biometric Verification & AI Engine"])


class UpdateKeysRequest(BaseModel):
    key1: Optional[str] = None
    key2: Optional[str] = None
    key3: Optional[str] = None


@router.post("/verify-selfie", response_model=VerifySelfieResponse)
async def verify_selfie(
    payload: VerifySelfieRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Core AI Biometric Verification Route (MongoDB + Google Gemini):
    1. Validates the ATM Auth Session in MongoDB.
    2. Fetches user's registered reference ID profile photo.
    3. Calls the 3-Key Gemini Rotator with live model endpoints and 429 adaptive failover.
    4. Upon biometric match, authorizes the ATM Kiosk over WebSocket in real time.
    """
    # 1. Fetch Session from MongoDB
    session_doc = await db["auth_sessions"].find_one({"id": payload.session_id})
    if not session_doc:
        raise HTTPException(status_code=404, detail="ATM Session not found")

    if is_expired(session_doc.get("expires_at")):
        await db["auth_sessions"].update_one(
            {"id": payload.session_id},
            {"$set": {"status": "EXPIRED", "updated_at": utc_now()}}
        )
        raise HTTPException(status_code=400, detail="ATM Session has expired. Please refresh the QR code.")

    # 2. Fetch User from MongoDB
    user_doc = await db["users"].find_one(
        {"$or": [{"id": payload.user_id}, {"username": payload.user_id}]}
    )
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found")

    # If reference selfie is not set yet, use the current one as enrolled profile photo
    if not user_doc.get("reference_selfie"):
        await db["users"].update_one(
            {"id": user_doc["id"]},
            {"$set": {"reference_selfie": payload.live_selfie_base64, "updated_at": utc_now()}}
        )
        user_doc["reference_selfie"] = payload.live_selfie_base64

    # 3. Call Gemini Key Rotator for multimodal verification
    ai_result = await rotator.verify_selfie(
        reference_image_b64=user_doc["reference_selfie"],
        live_selfie_b64=payload.live_selfie_base64,
        user_name=user_doc["full_name"],
    )

    is_match = ai_result.get("match", False)

    if is_match:
        await db["auth_sessions"].update_one(
            {"id": payload.session_id},
            {"$set": {
                "status": "AUTHORIZED",
                "user_id": user_doc["id"],
                "failure_reason": None,
                "updated_at": utc_now(),
            }}
        )

        user_info = {
            "id": user_doc["id"],
            "full_name": user_doc["full_name"],
            "account_balance": user_doc.get("account_balance", 0.0),
            "role": user_doc.get("role", "user"),
        }

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
                "message": f"Biometrics verified! Welcome, {user_doc['full_name']}.",
            },
        )

        return VerifySelfieResponse(
            session_id=payload.session_id,
            match=True,
            confidence=ai_result.get("confidence", 0.96),
            liveness_passed=ai_result.get("liveness_passed", True),
            reason=ai_result.get("reason", "Facial landmarks verified by Google Gemini."),
            engine=ai_result.get("engine", "Google Gemini Vision"),
            failover_occurred=ai_result.get("failover_occurred", False),
            status="AUTHORIZED",
            user=user_info,
        )
    else:
        reason_msg = ai_result.get("reason", "Facial biometrics do not match registered profile.")
        await db["auth_sessions"].update_one(
            {"id": payload.session_id},
            {"$set": {
                "status": "FAILED",
                "failure_reason": reason_msg,
                "updated_at": utc_now(),
            }}
        )

        # Alert the ATM Kiosk
        await ws_manager.broadcast_session_update(
            payload.session_id,
            {
                "event": "AUTH_FAILED",
                "session_id": payload.session_id,
                "status": "FAILED",
                "reason": reason_msg,
            },
        )

        return VerifySelfieResponse(
            session_id=payload.session_id,
            match=False,
            confidence=ai_result.get("confidence", 0.0),
            liveness_passed=ai_result.get("liveness_passed", False),
            reason=reason_msg,
            engine=ai_result.get("engine", "Google Gemini Vision"),
            failover_occurred=ai_result.get("failover_occurred", False),
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
