import hashlib
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now
from app.schemas import (
    UserLoginRequest,
    UserRegisterRequest,
    LoginResponse,
    UserResponse,
    UpdateReferencePhotoRequest,
)
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/api", tags=["Users & Authentication"])


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode()).hexdigest()


def doc_to_user_response(doc: dict) -> UserResponse:
    selfie = doc.get("reference_selfie")
    return UserResponse(
        id=doc["id"],
        username=doc["username"],
        email=doc["email"],
        phone=doc["phone"],
        full_name=doc["full_name"],
        role=doc.get("role", "user"),
        account_balance=float(doc.get("account_balance") if doc.get("account_balance") is not None else doc.get("balance", 0.0)),
        is_active=doc.get("is_active", True),
        account_frozen_duress=doc.get("account_frozen_duress", False),
        duress_pin=doc.get("duress_pin"),
        has_reference_selfie=bool(selfie and len(selfie) > 20),
        created_at=doc["created_at"],
    )


@router.post("/auth/register", response_model=LoginResponse)
async def register(payload: UserRegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Registers a new bank account holder with mandatory selfie enrollment.
    Automatically generates a Silent Duress PIN (defaults to reversed PIN if not specified).
    """
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()
    phone = payload.phone.strip()

    existing = await db["users"].find_one({
        "$or": [
            {"username": username},
            {"email": email},
            {"phone": phone}
        ]
    })
    if existing:
        if existing.get("username") == username:
            raise HTTPException(status_code=400, detail="Username is already taken.")
        if existing.get("email") == email:
            raise HTTPException(status_code=400, detail="Email is already registered.")
        if existing.get("phone") == phone:
            raise HTTPException(status_code=400, detail="Phone number is already registered.")

    if not payload.reference_selfie_base64 or len(payload.reference_selfie_base64) < 30:
        raise HTTPException(status_code=400, detail="A clear selfie is required for biometric enrollment.")

    user_id = str(uuid.uuid4())
    now = utc_now()
    deposit_amt = 1000.0
    if payload.initial_deposit is not None:
        deposit_amt = float(payload.initial_deposit)
    elif payload.account_balance is not None:
        deposit_amt = float(payload.account_balance)

    # Duress PIN: explicit or reversed PIN
    clean_pin = payload.pin.strip()
    duress_pin = (payload.duress_pin or clean_pin[::-1]).strip()

    user_doc = {
        "id": user_id,
        "username": username,
        "email": email,
        "phone": phone,
        "full_name": payload.full_name.strip(),
        "hashed_pin": hash_pin(clean_pin),
        "duress_pin": duress_pin,
        "account_frozen_duress": False,
        "account_balance": deposit_amt,
        "reference_selfie": payload.reference_selfie_base64.strip(),
        "role": "user",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    await db["users"].insert_one(user_doc)

    dummy_token = f"jwt-token-{user_id}-user"
    return LoginResponse(
        user=doc_to_user_response(user_doc),
        access_token=dummy_token,
    )


@router.post("/auth/login", response_model=LoginResponse)
async def login(payload: UserLoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db["users"].find_one({"username": payload.username.strip().lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or PIN")

    hashed_input = hash_pin(payload.pin)
    if user.get("hashed_pin") != hashed_input:
        raise HTTPException(status_code=401, detail="Invalid username or PIN")

    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    dummy_token = f"jwt-mock-{user['id']}-{user.get('role', 'user')}"
    return LoginResponse(
        user=doc_to_user_response(user),
        access_token=dummy_token,
    )


@router.get("/users", response_model=List[UserResponse])
async def list_users(db: AsyncIOMotorDatabase = Depends(get_db)):
    cursor = db["users"].find({})
    users = await cursor.to_list(length=100)
    return [doc_to_user_response(u) for u in users]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db["users"].find_one(
        {"$or": [{"id": user_id}, {"username": user_id}]}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return doc_to_user_response(user)


@router.get("/users/{user_id}/reference-photo")
async def get_user_reference_photo(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db["users"].find_one(
        {"$or": [{"id": user_id}, {"username": user_id}]}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user["id"],
        "full_name": user["full_name"],
        "reference_selfie": user.get("reference_selfie"),
    }


@router.put("/users/{user_id}/reference-photo")
async def update_reference_photo(
    user_id: str,
    payload: UpdateReferencePhotoRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db["users"].find_one(
        {"$or": [{"id": user_id}, {"username": user_id}]}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db["users"].update_one(
        {"id": user["id"]},
        {"$set": {
            "reference_selfie": payload.reference_selfie_base64,
            "updated_at": utc_now(),
        }}
    )
    return {
        "message": "Reference selfie updated successfully in MongoDB",
        "user_id": user["id"],
        "has_reference_selfie": True,
    }


@router.post("/admin/users/{user_id}/unfreeze")
async def admin_unfreeze_user(user_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Administrative Endpoint: Acknowledges safety verification and unlocks/unfreezes
    an account that was placed into silent duress lockdown.
    """
    user = await db["users"].find_one(
        {"$or": [{"id": user_id}, {"username": user_id}]}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = utc_now()
    await db["users"].update_one(
        {"id": user["id"]},
        {"$set": {"account_frozen_duress": False, "updated_at": now}}
    )

    user["account_frozen_duress"] = False

    # Broadcast event to Admin Dashboard
    await ws_manager.broadcast_admin({
        "type": "USER_UNFROZEN",
        "user_id": user["id"],
        "user_name": user["full_name"],
        "timestamp": now.isoformat(),
        "message": f"Security Hold lifted for {user['full_name']} by Administrator.",
    })

    return {
        "message": f"User account for {user['full_name']} successfully unfrozen.",
        "user": doc_to_user_response(user),
    }
