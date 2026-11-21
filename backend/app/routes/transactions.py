import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now, is_expired, clean_doc
from app.schemas import WithdrawalRequest, TransactionResponse, AnomalyFlagRequest
from app.websocket_manager import ws_manager
from app.risk_engine import calculate_risk_score

router = APIRouter(prefix="/api/transactions", tags=["ATM Transactions"])


@router.post("/withdraw", response_model=TransactionResponse)
async def process_withdrawal(
    payload: WithdrawalRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Cash withdrawal endpoint supporting:
    1. Pre-Staged "10-Second" Instant Withdrawals.
    2. Silent Duress Mode (caps to decoy min(amount, 2000), locks account, alerts security).
    3. Real-Time Risk Scoring (0–100) and Audit Trail in MongoDB.
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid withdrawal amount")

    now = utc_now()

    # Fetch session from MongoDB
    session_doc = await db["auth_sessions"].find_one({"id": payload.session_id})
    if not session_doc:
        raise HTTPException(status_code=404, detail="ATM Session not found")

    if session_doc.get("status") not in ("AUTHORIZED", "BIOMETRICS_VERIFIED"):
        # Idempotency check
        if session_doc.get("status") == "COMPLETED":
            existing_tx = await db["transactions"].find_one({"session_id": payload.session_id})
            if existing_tx:
                fresh_u = await db["users"].find_one({"id": existing_tx["user_id"]})
                current_bal = float(fresh_u.get("account_balance", fresh_u.get("balance", 0.0))) if fresh_u else 0.0
                return TransactionResponse(
                    id=existing_tx["id"],
                    session_id=existing_tx.get("session_id"),
                    user_id=existing_tx["user_id"],
                    delegated_by_user_id=existing_tx.get("delegated_by_user_id"),
                    amount=existing_tx["amount"],
                    transaction_type=existing_tx.get("transaction_type", "WITHDRAWAL"),
                    status="COMPLETED",
                    kiosk_id=existing_tx.get("kiosk_id", session_doc["kiosk_id"]),
                    anomaly_flag=existing_tx.get("anomaly_flag", False),
                    anomaly_reason=existing_tx.get("anomaly_reason"),
                    is_duress=existing_tx.get("is_duress", False),
                    risk_score=existing_tx.get("risk_score", 0),
                    risk_factors=existing_tx.get("risk_factors", []),
                    remaining_balance=current_bal,
                    new_balance=current_bal,
                    created_at=existing_tx.get("created_at", now),
                )
            raise HTTPException(
                status_code=400,
                detail="This ATM session has already been completed. Please start a new session.",
            )
        elif session_doc.get("status") == "EXPIRED":
            raise HTTPException(
                status_code=400,
                detail="This ATM session has expired. Please scan a fresh QR code at the kiosk.",
            )
        elif session_doc.get("status") == "TERMINATED":
            raise HTTPException(
                status_code=403,
                detail="This ATM session has been terminated by Security Admin.",
            )
        else:
            raise HTTPException(
                status_code=403,
                detail=f"Cannot withdraw: session is not authorized (Current status: {session_doc.get('status')})",
            )

    # Fetch User
    user_doc = await db["users"].find_one(
        {"$or": [{"id": payload.user_id}, {"username": payload.user_id}]}
    )
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if account is locked by duress protocol
    if user_doc.get("account_frozen_duress", False):
        raise HTTPException(
            status_code=403,
            detail="Account security hold active. Please contact customer security or visit a local branch.",
        )

    # Determine if Silent Duress Mode is triggered
    is_duress_trigger = bool(
        payload.is_duress
        or session_doc.get("is_duress", False)
        or (payload.pin and user_doc.get("duress_pin") and payload.pin.strip() == user_doc.get("duress_pin").strip())
    )

    delegator_user = None
    delegation_doc = None

    # Handle Duress vs Normal Amount
    if is_duress_trigger:
        # Cap dispensed amount to decoy maximum: min(requested_amount, 2000)
        dispense_amount = min(float(payload.amount), 2000.0)
        # Lock user account from future withdrawals
        await db["users"].update_one(
            {"id": user_doc["id"]},
            {"$set": {"account_frozen_duress": True, "updated_at": now}}
        )
        risk_score = 100
        risk_factors = ["Silent Duress Panic Protocol Activated (+100)"]
        anomaly_flag = True
        anomaly_reason = "Silent Duress Panic Protocol Activated"
    else:
        dispense_amount = float(payload.amount)

        # Check delegation if supplied
        if payload.delegation_id:
            delegation_doc = await db["delegations"].find_one({"id": payload.delegation_id})
            if not delegation_doc or not delegation_doc.get("is_active"):
                raise HTTPException(status_code=400, detail="Delegation is inactive or does not exist")

            if is_expired(delegation_doc.get("expires_at")):
                raise HTTPException(status_code=400, detail="Delegation has expired")

            remaining = delegation_doc.get("max_withdrawal_limit", 0.0) - delegation_doc.get("current_withdrawn", 0.0)
            if dispense_amount > remaining:
                raise HTTPException(
                    status_code=400,
                    detail=f"Amount exceeds remaining delegation limit (${remaining:.2f})",
                )

            delegator_user = await db["users"].find_one({"id": delegation_doc.get("delegator_id")})
            if not delegator_user or delegator_user.get("account_balance", 0.0) < dispense_amount:
                raise HTTPException(status_code=400, detail="Delegating account has insufficient funds")
        else:
            # Standard user balance check
            if user_doc.get("account_balance", 0.0) < dispense_amount:
                raise HTTPException(status_code=400, detail="Insufficient account balance")

        # Anti-Fraud Anomaly & Risk Score Heuristics
        five_min_ago = now - timedelta(minutes=5)
        recent_count = await db["transactions"].count_documents(
            {"user_id": user_doc["id"], "created_at": {"$gte": five_min_ago}}
        )

        has_threat = bool(
            session_doc.get("shoulder_surfing_detected", False)
            or session_doc.get("disguise_detected", False)
        )

        risk_score, risk_factors = calculate_risk_score(
            failed_attempts=0,
            rapid_sessions_count=recent_count,
            threat_or_disguise_detected=has_threat,
            is_duress=False,
            now=now,
        )

        anomaly_flag = False
        anomaly_reason = None
        if dispense_amount >= 10000.0:
            anomaly_flag = True
            anomaly_reason = f"High-value cash withdrawal (₹ {dispense_amount:,.2f})"
        elif recent_count >= 2:
            anomaly_flag = True
            anomaly_reason = f"High velocity: {recent_count + 1} withdrawals within 5 minutes"
        elif has_threat:
            anomaly_flag = True
            anomaly_reason = f"Threat detected: {session_doc.get('threat_reason', 'Shoulder-surfing/Disguise')}"

    # Atomic Balance Update in MongoDB
    target_user_id = delegator_user["id"] if (delegator_user and delegation_doc) else user_doc["id"]
    
    # Update both account_balance and balance to guarantee synchronization across any schema variant
    await db["users"].update_one(
        {"id": target_user_id},
        {
            "$inc": {"account_balance": -dispense_amount, "balance": -dispense_amount},
            "$set": {"updated_at": now}
        }
    )
    if delegator_user and delegation_doc:
        await db["delegations"].update_one(
            {"id": delegation_doc["id"]},
            {"$inc": {"current_withdrawn": dispense_amount}}
        )

    # Re-fetch directly from MongoDB to get 100% fresh, verified balance
    fresh_user = await db["users"].find_one({"id": target_user_id})
    balance_to_report = float(fresh_user.get("account_balance", fresh_user.get("balance", 0.0))) if fresh_user else 0.0

    tx_id = str(uuid.uuid4())

    tx_doc = {
        "id": tx_id,
        "session_id": session_doc["id"],
        "user_id": user_doc["id"],
        "delegated_by_user_id": delegator_user["id"] if delegator_user else None,
        "amount": dispense_amount,
        "transaction_type": "WITHDRAWAL",
        "status": "COMPLETED",
        "kiosk_id": session_doc["kiosk_id"],
        "anomaly_flag": anomaly_flag,
        "anomaly_reason": anomaly_reason,
        "is_duress": is_duress_trigger,
        "risk_score": risk_score,
        "risk_factors": risk_factors,
        "created_at": now,
    }
    await db["transactions"].insert_one(tx_doc)

    await db["auth_sessions"].update_one(
        {"id": session_doc["id"]},
        {"$set": {
            "status": "COMPLETED",
            "is_duress": is_duress_trigger,
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "updated_at": now,
        }}
    )

    # Update active session tracker for Admin Dashboard
    await ws_manager.update_session_state(session_doc["id"], {
        "status": "COMPLETED",
        "step": "COMPLETED",
        "risk_score": risk_score,
        "risk_factors": risk_factors,
        "is_duress": is_duress_trigger,
    })

    # Real-time WebSocket announcement to ATM Kiosk (APPEARS 100% NORMAL ON KIOSK SCREEN)
    await ws_manager.broadcast_session_update(
        session_doc["id"],
        {
            "event": "DISPENSING_CASH",
            "session_id": session_doc["id"],
            "status": "COMPLETED",
            "transaction_id": tx_id,
            "amount": dispense_amount,
            "remaining_balance": balance_to_report,
            "new_balance": balance_to_report,
            "anomaly_flag": anomaly_flag,
            "is_duress": is_duress_trigger,
            "prestaged": session_doc.get("prestaged_amount") is not None,
            "message": f"Successfully authorized. Dispensing ₹{dispense_amount:,.2f}...",
        },
    )

    # Broadcast BALANCE_UPDATED and TRANSACTION_COMPLETE to Admin Dashboard and listening clients
    await ws_manager.broadcast_admin({
        "type": "BALANCE_UPDATED",
        "event": "TRANSACTION_COMPLETE",
        "user_id": target_user_id,
        "user_name": user_doc["full_name"],
        "transaction_id": tx_id,
        "amount": dispense_amount,
        "new_balance": balance_to_report,
        "remaining_balance": balance_to_report,
        "timestamp": now.isoformat(),
    })

    # If silent duress was triggered, silently broadcast emergency alert to Admin Dashboard
    if is_duress_trigger:
        await ws_manager.broadcast_duress(
            kiosk_id=session_doc["kiosk_id"],
            user_id=user_doc["id"],
            user_name=user_doc["full_name"],
            decoy_amount=dispense_amount,
            session_id=session_doc["id"],
        )

    return TransactionResponse(
        id=tx_id,
        session_id=session_doc["id"],
        user_id=user_doc["id"],
        delegated_by_user_id=delegator_user["id"] if delegator_user else None,
        amount=dispense_amount,
        transaction_type="WITHDRAWAL",
        status="COMPLETED",
        kiosk_id=session_doc["kiosk_id"],
        anomaly_flag=anomaly_flag,
        anomaly_reason=anomaly_reason,
        is_duress=is_duress_trigger,
        risk_score=risk_score,
        risk_factors=risk_factors,
        remaining_balance=balance_to_report,
        new_balance=balance_to_report,
        created_at=now,
    )


@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    user_id: Optional[str] = Query(None),
    only_anomalies: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    if user_id:
        query["user_id"] = user_id
    if only_anomalies:
        query["$or"] = [{"anomaly_flag": True}, {"is_duress": True}, {"risk_score": {"$gte": 50}}]

    cursor = db["transactions"].find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)

    return [
        TransactionResponse(
            id=d["id"],
            session_id=d.get("session_id"),
            user_id=d["user_id"],
            delegated_by_user_id=d.get("delegated_by_user_id"),
            amount=d["amount"],
            transaction_type=d.get("transaction_type", "WITHDRAWAL"),
            status=d.get("status", "COMPLETED"),
            kiosk_id=d.get("kiosk_id", "KIOSK-EAST-01"),
            anomaly_flag=d.get("anomaly_flag", False),
            anomaly_reason=d.get("anomaly_reason"),
            is_duress=d.get("is_duress", False),
            risk_score=d.get("risk_score", 0),
            risk_factors=d.get("risk_factors", []),
            created_at=d["created_at"],
        )
        for d in docs
    ]


@router.post("/{transaction_id}/flag", response_model=TransactionResponse)
async def flag_transaction_anomaly(
    transaction_id: str,
    payload: AnomalyFlagRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db["transactions"].find_one({"id": transaction_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Transaction not found")

    new_risk = max(doc.get("risk_score", 0), 75 if payload.anomaly_flag else 10)
    factors = list(doc.get("risk_factors", []))
    if payload.anomaly_flag and "Admin Manually Flagged" not in factors:
        factors.append("Admin Manually Flagged")

    await db["transactions"].update_one(
        {"id": transaction_id},
        {"$set": {
            "anomaly_flag": payload.anomaly_flag,
            "anomaly_reason": payload.anomaly_reason,
            "risk_score": new_risk,
            "risk_factors": factors,
        }}
    )

    doc["anomaly_flag"] = payload.anomaly_flag
    doc["anomaly_reason"] = payload.anomaly_reason
    doc["risk_score"] = new_risk
    doc["risk_factors"] = factors

    # Broadcast anomaly alert to admin dashboard
    await ws_manager.broadcast_admin({
        "type": "ANOMALY_UPDATED",
        "transaction_id": transaction_id,
        "anomaly_flag": payload.anomaly_flag,
        "anomaly_reason": payload.anomaly_reason,
        "risk_score": new_risk,
    })

    return TransactionResponse(
        id=doc["id"],
        session_id=doc.get("session_id"),
        user_id=doc["user_id"],
        delegated_by_user_id=doc.get("delegated_by_user_id"),
        amount=doc["amount"],
        transaction_type=doc.get("transaction_type", "WITHDRAWAL"),
        status=doc.get("status", "COMPLETED"),
        kiosk_id=doc.get("kiosk_id", "KIOSK-EAST-01"),
        anomaly_flag=doc["anomaly_flag"],
        anomaly_reason=doc.get("anomaly_reason"),
        is_duress=doc.get("is_duress", False),
        risk_score=doc.get("risk_score", 0),
        risk_factors=doc.get("risk_factors", []),
        created_at=doc["created_at"],
    )
