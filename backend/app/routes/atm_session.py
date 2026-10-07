import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now, is_expired, clean_doc
from app.schemas import (
    SessionCreateRequest,
    SessionResponse,
    SessionScanRequest,
    BiometricAuthRequest,
)
from app.websocket_manager import ws_manager
from app.config import settings

router = APIRouter(prefix="/api/session", tags=["ATM Sessions"])


@router.post("/create", response_model=SessionResponse)
async def create_kiosk_session(
    payload: SessionCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Called by ATM Kiosk UI to initialize a new dynamic session in MongoDB.
    Generates a secure UUID session token embedded into dynamic QR code.
    """
    session_id = str(uuid.uuid4())
    now = utc_now()
    expires_at = now + timedelta(seconds=settings.ATM_SESSION_EXPIRY_SECONDS)

    session_doc = {
        "id": session_id,
        "kiosk_id": payload.kiosk_id,
        "status": "CREATED",
        "user_id": None,
        "failure_reason": None,
        "device_info": None,
        "expires_at": expires_at,
        "created_at": now,
        "updated_at": now,
    }

    await db["auth_sessions"].insert_one(session_doc)
    qr_payload = f"atm://session?id={session_id}&kiosk={payload.kiosk_id}"

    return SessionResponse(
        session_id=session_id,
        kiosk_id=payload.kiosk_id,
        status="CREATED",
        expires_at=expires_at,
        qr_payload=qr_payload,
        user_id=None,
        created_at=now,
    )


@router.get("/active/latest", response_model=SessionResponse)
async def get_active_session(
    kiosk_id: str = "KIOSK-EAST-01",
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Returns the most recent active session for the given kiosk.
    If none exists or expired, creates a new one so mobile and kiosk sync seamlessly.
    """
    now = utc_now()
    doc = await db["auth_sessions"].find_one(
        {
            "kiosk_id": kiosk_id,
            "expires_at": {"$gt": now},
            "status": {"$in": ["CREATED", "QR_SCANNED", "BIOMETRICS_VERIFIED", "AUTHORIZED"]},
        },
        sort=[("created_at", -1)],
    )

    if not doc:
        session_id = str(uuid.uuid4())
        expires_at = now + timedelta(seconds=settings.ATM_SESSION_EXPIRY_SECONDS)
        doc = {
            "id": session_id,
            "kiosk_id": kiosk_id,
            "status": "CREATED",
            "user_id": None,
            "failure_reason": None,
            "device_info": None,
            "expires_at": expires_at,
            "created_at": now,
            "updated_at": now,
        }
        await db["auth_sessions"].insert_one(doc)

    user_info = None
    if doc.get("user_id"):
        u = await db["users"].find_one({"id": doc["user_id"]})
        if u:
            user_info = {
                "id": u["id"],
                "full_name": u["full_name"],
                "account_balance": u.get("account_balance", 0.0),
                "role": u.get("role", "user"),
            }

    qr_payload = f"atm://session?id={doc['id']}&kiosk={doc['kiosk_id']}"
    return SessionResponse(
        session_id=doc["id"],
        kiosk_id=doc["kiosk_id"],
        status=doc["status"],
        expires_at=doc["expires_at"],
        qr_payload=qr_payload,
        user_id=doc.get("user_id"),
        user=user_info,
        created_at=doc["created_at"],
    )


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    doc = await db["auth_sessions"].find_one({"id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="ATM Session not found")

    user_info = None
    if doc.get("user_id"):
        u = await db["users"].find_one({"id": doc["user_id"]})
        if u:
            user_info = {
                "id": u["id"],
                "full_name": u["full_name"],
                "account_balance": u.get("account_balance", 0.0),
                "role": u.get("role", "user"),
            }

    qr_payload = f"atm://session?id={doc['id']}&kiosk={doc['kiosk_id']}"
    return SessionResponse(
        session_id=doc["id"],
        kiosk_id=doc["kiosk_id"],
        status=doc["status"],
        expires_at=doc["expires_at"],
        qr_payload=qr_payload,
        user_id=doc.get("user_id"),
        user=user_info,
        created_at=doc["created_at"],
    )


@router.post("/{session_id}/scan")
async def scan_session_qr(
    session_id: str,
    payload: SessionScanRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Called by Mobile App immediately after scanning the dynamic QR code.
    Pairs user's mobile app with the ATM Kiosk.
    """
    session_doc = await db["auth_sessions"].find_one({"id": session_id})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")

    if is_expired(session_doc.get("expires_at")):
        await db["auth_sessions"].update_one(
            {"id": session_id},
            {"$set": {"status": "EXPIRED", "updated_at": utc_now()}}
        )
        raise HTTPException(status_code=400, detail="ATM Session has expired. Please refresh the QR code.")

    # Match user by id or username
    user_doc = await db["users"].find_one(
        {"$or": [{"id": payload.user_id}, {"username": payload.user_id}]}
    )
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    await db["auth_sessions"].update_one(
        {"id": session_id},
        {"$set": {
            "status": "QR_SCANNED",
            "user_id": user_doc["id"],
            "device_info": payload.device_info,
            "updated_at": utc_now(),
        }}
    )

    # Broadcast event to ATM Kiosk via WebSocket
    await ws_manager.broadcast_session_update(
        session_id,
        {
            "event": "QR_SCANNED",
            "session_id": session_id,
            "status": "QR_SCANNED",
            "kiosk_id": session_doc["kiosk_id"],
            "user_name": user_doc["full_name"],
            "message": "Mobile device connected. Awaiting biometric authentication...",
        },
    )

    return {"status": "QR_SCANNED", "session_id": session_id, "user_name": user_doc["full_name"]}


@router.post("/{session_id}/biometric-auth")
async def verify_local_biometrics(
    session_id: str,
    payload: BiometricAuthRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Called by Mobile App once on-device biometric check (Fingerprint/FaceID) succeeds.
    Transitions ATM state to BIOMETRICS_VERIFIED.
    """
    session_doc = await db["auth_sessions"].find_one({"id": session_id})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")

    if is_expired(session_doc.get("expires_at")):
        await db["auth_sessions"].update_one(
            {"id": session_id},
            {"$set": {"status": "EXPIRED", "updated_at": utc_now()}}
        )
        raise HTTPException(status_code=400, detail="ATM Session has expired")

    if not payload.local_auth_passed:
        fail_msg = "Local fingerprint/FaceID authentication failed on mobile device."
        await db["auth_sessions"].update_one(
            {"id": session_id},
            {"$set": {"status": "FAILED", "failure_reason": fail_msg, "updated_at": utc_now()}}
        )
        await ws_manager.broadcast_session_update(
            session_id,
            {
                "event": "AUTH_FAILED",
                "session_id": session_id,
                "status": "FAILED",
                "reason": fail_msg,
            },
        )
        return {"status": "FAILED", "reason": fail_msg}

    await db["auth_sessions"].update_one(
        {"id": session_id},
        {"$set": {"status": "BIOMETRICS_VERIFIED", "updated_at": utc_now()}}
    )

    # Broadcast event to ATM Kiosk via WebSocket
    await ws_manager.broadcast_session_update(
        session_id,
        {
            "event": "BIOMETRICS_VERIFIED",
            "session_id": session_id,
            "status": "BIOMETRICS_VERIFIED",
            "message": "Fingerprint verified. Please capture live selfie for AI facial match...",
        },
    )

    return {"status": "BIOMETRICS_VERIFIED", "session_id": session_id}
