import hashlib
import uuid
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
            "account_balance": 0.0,
            "reference_selfie": None,
            "role": "admin",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(admin_user)

    # Ensure demo customer alex exists
    alex_exists = await db["users"].find_one({"username": "alex"})
    if not alex_exists:
        alex_user = {
            "id": str(uuid.uuid4()),
            "username": "alex",
            "email": "alex@mercer.bank",
            "phone": "+91 98765 43210",
            "full_name": "Alex Mercer",
            "hashed_pin": hash_pin("1234"),
            "account_balance": 25000.0,
            "reference_selfie": None,
            "role": "user",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(alex_user)

    # Ensure demo customer sarah exists
    sarah_exists = await db["users"].find_one({"username": "sarah"})
    if not sarah_exists:
        sarah_user = {
            "id": str(uuid.uuid4()),
            "username": "sarah",
            "email": "sarah@mercer.bank",
            "phone": "+91 98765 43211",
            "full_name": "Sarah Mercer",
            "hashed_pin": hash_pin("4321"),
            "account_balance": 12000.0,
            "reference_selfie": None,
            "role": "user",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(sarah_user)

    # Ensure customer sujay exists with ₹25,000.23 balance
    sujay_exists = await db["users"].find_one({"username": "sujay"})
    if not sujay_exists:
        sujay_user = {
            "id": str(uuid.uuid4()),
            "username": "sujay",
            "email": "sujay.tp41@gmail.com",
            "phone": "+91 99999 99999",
            "full_name": "Sujay Lokhande",
            "hashed_pin": hash_pin("1234"),
            "account_balance": 25000.23,
            "reference_selfie": None,
            "role": "user",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        await db["users"].insert_one(sujay_user)
    else:
        await db["users"].update_one(
            {"username": "sujay"},
            {"$set": {"account_balance": 25000.23, "updated_at": now}}
        )
