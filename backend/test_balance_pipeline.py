import asyncio
from app.database import init_db, close_db, get_database

async def test_balance_update():
    await init_db()
    db = get_database()
    user = await db["users"].find_one({"username": "alex"})
    if not user:
        print("User alex not found in DB")
        await close_db()
        return

    old_balance = float(user.get("account_balance", user.get("balance", 0.0)))
    print(f"Alex Current Balance in MongoDB: ₹{old_balance:,.2f}")

    # Test atomic deduction
    test_amount = 500.0
    await db["users"].update_one(
        {"id": user["id"]},
        {"$inc": {"account_balance": -test_amount, "balance": -test_amount}}
    )

    fresh_user = await db["users"].find_one({"id": user["id"]})
    new_balance = float(fresh_user.get("account_balance", fresh_user.get("balance", 0.0)))
    print(f"Alex New Balance in MongoDB after ₹{test_amount:,.2f} withdrawal: ₹{new_balance:,.2f}")

    # Revert back to original
    await db["users"].update_one(
        {"id": user["id"]},
        {"$inc": {"account_balance": test_amount, "balance": test_amount}}
    )
    reverted_user = await db["users"].find_one({"id": user["id"]})
    print(f"Alex Balance safely restored: ₹{float(reverted_user.get('account_balance', 0.0)):,.2f}")

    assert abs(old_balance - (new_balance + test_amount)) < 0.01, "Balance math mismatch!"
    print("ALL MONGODB ATOMIC BALANCE PIPELINE CHECKS PASSED!")
    await close_db()

if __name__ == "__main__":
    asyncio.run(test_balance_update())

