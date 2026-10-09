import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now, is_expired, clean_doc
from app.schemas import WithdrawalRequest, TransactionResponse, AnomalyFlagRequest
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/api/transactions", tags=["ATM Transactions"])


@router.post("/withdraw", response_model=TransactionResponse)
async def process_withdrawal(
    payload: WithdrawalRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    ACID-compliant cash withdrawal endpoint powered by MongoDB:
    - Atomic account balance deduction & transaction record.
    - Validates session authorization.
    - Validates account balance or temporary delegation limit.
    - Evaluates anti-fraud anomaly heuristics.
    - Emits real-time completion payload to the ATM Kiosk over WebSocket.
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid withdrawal amount")

    # Fetch session from MongoDB
    session_doc = await db["auth_sessions"].find_one({"id": payload.session_id})
    if not session_doc:
        raise HTTPException(status_code=404, detail="ATM Session not found")

    if session_doc.get("status") not in ("AUTHORIZED", "BIOMETRICS_VERIFIED"):
        # Idempotency check: if this session already completed a transaction (e.g. double-click or fast retry),
        # return the existing transaction response safely instead of throwing a 403 error
        if session_doc.get("status") == "COMPLETED":
            existing_tx = await db["transactions"].find_one({"session_id": payload.session_id})
            if existing_tx:
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
                    created_at=existing_tx.get("created_at", utc_now()),
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

    delegator_user = None
    delegation_doc = None

    # Check delegation if supplied
    if payload.delegation_id:
        delegation_doc = await db["delegations"].find_one({"id": payload.delegation_id})
        if not delegation_doc or not delegation_doc.get("is_active"):
            raise HTTPException(status_code=400, detail="Delegation is inactive or does not exist")

        if is_expired(delegation_doc.get("expires_at")):
            raise HTTPException(status_code=400, detail="Delegation has expired")

        remaining = delegation_doc.get("max_withdrawal_limit", 0.0) - delegation_doc.get("current_withdrawn", 0.0)
        if payload.amount > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Amount exceeds remaining delegation limit (${remaining:.2f})",
            )

        delegator_user = await db["users"].find_one({"id": delegation_doc.get("delegator_id")})
        if not delegator_user or delegator_user.get("account_balance", 0.0) < payload.amount:
            raise HTTPException(status_code=400, detail="Delegating account has insufficient funds")
    else:
        # Standard user withdrawal
        if user_doc.get("account_balance", 0.0) < payload.amount:
            raise HTTPException(status_code=400, detail="Insufficient account balance")

    # Anti-Fraud Anomaly Heuristics
    anomaly_flag = False
    anomaly_reason = None

    if payload.amount >= 10000.0:
        anomaly_flag = True
        anomaly_reason = f"High-value cash withdrawal exceeding threshold (₹ {payload.amount:,.2f})"

    # Check velocity (multiple transactions within 5 minutes)
    five_min_ago = utc_now() - timedelta(minutes=5)
    recent_count = await db["transactions"].count_documents(
        {"user_id": user_doc["id"], "created_at": {"$gte": five_min_ago}}
    )
    if recent_count >= 2:
        anomaly_flag = True
        anomaly_reason = f"High velocity: {recent_count + 1} withdrawals within 5 minutes"

    # Atomic Update in MongoDB
    if delegator_user and delegation_doc:
        await db["users"].update_one(
            {"id": delegator_user["id"]},
            {"$inc": {"account_balance": -payload.amount}, "$set": {"updated_at": utc_now()}}
        )
        await db["delegations"].update_one(
            {"id": delegation_doc["id"]},
            {"$inc": {"current_withdrawn": payload.amount}}
        )
        balance_to_report = delegator_user["account_balance"] - payload.amount
    else:
        await db["users"].update_one(
            {"id": user_doc["id"]},
            {"$inc": {"account_balance": -payload.amount}, "$set": {"updated_at": utc_now()}}
        )
        balance_to_report = user_doc["account_balance"] - payload.amount

    tx_id = str(uuid.uuid4())
    now = utc_now()

    tx_doc = {
        "id": tx_id,
        "session_id": session_doc["id"],
        "user_id": user_doc["id"],
        "delegated_by_user_id": delegator_user["id"] if delegator_user else None,
        "amount": payload.amount,
        "transaction_type": "WITHDRAWAL",
        "status": "COMPLETED",
        "kiosk_id": session_doc["kiosk_id"],
        "anomaly_flag": anomaly_flag,
        "anomaly_reason": anomaly_reason,
        "created_at": now,
    }
    await db["transactions"].insert_one(tx_doc)

    await db["auth_sessions"].update_one(
        {"id": session_doc["id"]},
        {"$set": {"status": "COMPLETED", "updated_at": now}}
    )

    # Real-time WebSocket announcement to ATM Kiosk
    await ws_manager.broadcast_session_update(
        session_doc["id"],
        {
            "event": "DISPENSING_CASH",
            "session_id": session_doc["id"],
            "status": "COMPLETED",
            "transaction_id": tx_id,
            "amount": payload.amount,
            "remaining_balance": balance_to_report,
            "anomaly_flag": anomaly_flag,
            "message": f"Successfully authorized. Dispensing ₹{payload.amount:,.2f}...",
        },
    )

    return TransactionResponse(
        id=tx_id,
        session_id=session_doc["id"],
        user_id=user_doc["id"],
        delegated_by_user_id=delegator_user["id"] if delegator_user else None,
        amount=payload.amount,
        transaction_type="WITHDRAWAL",
        status="COMPLETED",
        kiosk_id=session_doc["kiosk_id"],
        anomaly_flag=anomaly_flag,
        anomaly_reason=anomaly_reason,
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
        query["anomaly_flag"] = True

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
            kiosk_id=d.get("kiosk_id", "KIOSK-01"),
            anomaly_flag=d.get("anomaly_flag", False),
            anomaly_reason=d.get("anomaly_reason"),
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

    await db["transactions"].update_one(
        {"id": transaction_id},
        {"$set": {
            "anomaly_flag": payload.anomaly_flag,
            "anomaly_reason": payload.anomaly_reason,
        }}
    )

    doc["anomaly_flag"] = payload.anomaly_flag
    doc["anomaly_reason"] = payload.anomaly_reason

    # Broadcast anomaly alert to admin dashboard
    await ws_manager.broadcast_admin({
        "type": "ANOMALY_UPDATED",
        "transaction_id": transaction_id,
        "anomaly_flag": payload.anomaly_flag,
        "anomaly_reason": payload.anomaly_reason,
    })

    return TransactionResponse(
        id=doc["id"],
        session_id=doc.get("session_id"),
        user_id=doc["user_id"],
        delegated_by_user_id=doc.get("delegated_by_user_id"),
        amount=doc["amount"],
        transaction_type=doc.get("transaction_type", "WITHDRAWAL"),
        status=doc.get("status", "COMPLETED"),
        kiosk_id=doc.get("kiosk_id", "KIOSK-01"),
        anomaly_flag=doc["anomaly_flag"],
        anomaly_reason=doc.get("anomaly_reason"),
        created_at=doc["created_at"],
    )
