import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db, get_database
from app.seed_data import seed_database
from app.websocket_manager import ws_manager
from app.routes import auth, atm_session, verification, transactions, delegations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("atm_kiosk_app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB Atlas connection & seed records
    logger.info("Initializing MongoDB Atlas connection and collections...")
    await init_db()
    db = get_database()
    await seed_database(db)
    logger.info("MongoDB Atlas database initialized and ready.")
    yield
    # Shutdown
    logger.info("Shutting down ATM Anti-Fraud Kiosk Backend.")
    await close_db()


app = FastAPI(
    title="ATM Anti-Fraud Kiosk Backend API",
    description="Cardless Dynamic QR + Mobile Biometrics (Fingerprint + Gemini Vision Face Match) with MongoDB Atlas",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(atm_session.router)
app.include_router(verification.router)
app.include_router(transactions.router)
app.include_router(delegations.router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ATM Anti-Fraud Core Engine",
        "database": f"MongoDB Atlas ({settings.DATABASE_NAME})",
        "gemini_rotator": "Active",
    }


# ===================== WEBSOCKET CHANNELS =====================

@app.websocket("/ws/kiosk/{session_id}")
async def kiosk_websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    Real-time bidirectional channel between the ATM Kiosk display and Backend.
    Broadcasts session transitions: QR_SCANNED -> BIOMETRICS_VERIFIED -> AUTHORIZED -> DISPENSING.
    """
    await ws_manager.connect_kiosk(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect_kiosk(session_id, websocket)
    except Exception as e:
        logger.warning(f"Kiosk WS exception for {session_id}: {e}")
        await ws_manager.disconnect_kiosk(session_id, websocket)


@app.websocket("/ws/admin")
async def admin_websocket_endpoint(websocket: WebSocket):
    """
    Telemetry channel for the Admin Operations Center to monitor ATM transactions in real time.
    """
    await ws_manager.connect_admin(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect_admin(websocket)
    except Exception as e:
        logger.warning(f"Admin WS exception: {e}")
        await ws_manager.disconnect_admin(websocket)
