import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now, is_expired, clean_doc
from app.schemas import (
    SessionCreateRequest,
    SessionResponse,
    SessionScanRequest,
    BiometricAuthRequest,
    TerminateSessionRequest,
    ActiveSessionItem,
)
from app.websocket_manager import ws_manager
from app.config import settings
from app.risk_engine import calculate_risk_score

router = APIRouter(prefix="/api", tags=["ATM Sessions"])


@router.post("/session/create", response_model=SessionResponse)
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
        "prestaged_amount": None,
        "risk_score": 0,
        "risk_factors": [],
        "shoulder_surfing_detected": False,
        "disguise_detected": False,
        "threat_reason": None,
        "is_duress": False,
        "expires_at": expires_at,
        "created_at": now,
        "updated_at": now,
    }

    await db["auth_sessions"].insert_one(session_doc)
    qr_payload = f"atm://session?id={session_id}&kiosk={payload.kiosk_id}"

    # Track in memory for live Admin Threat Telemetry
    await ws_manager.update_session_state(session_id, {
        "kiosk_id": payload.kiosk_id,
        "status": "CREATED",
        "step": "QR_DISPLAY",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
    })

    return SessionResponse(
        session_id=session_id,
        kiosk_id=payload.kiosk_id,
        status="CREATED",
        expires_at=expires_at,
        qr_payload=qr_payload,
        user_id=None,
        prestaged_amount=None,
        risk_score=0,
        risk_factors=[],
        shoulder_surfing_detected=False,
        disguise_detected=False,
        threat_reason=None,
        is_duress=False,
        created_at=now,
    )


@router.get("/session/active/latest", response_model=SessionResponse)
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
            "prestaged_amount": None,
            "risk_score": 0,
            "risk_factors": [],
            "shoulder_surfing_detected": False,
            "disguise_detected": False,
            "threat_reason": None,
            "is_duress": False,
            "expires_at": expires_at,
            "created_at": now,
            "updated_at": now,
        }
        await db["auth_sessions"].insert_one(doc)
        await ws_manager.update_session_state(session_id, {
            "kiosk_id": kiosk_id,
            "status": "CREATED",
            "step": "QR_DISPLAY",
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
        })

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
        prestaged_amount=doc.get("prestaged_amount"),
        risk_score=doc.get("risk_score", 0),
        risk_factors=doc.get("risk_factors", []),
        shoulder_surfing_detected=doc.get("shoulder_surfing_detected", False),
        disguise_detected=doc.get("disguise_detected", False),
        threat_reason=doc.get("threat_reason"),
        is_duress=doc.get("is_duress", False),
        created_at=doc["created_at"],
    )


@router.get("/session/{session_id}", response_model=SessionResponse)
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
    
    tx_info = None
    tx = await db["transactions"].find_one({"session_id": session_id})
    if tx:
        tx_info = {
            "id": tx["id"],
            "amount": tx["amount"],
            "remaining_balance": user_info.get("account_balance", 0.0) if user_info else 0.0,
            "created_at": tx.get("created_at"),
            "risk_score": tx.get("risk_score", 0),
        }

    return SessionResponse(
        session_id=doc["id"],
        kiosk_id=doc["kiosk_id"],
        status=doc["status"],
        expires_at=doc["expires_at"],
        qr_payload=qr_payload,
        user_id=doc.get("user_id"),
        user=user_info,
        prestaged_amount=doc.get("prestaged_amount"),
        risk_score=doc.get("risk_score", 0),
        risk_factors=doc.get("risk_factors", []),
        shoulder_surfing_detected=doc.get("shoulder_surfing_detected", False),
        disguise_detected=doc.get("disguise_detected", False),
        threat_reason=doc.get("threat_reason"),
        is_duress=doc.get("is_duress", False),
        transaction=tx_info,
        created_at=doc["created_at"],
    )


@router.post("/session/{session_id}/scan")
async def scan_session_qr(
    session_id: str,
    payload: SessionScanRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Called by Mobile App immediately after scanning the dynamic QR code.
    Pairs user's mobile app with the ATM Kiosk, records optional prestaged_amount.
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

    prestaged = float(payload.prestaged_amount) if payload.prestaged_amount is not None and payload.prestaged_amount > 0 else None

    # Check rapid consecutive sessions velocity
    five_min_ago = utc_now() - timedelta(minutes=5)
    recent_sessions_count = await db["auth_sessions"].count_documents(
        {"user_id": user_doc["id"], "created_at": {"$gte": five_min_ago}}
    )
    base_risk, base_factors = calculate_risk_score(
        rapid_sessions_count=recent_sessions_count,
        now=utc_now(),
    )

    await db["auth_sessions"].update_one(
        {"id": session_id},
        {"$set": {
            "status": "QR_SCANNED",
            "user_id": user_doc["id"],
            "device_info": payload.device_info,
            "prestaged_amount": prestaged,
            "risk_score": base_risk,
            "risk_factors": base_factors,
            "updated_at": utc_now(),
        }}
    )

    # Track in active sessions memory
    await ws_manager.update_session_state(session_id, {
        "status": "QR_SCANNED",
        "step": "MOBILE_SCANNED",
        "user_id": user_doc["id"],
        "user_name": user_doc["full_name"],
        "prestaged_amount": prestaged,
        "risk_score": base_risk,
        "risk_factors": base_factors,
    })

    # Broadcast event to ATM Kiosk via WebSocket
    await ws_manager.broadcast_session_update(
        session_id,
        {
            "event": "QR_SCANNED",
            "session_id": session_id,
            "status": "QR_SCANNED",
            "kiosk_id": session_doc["kiosk_id"],
            "user_name": user_doc["full_name"],
            "prestaged_amount": prestaged,
            "risk_score": base_risk,
            "message": "Mobile device connected. Awaiting biometric authentication...",
        },
    )

    return {
        "status": "QR_SCANNED",
        "session_id": session_id,
        "user_name": user_doc["full_name"],
        "prestaged_amount": prestaged,
    }


@router.post("/session/{session_id}/biometric-auth")
async def verify_local_biometrics(
    session_id: str,
    payload: BiometricAuthRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Called by Mobile App once on-device biometric check (Fingerprint/Passcode) completes.
    Transitions ATM state to BIOMETRICS_VERIFIED. Supports silent duress flag.
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
        fail_msg = "Local biometric authentication failed on mobile device."
        # Update failed attempt penalty
        risk_score, risk_factors = calculate_risk_score(failed_attempts=1, now=utc_now())
        await db["auth_sessions"].update_one(
            {"id": session_id},
            {"$set": {
                "status": "FAILED",
                "failure_reason": fail_msg,
                "risk_score": risk_score,
                "risk_factors": risk_factors,
                "updated_at": utc_now(),
            }}
        )
        await ws_manager.update_session_state(session_id, {
            "status": "FAILED",
            "step": "FAILED",
            "risk_score": risk_score,
            "risk_factors": risk_factors,
        })
        await ws_manager.broadcast_session_update(
            session_id,
            {
                "event": "AUTH_FAILED",
                "session_id": session_id,
                "status": "FAILED",
                "reason": fail_msg,
                "risk_score": risk_score,
            },
        )
        return {"status": "FAILED", "reason": fail_msg}

    is_duress = bool(payload.is_duress)
    prestaged = payload.prestaged_amount if payload.prestaged_amount is not None else session_doc.get("prestaged_amount")

    update_fields = {
        "status": "BIOMETRICS_VERIFIED",
        "updated_at": utc_now(),
    }
    if is_duress:
        update_fields["is_duress"] = True
    if prestaged is not None:
        update_fields["prestaged_amount"] = prestaged

    await db["auth_sessions"].update_one({"id": session_id}, {"$set": update_fields})

    await ws_manager.update_session_state(session_id, {
        "status": "BIOMETRICS_VERIFIED",
        "step": "BIOMETRIC_VERIFYING",
        "is_duress": is_duress,
        "prestaged_amount": prestaged,
    })

    # Broadcast event to ATM Kiosk via WebSocket
    await ws_manager.broadcast_session_update(
        session_id,
        {
            "event": "BIOMETRICS_VERIFIED",
            "session_id": session_id,
            "status": "BIOMETRICS_VERIFIED",
            "prestaged_amount": prestaged,
            "is_duress": is_duress,
            "message": "Device authenticated. Please capture live selfie for AI facial match...",
        },
    )

    return {"status": "BIOMETRICS_VERIFIED", "session_id": session_id}


# ===================== ADMIN KILL SWITCH & TELEMETRY =====================

@router.get("/admin/sessions/active", response_model=List[ActiveSessionItem])
async def get_active_kiosk_sessions(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Admin Telemetry endpoint: Returns all live ATM kiosk sessions with computed Risk Scores,
    threat/disguise flags, and current status.
    """
    sessions = await ws_manager.get_active_sessions_list()
    # If memory is empty (e.g. after backend restart), read active docs from MongoDB
    if not sessions:
        now = utc_now()
        cursor = db["auth_sessions"].find(
            {"expires_at": {"$gt": now}, "status": {"$nin": ["COMPLETED", "EXPIRED", "TERMINATED"]}}
        ).sort("created_at", -1).limit(20)
        docs = await cursor.to_list(length=20)
        for d in docs:
            sessions.append({
                "session_id": d["id"],
                "kiosk_id": d["kiosk_id"],
                "status": d["status"],
                "step": d["status"],
                "user_id": d.get("user_id"),
                "user_name": None,
                "risk_score": d.get("risk_score", 0),
                "risk_factors": d.get("risk_factors", []),
                "shoulder_surfing_detected": d.get("shoulder_surfing_detected", False),
                "disguise_detected": d.get("disguise_detected", False),
                "threat_reason": d.get("threat_reason"),
                "prestaged_amount": d.get("prestaged_amount"),
                "is_duress": d.get("is_duress", False),
                "created_at": d["created_at"].isoformat() if hasattr(d["created_at"], "isoformat") else str(d["created_at"]),
                "expires_at": d["expires_at"].isoformat() if hasattr(d["expires_at"], "isoformat") else str(d["expires_at"]),
            })

    return [
        ActiveSessionItem(
            session_id=s.get("session_id", ""),
            kiosk_id=s.get("kiosk_id", "KIOSK-EAST-01"),
            status=s.get("status", "CREATED"),
            user_id=s.get("user_id"),
            user_name=s.get("user_name"),
            step=s.get("step", s.get("status", "QR_DISPLAY")),
            risk_score=s.get("risk_score", 0),
            risk_factors=s.get("risk_factors", []),
            shoulder_surfing_detected=s.get("shoulder_surfing_detected", False),
            disguise_detected=s.get("disguise_detected", False),
            threat_reason=s.get("threat_reason"),
            prestaged_amount=s.get("prestaged_amount"),
            is_duress=s.get("is_duress", False),
            created_at=str(s.get("created_at", "")),
            expires_at=str(s.get("expires_at", "")),
        )
        for s in sessions
    ]


@router.post("/admin/sessions/{session_id}/terminate")
async def terminate_kiosk_session(
    session_id: str,
    payload: TerminateSessionRequest = TerminateSessionRequest(),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Admin Kill Switch: Immediately aborts target ATM session, revokes authorizations,
    and pushes SESSION_TERMINATED to lock down the kiosk display.
    """
    reason = payload.reason or "Terminated by Security Admin"
    now = utc_now()

    # Update MongoDB
    res = await db["auth_sessions"].update_one(
        {"id": session_id},
        {"$set": {
            "status": "TERMINATED",
            "failure_reason": reason,
            "updated_at": now,
        }}
    )

    # Push Kill Signal over WebSocket to Kiosk
    await ws_manager.terminate_kiosk_session(session_id, reason)

    return {
        "status": "TERMINATED",
        "session_id": session_id,
        "reason": reason,
        "timestamp": now.isoformat(),
    }
