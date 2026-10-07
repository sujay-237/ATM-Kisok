import hashlib
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now
import uuid
from app.schemas import (
    UserLoginRequest,
    UserRegisterRequest,
    LoginResponse,
    UserResponse,
    UpdateReferencePhotoRequest,
)

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
        account_balance=doc.get("account_balance", 0.0),
        is_active=doc.get("is_active", True),
        has_reference_selfie=bool(selfie and len(selfie) > 20),
        created_at=doc["created_at"],
    )


@router.post("/auth/register", response_model=LoginResponse)
async def register(payload: UserRegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Registers a new bank account holder with mandatory selfie enrollment.
    This selfie serves as the biometric ground-truth baseline for ATM dynamic QR + face verification.
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
    user_doc = {
        "id": user_id,
        "username": username,
        "email": email,
        "phone": phone,
        "full_name": payload.full_name.strip(),
        "hashed_pin": hash_pin(payload.pin),
        "account_balance": float(payload.initial_deposit),
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
    user = await db["users"].find_one({"username": payload.username.strip()})
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
