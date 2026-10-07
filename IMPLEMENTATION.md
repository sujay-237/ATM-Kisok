# 🛠️ System Implementation Manual (Sentinel Architecture)

This document provides an exhaustive, code-level technical explanation of the **Cardless ATM Anti-Fraud Kiosk System (Sentinel Architecture)**. It details internal mechanics, data models, state machines, algorithmic strategies, and hardware simulations across all monorepo components.

---

## 📑 Table of Contents

- [1. Architectural Overview](#1-architectural-overview)
- [2. Backend Service Architecture (FastAPI)](#2-backend-service-architecture-fastapi)
  - [2.1 Async Lifecycle & Motor MongoDB Integration](#21-async-lifecycle--motor-mongodb-integration)
  - [2.2 Data Models & Database Indexing](#22-data-models--database-indexing)
  - [2.3 Session State Machine](#23-session-state-machine)
  - [2.4 WebSocket Connection Manager & Broadcast Hub](#24-websocket-connection-manager--broadcast-hub)
  - [2.5 Google Gemini 3-Key Dynamic Rotator](#25-google-gemini-3-key-dynamic-rotator)
  - [2.6 Atomic Transactions & Delegation Control](#26-atomic-transactions--delegation-control)
  - [2.7 AI Anomaly Detection Engine](#27-ai-anomaly-detection-engine)
- [3. ATM Kiosk Terminal Implementation](#3-atm-kiosk-terminal-implementation)
  - [3.1 Component Architecture](#31-component-architecture)
  - [3.2 Dynamic QR Generation & Session Lifecycle](#32-dynamic-qr-generation--session-lifecycle)
  - [3.3 Web Audio API Procedural Sound Engine](#33-web-audio-api-procedural-sound-engine)
  - [3.4 Motorized Cash Dispenser Animation](#34-motorized-cash-dispenser-animation)
- [4. Security Operations Center & User Dashboard](#4-security-operations-center--user-dashboard)
  - [4.1 Real-Time Admin Telemetry Feed](#41-real-time-admin-telemetry-feed)
  - [4.2 Visual Gemini Key Rotator Control Panel](#42-visual-gemini-key-rotator-control-panel)
  - [4.3 Family Delegation Authorization Module](#43-family-delegation-authorization-module)
- [5. Mobile Banking Application Implementation](#5-mobile-banking-application-implementation)
  - [5.1 QR Viewfinder with Laser Scanner](#51-qr-viewfinder-with-laser-scanner)
  - [5.2 Local Hardware Biometric Verification](#52-local-hardware-biometric-verification)
  - [5.3 Live Selfie Capture & Base64 Pipeline](#53-live-selfie-capture--base64-pipeline)
- [6. End-to-End Automated Test Pipeline](#6-end-to-end-automated-test-pipeline)
- [7. Configuration & Environment Reference](#7-configuration--environment-reference)

---

## 1. Architectural Overview

The Sentinel Architecture was developed as a modular, decoupled monorepo comprising four high-cohesion sub-systems communicating via RESTful JSON APIs and non-blocking WebSockets:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MONOREPO COMPONENT GRAPH                        │
└────────────────────────────────────────────────────────────────────────┘

 [atm-kiosk] (Port 3000)                [mobile-app] (Port 8081)
  React 18 + Vite + Tailwind             Expo / React Native
         │                                       │
         │ WebSocket (/ws/kiosk/{id})            │ HTTPS REST API
         │ REST Session Fetch                    │ Biometrics & Live Selfie
         ▼                                       ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │                      FastAPI Gateway (Port 8000)                     │
 │  - Uvicorn ASGI Server               - PyJWT Auth Subsystem          │
 │  - Motor Async MongoDB Driver        - WebSocket Broadcast Manager   │
 │  - Gemini 3-Key Dynamic Rotator      - Anti-Fraud Anomaly Heuristics │
 └───────────────────────┬──────────────────────┬───────────────────────┘
                         │                      │
                         ▼                      ▼
           ┌────────────────────────┐  ┌────────────────────────────────┐
           │ MongoDB Atlas Database │  │ Google Gemini 1.5 Flash API    │
           │ (Atlas Cluster v8.0)   │  │ (3 Key Quota Rotator Engine)   │
           └────────────────────────┘  └────────────────────────────────┘
                         ▲
                         │ WebSocket (/ws/admin) & REST
                         │
                 [dashboard] (Port 3001)
                  Admin SOC & User Portal
```

---

## 2. Backend Service Architecture (FastAPI)

### 2.1 Async Lifecycle & Motor MongoDB Integration

The backend is built on **FastAPI (v0.115+)** running on the high-performance **Uvicorn ASGI** worker. All database operations utilize **Motor**, the official asynchronous Python driver for MongoDB, preventing blocking operations during heavy I/O loops.

#### Application Lifespan Handler (`backend/app/main.py`)
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas and ensure collections & indexes exist
    await init_db()
    await seed_database()
    logger.info("Sentinel ATM Backend initialized successfully.")
    yield
    # Shutdown: Gracefully close active database connections
    await close_db()
    logger.info("Sentinel ATM Backend database connections closed.")
```

### 2.2 Data Models & Database Indexing

The schema is defined using Pydantic v2 in `backend/app/models.py` and mapped to four primary collections in `backend/app/database.py`:

```
MongoDB Atlas: `atm_kiosk`
├── users
│   ├── id: UUID (Primary Key, Unique Index)
│   ├── username: String (Unique Index)
│   ├── phone: String (Unique Index)
│   ├── email: String (Unique Index)
│   ├── hashed_pin: String (Argon2 / SHA256 hashed)
│   ├── account_balance: Float
│   ├── reference_selfie: Base64 String
│   └── is_cardless_enabled: Boolean
│
├── auth_sessions
│   ├── id: UUID (Unique Index)
│   ├── kiosk_id: String (Indexed)
│   ├── status: String (Enum: CREATED, SCANNED, BIOMETRICS_VERIFIED, AUTHORIZED, COMPLETED, EXPIRED)
│   ├── user_id: Optional[UUID]
│   ├── qr_payload: String (atm://session?id=...)
│   ├── created_at: DateTime
│   └── expires_at: DateTime (Indexed for TTL cleanup)
│
├── transactions
│   ├── id: UUID (Unique Index)
│   ├── user_id: UUID (Indexed)
│   ├── session_id: UUID (Indexed)
│   ├── kiosk_id: String
│   ├── amount: Float
│   ├── transaction_type: String ("WITHDRAWAL")
│   ├── status: String ("COMPLETED", "FAILED")
│   ├── is_delegated: Boolean
│   ├── delegated_by: Optional[UUID]
│   ├── anomaly_flag: Boolean
│   ├── anomaly_reason: Optional[String]
│   └── created_at: DateTime (Indexed)
│
└── delegations
    ├── id: UUID (Unique Index)
    ├── delegator_id: UUID (Indexed)
    ├── delegatee_phone: String (Indexed)
    ├── max_amount: Float
    ├── used_amount: Float
    ├── is_active: Boolean (Indexed)
    ├── expires_at: DateTime
    └── created_at: DateTime
```

### 2.3 Session State Machine

The ATM session enforces a strict finite state machine (FSM). Unauthorized transitions are rejected with HTTP 400 errors:

```
  ┌───────────┐
  │  CREATED  │ ── (Terminal loads, displays rotating QR)
  └─────┬─────┘
        │ POST /api/session/{id}/scan (Mobile scans QR)
        ▼
  ┌───────────┐
  │  SCANNED  │ ── (Mobile device bound, user recognized)
  └─────┬─────┘
        │ POST /api/session/{id}/biometric-auth (Fingerprint verified)
        ▼
┌─────────────────────┐
│ BIOMETRICS_VERIFIED │ ── (Device local authentication passed)
└─────────┬───────────┘
          │ POST /api/verify-selfie (Gemini Vision Face Match >= 0.85)
          ▼
   ┌────────────┐
   │ AUTHORIZED │ ── (Terminal unlocks cash withdrawal keypad)
   └──────┬─────┘
          │ POST /api/transactions/withdraw (Amount selected & dispensed)
          ▼
   ┌───────────┐
   │ COMPLETED │ ── (Physical cash dispensed, session terminated)
   └───────────┘

   * At any point: If elapsed_time > 180s ──> [EXPIRED]
```

### 2.4 WebSocket Connection Manager & Broadcast Hub

The real-time synchronization layer in `backend/app/websocket_manager.py` manages active WebSocket connections using session-specific rooms:

```python
class ConnectionManager:
    def __init__(self):
        # Maps session_id -> List of active WebSockets (Kiosk terminals)
        self.kiosk_rooms: Dict[str, List[WebSocket]] = {}
        # List of active Admin dashboard connections
        self.admin_connections: List[WebSocket] = []

    async def connect_kiosk(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.kiosk_rooms:
            self.kiosk_rooms[session_id] = []
        self.kiosk_rooms[session_id].append(websocket)

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.kiosk_rooms:
            for connection in self.kiosk_rooms[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_admin_event(self, event_data: dict):
        for connection in self.admin_connections:
            try:
                await connection.send_json(event_data)
            except Exception:
                pass
```

### 2.5 Google Gemini 3-Key Dynamic Rotator

Biometric verification at scale requires high availability. Cloud AI API keys can suffer quota restrictions or temporary rate limits. The **Gemini 3-Key Dynamic Rotator** (`backend/app/gemini_rotator.py`) handles this autonomously:

#### Internal Slot Structure
```python
class KeySlot:
    key_id: str               # "KEY_1", "KEY_2", "KEY_3"
    api_key: str              # Actual Google AI Studio key
    status: str               # "HEALTHY", "COOLDOWN", "DISABLED"
    cooldown_until: float     # Epoch timestamp when quarantine expires
    fail_count: int           # Consecutive failure counter
    total_requests: int       # Lifetime inference counter
```

#### Selection & Failover Algorithm
1. **Filtering Available Keys**: Identifies slots where `status == "HEALTHY"` or `current_time > cooldown_until`. If a cooldown has elapsed, the slot automatically transitions back to `"HEALTHY"`.
2. **Round-Robin Cycling**: Distributes incoming selfie verification requests sequentially among healthy slots.
3. **HTTP 429 Handling**:
   - If Gemini returns an HTTP 429 (Resource Exhausted / Rate Limit), the key is flagged with `status = "COOLDOWN"` and `cooldown_until = current_time + 60.0`.
   - The engine immediately captures the exception, selects the next healthy slot, and retries the request without dropping the user's transaction.
4. **Offline Sandbox Fallback**: If no keys are configured or network connectivity to Google AI servers fails, the rotator falls back to an internal structural face-comparison algorithm with deterministic similarity scoring.

#### Multimodal Prompt Structure
```text
SYSTEM PROMPT:
You are an ultra-secure biometric authentication verification engine for a banking ATM kiosk.
You are given two images:
Image 1: Registered baseline customer reference photo.
Image 2: Live selfie captured from the mobile device front camera.

Tasks:
1. Verify whether the person in Image 2 is the same individual as in Image 1.
2. Check for anti-spoofing flags (e.g. photos of screens, printed paper, plastic masks).
3. Output strictly valid JSON matching this schema:
{
  "match": true | false,
  "confidence": 0.00 to 1.00,
  "liveness_passed": true | false,
  "reason": "Clear explanation of geometric facial match and lighting/texture consistency"
}
```

### 2.6 Atomic Transactions & Delegation Control

Cash withdrawal is executed using atomic MongoDB document mutations to prevent double-spending and race conditions:

```python
# Atomic user balance decrement
update_result = await db["users"].update_one(
    {"id": user_id, "account_balance": {"$gte": amount}},
    {"$inc": {"account_balance": -amount}}
)
if update_result.modified_count == 0:
    raise HTTPException(status_code=400, detail="Insufficient account balance")
```

For **delegated withdrawals**:
```python
# Atomic verification and usage increment for emergency delegations
delegation = await db["delegations"].find_one({
    "delegator_id": delegator_id,
    "delegatee_phone": beneficiary_phone,
    "is_active": True,
    "expires_at": {"$gt": datetime.utcnow()}
})
if delegation["used_amount"] + amount > delegation["max_amount"]:
    raise HTTPException(status_code=400, detail="Amount exceeds active delegation limit")

await db["delegations"].update_one(
    {"id": delegation["id"]},
    {"$inc": {"used_amount": amount}}
)
```

### 2.7 AI Anomaly Detection Engine

Every transaction is evaluated by heuristic anomaly detection rules:
1. **High Value Threshold**: Withdrawals exceeding ₹10,000.00 are automatically flagged.
2. **Velocity Check**: More than 3 withdrawals on the same account within a 15-minute window trigger high-velocity fraud alerts.
3. **Delegation Ceiling Alert**: Any delegated withdrawal exceeding 90% of the maximum limit triggers a warning badge in the Admin SOC.

---

## 3. ATM Kiosk Terminal Implementation

The ATM Kiosk (`atm-kiosk`) is implemented in **React 18**, **Vite**, and **Tailwind CSS**. It simulates an industrial ATM touch screen.

### 3.1 Component Architecture

```
App.tsx (Main State Machine & WebSocket Listener)
├── Header.tsx (Terminal ID, Real-time Clock, WebSocket Connection Pill)
├── SessionQRCode.tsx (Rotating QR canvas, session countdown timer)
├── AuthProcessingScreen.tsx (Progress pulse: Scanning -> Biometrics -> Verifying)
├── AmountSelectionScreen.tsx (Preset cash buttons: ₹500, ₹1,000, ₹2,000, ₹3,000, ₹5,000, ₹10,000)
│   └── Keypad.tsx (Custom numeric entry keypad with tactile audio)
├── CashDispenser.tsx (Motor shutter animation, bill counter, glowing cash tray)
└── TransactionSuccessScreen.tsx (ATM receipt card, balance update, session exit)
```

### 3.2 Dynamic QR Generation & Session Lifecycle

The kiosk automatically requests a new cryptographic session token on initial mount:
```typescript
const initSession = async () => {
  const res = await fetch(`${API_BASE}/api/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kiosk_id: 'KIOSK-EAST-01' })
  });
  const data = await res.json();
  setSessionId(data.session_id);
  setQrPayload(data.qr_payload); // e.g., atm://session?id=...&kiosk=KIOSK-EAST-01
  connectWebSocket(data.session_id);
};
```

### 3.3 Web Audio API Procedural Sound Engine

To achieve tactile immersion without external audio assets, `atm-kiosk/src/utils/sound.ts` synthesizes procedural audio directly via the browser's `AudioContext`:

- **Keypad Beeps**: Generates dual-tone sine waves (1200Hz and 1800Hz) modulated with a fast exponential decay (50ms).
- **Cash Dispenser Sound**: Procedurally combines low-frequency motor hum (120Hz square wave with bandpass filter) with periodic bill-flipping flutter clicks.
- **Success Chime**: Synthesizes a harmonious major chord progression (C5 &rarr; E5 &rarr; G5) indicating authorization completion.

### 3.4 Motorized Cash Dispenser Animation

The `CashDispenser.tsx` component coordinates mechanical animations:
1. Shutter door lifts upward using CSS `translate-y-[-100%]`.
2. Emerald green LED tray backlighting illuminates.
3. Visual stack of currency notes cascades into the dispensing slot.
4. Digital note counter increments synchronously with dispensing audio.

---

## 4. Security Operations Center & User Dashboard

The `dashboard` application provides role-based interfaces for both security administrators and retail banking customers.

### 4.1 Real-Time Admin Telemetry Feed

The Security Operations Center (SOC) connects to the `/ws/admin` WebSocket channel:
- **Live Transaction Ledger**: Streams every cash withdrawal event across all kiosks with millisecond timestamps, kiosk IDs, user names, and amounts.
- **Fraud Anomaly Highlights**: Visual amber/red threat banners displaying anomaly reasons (e.g. `HIGH_AMOUNT_WITHDRAWAL: ₹15,000.00`).

### 4.2 Visual Gemini Key Rotator Control Panel

The SOC provides direct visibility into Google Gemini infrastructure:
- **Slot Status Indicators**: Live badges for `KEY_1`, `KEY_2`, and `KEY_3` (`ACTIVE`, `STANDBY`, `COOLDOWN 48s`).
- **Failure Counters**: Tracks cumulative 429 quota events and automatic failover events.
- **Runtime Key Overrides**: Admins can paste a fresh Google AI Studio key to instantly replace an exhausted slot without restarting backend services.

### 4.3 Family Delegation Authorization Module

In the User Portal, account holders can authorize family members:
- Enter beneficiary mobile number.
- Set strict maximum withdrawal amount (e.g., ₹2,000.00).
- Set expiration duration (e.g., 2 hours, 24 hours).
- Review active delegations and revoke privileges instantly.

---

## 5. Mobile Banking Application Implementation

The `mobile-app` client is built using **Expo / React Native** and can run either natively on iOS/Android or inside a simulated browser container.

### 5.1 QR Viewfinder with Laser Scanner

The `QRScannerScreen.tsx` provides an interactive camera viewfinder:
- Uses `expo-camera` (or HTML5 `MediaDevices.getUserMedia` in browser mode).
- Renders an animated green laser beam oscillating vertically over the target bounding box.
- Once the dynamic QR code is detected, extracts `session_id` and immediately notifies the backend via `POST /api/session/{id}/scan`.

### 5.2 Local Hardware Biometric Verification

The `BiometricScreen.tsx` interfaces with device security enclaves:
- Calls `LocalAuthentication.authenticateAsync()` to prompt device biometric sensors (Fingerprint, TouchID, or FaceID).
- In simulated web environments, provides an interactive biometric fingerprint scanner with haptic feedback.
- Upon success, posts `local_auth_passed = true` to `/api/session/{id}/biometric-auth`.

### 5.3 Live Selfie Capture & Base64 Pipeline

The `SelfieScreen.tsx` guides the user through cloud identity verification:
- Displays an illuminated oval face guide instructing the user to center their face.
- Captures an uncompressed frame from the front-facing camera.
- Encodes the frame as a Base64 JPEG data URI.
- Transmits the payload to `/api/verify-selfie`, which routes through the Gemini 3-Key Rotator.

---

## 6. End-to-End Automated Test Pipeline

The automated test script (`test_e2e.py`) validates the complete system using `httpx` and `websockets`:

```
 Stage 1: Health & Database Connectivity Check
    └── Validates /health and verifies seed user records in MongoDB Atlas.

 Stage 2: Gemini 3-Key Rotator Verification
    └── Asserts that all 3 key slots are registered and healthy.

 Stage 3: Kiosk Dynamic Session Generation
    └── Requests new session token and inspects 180s expiration timestamp.

 Stage 4: Real-Time WebSocket Connection
    └── Connects asynchronous WebSocket client to /ws/kiosk/{session_id}.

 Stage 5: Mobile Device QR Code Binding
    └── Dispatches /api/session/{id}/scan and awaits WS event: QR_SCANNED.

 Stage 6: Local Fingerprint Biometric Auth
    └── Dispatches /api/session/{id}/biometric-auth and awaits WS event: BIOMETRICS_VERIFIED.

 Stage 7: Multimodal Gemini Vision Face Match
    └── Fetches baseline photo, transmits live selfie, verifies >=0.85 match, awaits WS event: AUTHORIZED.

 Stage 8: Atomic Cash Withdrawal & Hardware Dispense
    └── Executes ₹1,500 withdrawal, validates balance decrement, awaits WS event: DISPENSING_CASH.

 Stage 9: Temporary Delegation Limit Verification
    └── Creates emergency delegation and validates quota constraints.
```

---

## 7. Configuration & Environment Reference

All backend configurations are managed via environment variables in `backend/.env`:

| Variable | Type | Default / Example | Purpose |
|:---------|:-----|:------------------|:--------|
| `MONGODB_URL` | String | `mongodb+srv://user:pass@cluster.mongodb.net/` | MongoDB Atlas cluster connection URI |
| `DATABASE_NAME` | String | `atm_kiosk` | Name of MongoDB database |
| `GEMINI_API_KEY_1` | String | `AIzaSy...` | Primary Google Gemini Vision API key |
| `GEMINI_API_KEY_2` | String | `AIzaSy...` | Secondary failover key slot |
| `GEMINI_API_KEY_3` | String | `AIzaSy...` | Tertiary backup key slot |
| `SECRET_KEY` | String | `super-secret-jwt-key` | HMAC SHA256 secret for signing auth tokens |
| `ALGORITHM` | String | `HS256` | JWT signing algorithm |
| `ATM_SESSION_EXPIRY_SECONDS` | Integer | `180` | TTL in seconds for dynamic ATM QR codes |
| `GEMINI_FAILOVER_COOLDOWN_SECONDS` | Integer | `60` | Duration to quarantine key slot after HTTP 429 |
