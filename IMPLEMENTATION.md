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
  - [2.6 Atomic Transactions & Multi-Path Balance Synchronization](#26-atomic-transactions--multi-path-balance-synchronization)
  - [2.7 Real-Time Dynamic Risk Engine (0-100)](#27-real-time-dynamic-risk-engine-0-100)
  - [2.8 Gemini Shoulder-Surfing & Disguise Detection](#28-gemini-shoulder-surfing--disguise-detection)
  - [2.9 Silent Duress Mode & Hidden SOC Emergency Alerting](#29-silent-duress-mode--hidden-soc-emergency-alerting)
  - [2.10 Admin Emergency Kill Switch](#210-admin-emergency-kill-switch)
- [3. ATM Concierge Terminal Implementation](#3-atm-concierge-terminal-implementation)
  - [3.1 Swiss Private Wealth UI & Component Hierarchy](#31-swiss-private-wealth-ui--component-hierarchy)
  - [3.2 Dynamic QR Generation & Delicate Framing](#32-dynamic-qr-generation--delicate-framing)
  - [3.3 Privacy Shield Mode Obscuration Engine](#33-privacy-shield-mode-obscuration-engine)
  - [3.4 Motorized Banknote Dispenser & Rolling Counter](#34-motorized-banknote-dispenser--rolling-counter)
- [4. Security Operations Center & User Dashboard](#4-security-operations-center--user-dashboard)
  - [4.1 Circular SVG Risk Gauge & Live Threat Telemetry](#41-circular-svg-risk-gauge--live-threat-telemetry)
  - [4.2 Emergency Duress Crimson Banner & Audio Siren](#42-emergency-duress-crimson-banner--audio-siren)
  - [4.3 Visual Gemini Key Rotator Control Panel](#43-visual-gemini-key-rotator-control-panel)
  - [4.4 Family Delegation Authorization Module](#44-family-delegation-authorization-module)
- [5. Mobile Banking Application (Capacitor Android)](#5-mobile-banking-application-capacitor-android)
  - [5.1 Native Android BiometricPrompt Bridge (`BiometricPlugin.java`)](#51-native-android-biometricprompt-bridge-biometricpluginjava)
  - [5.2 Express Pre-Staged 10-Second Selector](#52-express-pre-staged-10-second-selector)
  - [5.3 Viewfinder with Gold Corner Brackets](#53-viewfinder-with-gold-corner-brackets)
  - [5.4 Live Facial Verification HUD Reticle](#54-live-facial-verification-hud-reticle)
  - [5.5 Android Debug APK Build Pipeline](#55-android-debug-apk-build-pipeline)
- [6. End-to-End Automated Test Pipeline](#6-end-to-end-automated-test-pipeline)
- [7. Configuration & Environment Reference](#7-configuration--environment-reference)

---

## 1. Architectural Overview

The Sentinel Architecture was developed as a modular, decoupled monorepo comprising four high-cohesion sub-systems communicating via RESTful JSON APIs and non-blocking WebSockets:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MONOREPO COMPONENT GRAPH                        │
└────────────────────────────────────────────────────────────────────────┘

  [atm-kiosk] (Port 3000)                [mobile-app] (Port 5173 / Android)
   React 18 + Vite + Tailwind             Capacitor Android Native APK
          │                                       │
          │ WebSocket (/ws/kiosk/{id})            │ HTTPS REST API
          │ REST Session Fetch                    │ Native Biometrics & Live Selfie
          ▼                                       ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │                      FastAPI Gateway (Port 8000)                     │
  │  - Uvicorn ASGI Server               - PyJWT Auth Subsystem          │
  │  - Motor Async MongoDB Driver        - WebSocket Broadcast Manager   │
  │  - Gemini 3-Key Dynamic Rotator      - Real-Time Risk Engine (0-100) │
  │  - Atomic Balance Decrement Engine   - Shoulder-Surfing Heuristics   │
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

The backend is built on **FastAPI (v0.115+)** running on the **Uvicorn ASGI** worker. All database operations utilize **Motor**, the official asynchronous Python driver for MongoDB, preventing blocking operations during heavy I/O loops.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_database()
    logger.info("Sentinel ATM Backend initialized successfully.")
    yield
    await close_db()
    logger.info("Sentinel ATM Backend database connections closed.")
```

### 2.2 Data Models & Database Indexing

The schema is defined using Pydantic v2 in `backend/app/models.py` and mapped to primary collections in `backend/app/database.py`:

```
MongoDB Atlas: `atm_kiosk`
├── users
│   ├── id: UUID (Primary Key, Unique Index)
│   ├── username: String (Unique Index)
│   ├── phone: String (Unique Index)
│   ├── email: String (Unique Index)
│   ├── hashed_pin: String (Hashed)
│   ├── duress_pin: String (Default: "4321")
│   ├── account_balance: Float
│   ├── reference_selfie: Base64 String
│   └── is_cardless_enabled: Boolean
│
├── auth_sessions
│   ├── id: UUID (Unique Index)
│   ├── kiosk_id: String (Indexed)
│   ├── status: String (Enum: CREATED, SCANNED, BIOMETRICS_VERIFIED, AUTHORIZED, COMPLETED, EXPIRED, TERMINATED)
│   ├── prestaged_amount: Optional[Float]
│   ├── shoulder_surfing_detected: Boolean
│   ├── disguise_detected: Boolean
│   ├── threat_reason: Optional[String]
│   ├── is_duress: Boolean
│   ├── created_at: DateTime
│   └── expires_at: DateTime (Indexed for TTL cleanup)
│
├── transactions
│   ├── id: UUID (Unique Index)
│   ├── user_id: UUID (Indexed)
│   ├── session_id: UUID (Indexed)
│   ├── kiosk_id: String
│   ├── amount: Float
│   ├── remaining_balance: Float
│   ├── is_duress: Boolean
│   ├── prestaged: Boolean
│   ├── anomaly_flag: Boolean
│   └── created_at: DateTime
```

### 2.3 Session State Machine

```
  ┌───────────┐
  │  CREATED  │ ── (Kiosk generates dynamic QR, 180s TTL)
  └─────┬─────┘
        │ POST /api/session/{id}/scan (Mobile scans QR, binds prestaged amount)
        ▼
  ┌───────────┐
  │  SCANNED  │ ── (Mobile device bound, user recognized)
  └─────┬─────┘
        │ POST /api/session/{id}/biometric-auth (Fingerprint / Local Auth verified)
        ▼
┌─────────────────────┐
│ BIOMETRICS_VERIFIED │ ── (Device local authentication passed)
└─────────┬───────────┘
          │ POST /api/verify-selfie (Gemini Vision Face Match >= 0.85)
          ▼
   ┌────────────┐
   │ AUTHORIZED │ ── (Terminal checks threat flags & prestaged amount)
   └──────┬─────┘
          ├── If prestaged_amount > 0 AND NOT threat:
          │     └── Instant Auto-Dispense (Under 10s) ──▶ [COMPLETED]
          │
          └── If manual selection OR threat detected:
                └── Unlocks Keypad (Privacy Shield engaged if threat) ──▶ [COMPLETED]

   * If Kill Switch triggered by Admin: ──▶ [TERMINATED] (5s Lockout)
   * If elapsed_time > 180s: ──▶ [EXPIRED]
```

### 2.4 WebSocket Connection Manager & Broadcast Hub

Managed in `backend/app/websocket_manager.py`:
- `kiosk_rooms`: Maps `session_id` &rarr; List of active WebSocket connections for that terminal.
- `admin_connections`: List of active connections streaming the Security Operations Center feed.
- Broadcast methods:
  - `broadcast_to_session(session_id, data)`: Synchronizes the physical ATM screen in real time.
  - `broadcast_admin_event(data)`: Dispatches transaction logs, risk updates, duress alarms, and key failovers to SOC.

### 2.5 Google Gemini 3-Key Dynamic Rotator

Implemented in `backend/app/gemini_rotator.py`:
- **Three Key Slots**: `KEY_1`, `KEY_2`, `KEY_3` in a round-robin rotation.
- **Quota Quarantine (HTTP 429)**: When rate limits occur, the slot is quarantined for 60 seconds. Pending inference requests automatically shift to the next healthy slot without dropping the user's transaction.
- **Deterministic Offline Fallback**: Guarantees test and demo continuity even without active external network connections.

### 2.6 Atomic Transactions & Multi-Path Balance Synchronization

To prevent balance discrepancies across standard, express, and duress withdrawals, `backend/app/routes/transactions.py` executes an atomic decrement in MongoDB:

```python
# Atomic Balance Decrement
result = await db["users"].update_one(
    {"id": user_id, "account_balance": {"$gte": amount}},
    {"$inc": {"account_balance": -amount, "balance": -amount}}
)
if result.modified_count == 0:
    raise HTTPException(status_code=400, detail="Insufficient account balance")

# Broadcast to all clients
await manager.broadcast_admin_event({
    "type": "BALANCE_UPDATED",
    "user_id": user_id,
    "new_balance": updated_balance
})
```

### 2.7 Real-Time Dynamic Risk Engine (0-100)

Located in `backend/app/risk_engine.py`:
- Computes risk based on 5 weighted threat indicators:
  1. `is_duress`: Immediately sets `risk_score = 100` (`Silent Duress Panic Protocol Activated`).
  2. `failed_attempts`: Adds +25 points per failed attempt (capped at 50).
  3. `is_unusual_hours`: Adds +20 points for nocturnal transactions between 12:00 AM and 5:00 AM.
  4. `rapid_sessions_count`: Adds +25 points for >=2 sessions within 5 minutes.
  5. `threat_or_disguise_detected`: Adds +30 points for shoulder-surfing or disguise detection.

### 2.8 Gemini Shoulder-Surfing & Disguise Detection

In `backend/app/routes/verification.py`, the Gemini prompt instructs the vision model to inspect:
- Whether another person is standing in the background looking over the user's shoulder (`shoulder_surfing_detected: true`).
- Whether the subject is wearing sunglasses, a mask, or artificial obstruction (`disguise_detected: true`).
- Returns threat rationale in JSON.

### 2.9 Silent Duress Mode & Hidden SOC Emergency Alerting

- Initiated when the customer enters their duress PIN (`4321`) or long-presses (2s) the mobile shield icon.
- Kiosk & mobile show **normal, calm interfaces** and dispense a decoy amount (default: ₹500 or requested).
- Sends `type: "DURESS_TRIGGERED"` to `/ws/admin`, sounding an audible siren and flashing a crimson emergency alert in the SOC.

### 2.10 Admin Emergency Kill Switch

- Endpoint: `POST /api/session/{id}/kill`
- Broadcasts `SESSION_TERMINATED` to the ATM kiosk.
- Instantly halts cash dispensing, displays an emergency lockout banner on the kiosk, and automatically resets the terminal after 5 seconds.

---

## 3. ATM Concierge Terminal Implementation

### 3.1 Swiss Private Wealth UI & Component Hierarchy
- Built with React 18, Vite, Tailwind CSS, and `framer-motion`.
- Uses architectural Alabaster (`#F5F2EB`), Soft Warm Ivory cards (`#FCFBF8`), hairline borders (`#E6E0D4`), and Heritage Forest Green (`#102A22`).
- All tech jargon removed: client-facing copy references *"SENTINEL PRIVATE BANK • CONCIERGE TERMINAL"*.

### 3.2 Dynamic QR Generation & Delicate Framing
- `SessionQRCode.tsx` renders a high-contrast QR code canvas framed with brushed champagne gold corner brackets.
- Displays a linear countdown progress bar in deep forest green and gold indicating session TTL.

### 3.3 Privacy Shield Mode Obscuration Engine
- When `shoulder_surfing_detected` or `disguise_detected` is true:
  - Balances and amount options are blurred with `blur-md select-none`.
  - Displays a Burnished Ochre threat banner (`#FDF6E7`, `#9A6700`).
  - Requires user to click *"Verify Perimeter & Reveal"* before un-blurring figures.

### 3.4 Motorized Banknote Dispenser & Rolling Counter
- `CashDispenser.tsx` simulates physical bill emergence with realistic spring animations:
  - Notes slide downward into the tray with subtle rotational variations (`rotate: -1.5deg`, `rotate: 1deg`).
  - An animated rolling counter in `Cormorant Garamond` serif tabulates the dispensed currency in real time.

---

## 4. Security Operations Center & User Dashboard

### 4.1 Circular SVG Risk Gauge & Live Threat Telemetry
- `AdminDashboard.tsx` renders a dynamic SVG circular gauge representing the 0–100 risk score computed by the backend risk engine.
- Color transitions automatically:
  - `0–39`: Emerald (`#155E43`) — Low Risk
  - `40–69`: Ochre (`#9A6700`) — Medium Risk
  - `70–100`: Bordeaux Crimson (`#9F1239`) — Critical Risk

### 4.2 Emergency Duress Crimson Banner & Audio Siren
- When a `DURESS_TRIGGERED` event arrives, the SOC plays an audible alarm tone via the Web Audio API and highlights the terminal in flashing crimson.
- Provides an **Emergency Terminate** button to immediately trigger the kill switch.

### 4.3 Visual Gemini Key Rotator Control Panel
- Visual telemetry display for `KEY_1`, `KEY_2`, and `KEY_3` showing real-time cooldown timers and failure counters.
- Supports runtime API key overrides without server restarts.

### 4.4 Family Delegation Authorization Module
- Allows account holders to issue time-bound cardless withdrawal limits for family members.

---

## 5. Mobile Banking Application (Capacitor Android)

### 5.1 Native Android BiometricPrompt Bridge (`BiometricPlugin.java`)
- Native Java plugin registered in Capacitor `MainActivity.java`.
- Calls `androidx.biometric.BiometricPrompt` on hardware devices.
- Seamlessly falls back to an in-app tactile 4-digit passcode keypad (`1111`) on devices without fingerprint hardware.

### 5.2 Express Pre-Staged 10-Second Selector
- On `HomeScreen.tsx`, users can select quick chips (₹500, ₹1000, ₹2000, ₹5000) or specify a custom amount.
- Pre-stages the amount to skip manual entry at the ATM.

### 5.3 Viewfinder with Gold Corner Brackets
- `QRScannerScreen.tsx` uses `jsQR` with animated scanning sweep and delicate champagne gold corner brackets.

### 5.4 Live Facial Verification HUD Reticle
- `SelfieScreen.tsx` provides a circular reticle with concentric HUD lines in champagne gold and an animated rotational sweep during analysis.

### 5.5 Android Debug APK Build Pipeline
```powershell
cd mobile-app
npm run build
npx cap copy android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug
```
Output: [Sentinel-ATM-Updated.apk](file:///s:/Projects/ATM%20Kisok/Sentinel-ATM-Updated.apk) (`7.44 MB`).

---

## 6. End-to-End Automated Test Pipeline

The automated test script (`test_rotator_e2e.py`) validates:
1. Health & seed database connectivity.
2. Gemini 3-key rotator health and failover.
3. Dynamic ATM session generation.
4. WebSocket handshake.
5. Out-of-band mobile pairing and pre-staged amount binding.
6. Native biometric verification.
7. Multimodal live facial matching.
8. Atomic cash withdrawal & MongoDB balance update.
9. Silent duress panic execution.

---

## 7. Configuration & Environment Reference

All settings are configured via `backend/.env`:

| Variable | Type | Default | Purpose |
|:---------|:-----|:--------|:--------|
| `MONGODB_URL` | String | `mongodb+srv://...` | MongoDB Atlas cluster connection URI |
| `DATABASE_NAME` | String | `atm_kiosk` | Target database name |
| `GEMINI_API_KEY_1` | String | `AIzaSy...` | Primary Gemini Vision API key |
| `GEMINI_API_KEY_2` | String | `AIzaSy...` | Secondary failover key slot |
| `GEMINI_API_KEY_3` | String | `AIzaSy...` | Tertiary backup key slot |
| `SECRET_KEY` | String | `jwt-secret` | HMAC SHA-256 signing secret |
| `ATM_SESSION_EXPIRY_SECONDS` | Integer | `180` | Session QR TTL in seconds |
| `GEMINI_FAILOVER_COOLDOWN_SECONDS` | Integer | `60` | Key quarantine duration upon HTTP 429 |
