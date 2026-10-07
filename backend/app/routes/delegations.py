import uuid
from datetime import timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db
from app.models import utc_now, is_expired
from app.schemas import DelegationCreateRequest, DelegationResponse

router = APIRouter(prefix="/api/delegations", tags=["Temporary Delegations"])


@router.post("", response_model=DelegationResponse)
async def create_delegation(
    payload: DelegationCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Creates a temporary cardless delegation permitting a family member
    or trusted proxy to withdraw cash up to a strictly capped limit.
    """
    delegator = await db["users"].find_one({"id": payload.delegator_id})
    if not delegator:
        raise HTTPException(status_code=404, detail="Delegator user not found")

    if delegator.get("account_balance", 0.0) < payload.max_withdrawal_limit:
        raise HTTPException(
            status_code=400,
            detail=f"Max limit cannot exceed your current balance (${delegator.get('account_balance', 0.0):.2f})",
        )

    now = utc_now()
    expires_at = now + timedelta(hours=payload.duration_hours)
    del_id = str(uuid.uuid4())

    delegation_doc = {
        "id": del_id,
        "delegator_id": payload.delegator_id,
        "delegatee_phone": payload.delegatee_phone.strip(),
        "delegatee_name": payload.delegatee_name.strip(),
        "max_withdrawal_limit": payload.max_withdrawal_limit,
        "current_withdrawn": 0.0,
        "is_active": True,
        "expires_at": expires_at,
        "created_at": now,
    }
    await db["delegations"].insert_one(delegation_doc)

    return DelegationResponse(
        id=del_id,
        delegator_id=payload.delegator_id,
        delegator_name=delegator.get("full_name"),
        delegatee_phone=payload.delegatee_phone.strip(),
        delegatee_name=payload.delegatee_name.strip(),
        max_withdrawal_limit=payload.max_withdrawal_limit,
        current_withdrawn=0.0,
        remaining_limit=payload.max_withdrawal_limit,
        is_active=True,
        expires_at=expires_at,
        created_at=now,
    )


@router.get("", response_model=List[DelegationResponse])
async def list_delegations(
    delegator_id: Optional[str] = Query(None),
    delegatee_phone: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = {}
    if delegator_id:
        query["delegator_id"] = delegator_id
    if delegatee_phone:
        query["delegatee_phone"] = delegatee_phone

    cursor = db["delegations"].find(query).sort("created_at", -1)
    delegations = await cursor.to_list(length=100)

    # Pre-fetch delegators for name mapping
    delegator_ids = list({d["delegator_id"] for d in delegations if "delegator_id" in d})
    users_cursor = db["users"].find({"id": {"$in": delegator_ids}})
    users_list = await users_cursor.to_list(length=len(delegator_ids) + 10)
    user_map = {u["id"]: u.get("full_name", "Unknown") for u in users_list}

    enriched: List[DelegationResponse] = []
    for d in delegations:
        expired = is_expired(d.get("expires_at"))
        active_status = d.get("is_active", True) and not expired

        max_limit = d.get("max_withdrawal_limit", 0.0)
        withdrawn = d.get("current_withdrawn", 0.0)

        enriched.append(
            DelegationResponse(
                id=d["id"],
                delegator_id=d["delegator_id"],
                delegator_name=user_map.get(d["delegator_id"], "Unknown"),
                delegatee_phone=d["delegatee_phone"],
                delegatee_name=d["delegatee_name"],
                max_withdrawal_limit=max_limit,
                current_withdrawn=withdrawn,
                remaining_limit=max(0.0, max_limit - withdrawn),
                is_active=active_status,
                expires_at=d["expires_at"],
                created_at=d["created_at"],
            )
        )
    return enriched


@router.delete("/{delegation_id}")
async def revoke_delegation(
    delegation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await db["delegations"].find_one({"id": delegation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Delegation not found")

    await db["delegations"].update_one(
        {"id": delegation_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Delegation revoked successfully", "id": delegation_id}
