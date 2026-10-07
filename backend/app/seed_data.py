import hashlib
import uuid
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models import utc_now


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode()).hexdigest()


async def seed_database(db: AsyncIOMotorDatabase) -> None:
    """
    Seeds ONLY the system administrator account if no admin exists.
    No dummy users, no dummy transactions, no dummy delegations.
    """
    admin_exists = await db["users"].find_one({"role": "admin"})
    if admin_exists:
        return

    now = utc_now()
    admin_user = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "email": "admin@bank.internal",
        "phone": "+1 800-555-0100",
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
