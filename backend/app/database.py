import logging
from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("database")

# Global client and database instances
client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000)
    return client


def get_database() -> AsyncIOMotorDatabase:
    global db
    if db is None:
        c = get_client()
        db = c[settings.DATABASE_NAME]
    return db


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """FastAPI dependency to inject MongoDB database instance."""
    yield get_database()


async def init_db() -> None:
    """Initializes MongoDB client, establishes connection, and creates required indexes."""
    global client, db
    logger.info(f"Connecting to MongoDB Atlas database '{settings.DATABASE_NAME}'...")
    client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=10000)
    db = client[settings.DATABASE_NAME]

    # Verify server connectivity
    server_info = await client.server_info()
    logger.info(f"MongoDB connected successfully! Server version: {server_info.get('version')}")

    # Create Indexes
    # 1. Users collection
    await db["users"].create_index("id", unique=True)
    await db["users"].create_index("username", unique=True)
    await db["users"].create_index("phone", unique=True)
    await db["users"].create_index("email", unique=True)

    # 2. Auth Sessions collection
    await db["auth_sessions"].create_index("id", unique=True)
    await db["auth_sessions"].create_index("kiosk_id")
    await db["auth_sessions"].create_index("status")

    # 3. Transactions collection
    await db["transactions"].create_index("id", unique=True)
    await db["transactions"].create_index("user_id")
    await db["transactions"].create_index("session_id")
    await db["transactions"].create_index("created_at")

    # 4. Delegations collection
    await db["delegations"].create_index("id", unique=True)
    await db["delegations"].create_index("delegator_id")
    await db["delegations"].create_index("delegatee_phone")
    await db["delegations"].create_index("is_active")

    logger.info("MongoDB collections and indexes configured.")


async def close_db() -> None:
    """Closes the MongoDB client connection."""
    global client
    if client is not None:
        client.close()
        logger.info("MongoDB client connection closed.")
