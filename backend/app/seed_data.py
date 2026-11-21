import hashlib
import uuid
from datetime import timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models import utc_now


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode()).hexdigest()


async def seed_database(db: AsyncIOMotorDatabase) -> None:
    now = utc_now()
    admin_exists = await db["users"].find_one({"role": "admin"})
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": "admin@bank.internal",
            "phone": "+91 800-555-0100",
            "full_name": "Bank Administrator",
            "hashed_pin": hash_pin("9999"),
            "duress_pin": "9999",
            "account_frozen_duress": False,
            "account_balance": 0.0,
            "reference_selfie": None,
            "role": "admin",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(admin_user)
    else:
        await db["users"].update_one(
            {"role": "admin"},
            {"$set": {"duress_pin": "9999", "account_frozen_duress": False}}
        )

    # Ensure demo customer alex exists
    alex_doc = await db["users"].find_one({"username": "alex"})
    if not alex_doc:
        alex_id = str(uuid.uuid4())
        alex_user = {
            "id": alex_id,
            "username": "alex",
            "email": "alex@mercer.bank",
            "phone": "+91 98765 43210",
            "full_name": "Alex Mercer",
            "hashed_pin": hash_pin("1234"),
            "duress_pin": "4321",
            "account_frozen_duress": False,
            "account_balance": 25000.0,
            "reference_selfie": None,
            "role": "user",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(alex_user)
        alex_doc = alex_user
    else:
        await db["users"].update_one(
            {"username": "alex"},
            {"$set": {"duress_pin": "4321", "account_frozen_duress": False}}
        )

    # Ensure demo customer sarah exists
    sarah_doc = await db["users"].find_one({"username": "sarah"})
    if not sarah_doc:
        sarah_id = str(uuid.uuid4())
        sarah_user = {
            "id": sarah_id,
            "username": "sarah",
            "email": "sarah@mercer.bank",
            "phone": "+91 98765 43211",
            "full_name": "Sarah Mercer",
            "hashed_pin": hash_pin("4321"),
            "duress_pin": "1234",
            "account_frozen_duress": False,
            "account_balance": 12000.0,
            "reference_selfie": None,
            "role": "user",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(sarah_user)
        sarah_doc = sarah_user
    else:
        await db["users"].update_one(
            {"username": "sarah"},
            {"$set": {"duress_pin": "1234", "account_frozen_duress": False}}
        )

    # Ensure customer sujay exists with ₹25,000.23 balance
    sujay_doc = await db["users"].find_one({"username": "sujay"})
    if not sujay_doc:
        sujay_id = str(uuid.uuid4())
        sujay_user = {
            "id": sujay_id,
            "username": "sujay",
            "email": "sujay.tp41@gmail.com",
            "phone": "+91 99999 99999",
            "full_name": "Sujay Lokhande",
            "hashed_pin": hash_pin("1234"),
            "duress_pin": "4321",
            "account_frozen_duress": False,
            "account_balance": 25000.23,
            "reference_selfie": None,
            "role": "user",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(sujay_user)
        sujay_doc = sujay_user
    else:
        await db["users"].update_one(
            {"username": "sujay"},
            {"$set": {"duress_pin": "4321", "account_frozen_duress": False, "updated_at": now}}
        )

    # Seed sample transactions with risk_scores if empty
    tx_count = await db["transactions"].count_documents({})
    if tx_count == 0:
        sample_txs = [
            {
                "id": str(uuid.uuid4()),
                "session_id": str(uuid.uuid4()),
                "user_id": alex_doc["id"],
                "delegated_by_user_id": None,
                "amount": 2000.0,
                "transaction_type": "WITHDRAWAL",
                "status": "COMPLETED",
                "kiosk_id": "KIOSK-EAST-01",
                "anomaly_flag": False,
                "anomaly_reason": None,
                "is_duress": False,
                "risk_score": 12,
                "risk_factors": ["Standard Biometric Auth"],
                "created_at": now - timedelta(hours=2),
            },
            {
                "id": str(uuid.uuid4()),
                "session_id": str(uuid.uuid4()),
                "user_id": sujay_doc["id"],
                "delegated_by_user_id": None,
                "amount": 5000.0,
                "transaction_type": "WITHDRAWAL",
                "status": "COMPLETED",
                "kiosk_id": "KIOSK-EAST-01",
                "anomaly_flag": False,
                "anomaly_reason": None,
                "is_duress": False,
                "risk_score": 18,
                "risk_factors": ["Express Pre-Staged Auth"],
                "created_at": now - timedelta(hours=5),
            },
            {
                "id": str(uuid.uuid4()),
                "session_id": str(uuid.uuid4()),
                "user_id": sarah_doc["id"],
                "delegated_by_user_id": None,
                "amount": 10000.0,
                "transaction_type": "WITHDRAWAL",
                "status": "COMPLETED",
                "kiosk_id": "KIOSK-DOWNTOWN-04",
                "anomaly_flag": True,
                "anomaly_reason": "High-value cash withdrawal (₹ 10,000.00)",
                "is_duress": False,
                "risk_score": 45,
                "risk_factors": ["High-value cash withdrawal exceeding threshold (+25)", "First withdrawal at new terminal (+20)"],
                "created_at": now - timedelta(days=1),
            },
        ]
        await db["transactions"].insert_many(sample_txs)
