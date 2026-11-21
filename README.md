# 🏧 Cardless ATM Anti-Fraud Kiosk System (Sentinel Architecture)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB%20Atlas-Cloud%20v8.0-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Google Gemini Vision](https://img.shields.io/badge/Google%20Gemini-Vision%20AI%203--Key%20Rotator-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Capacitor Android](https://img.shields.io/badge/Capacitor-Android%20Native%20APK-3880FF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![WebSockets](https://img.shields.io/badge/WebSockets-Real--Time-black)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A bank-grade, **cardless, anti-skimming ATM kiosk ecosystem** engineered to eliminate physical card readers, magnetic stripe theft, and PIN pad shoulder-surfing. By pairing **dynamic, rotating encrypted QR codes** with a **two-factor mobile biometric authentication pipeline (Local Hardware Fingerprint Enclave + Google Gemini Multimodal Vision AI Face Matching)**, the Sentinel Architecture delivers bank-grade security, instantaneous authorization, and seamless cash dispensing.

Redesigned in an authentic **Quiet Luxury / Swiss Private Banking** light aesthetic across all frontends, complete with real-time risk scoring, emergency kill switches, shoulder-surfing privacy shields, silent duress extraction, express 10-second withdrawals, and a native ready-to-install Android APK.

---

## 📑 Table of Contents

- [Overview & Problem Statement](#-overview--problem-statement)
- [Swiss Private Wealth Design System](#-swiss-private-wealth-design-system)
- [4 Advanced Security & UX Features](#-4-advanced-security--ux-features)
- [System Architecture](#-system-architecture)
- [Monorepo Project Structure](#-monorepo-project-structure)
- [Prerequisites & Dependencies](#-prerequisites--dependencies)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Backend Setup](#1-backend-setup-fastapi--mongodb-atlas)
  - [2. ATM Concierge Terminal](#2-atm-concierge-terminal-react--vite)
  - [3. Security & Admin Dashboard](#3-user--admin-security-dashboard)
  - [4. Mobile Banking App](#4-mobile-banking-app-capacitor-android)
  - [5. Building the Native Android APK](#5-building-the-native-android-apk)
- [Seed Demo Credentials](#-seed-demo-credentials)
- [REST API & WebSocket Specifications](#-rest-api--websocket-specifications)
- [Google Gemini 3-Key Rotator Engine](#-google-gemini-3-key-rotator-engine)
- [Verified Balance Deduction Pipeline](#-verified-balance-deduction-pipeline)
- [Security Threat Model & Countermeasures](#-security-threat-model--countermeasures)
- [Extended Technical Documentation](#-extended-technical-documentation)
- [License](#-license)

---

## 💡 Overview & Problem Statement

### The Problem
Traditional automated teller machines (ATMs) remain vulnerable to physical attack vectors:
1. **Magnetic Stripe & Chip Card Skimming**: Malicious hardware placed over card slots copies magnetic data and interception devices steal chip credentials.
2. **Hidden Pinhole Cameras & Keypad Overlays**: Criminals record PIN entries from over-the-shoulder angles or fake silicone overlays.
3. **Card Trapping & Physical Tampering**: Mechanical traps capture physical bank cards inside the reader mechanism.
4. **Credential Theft & Relay Attacks**: Stolen cards combined with guessed or recorded PINs enable immediate unauthorized cash drain.

### The Solution: Sentinel Architecture
The **Cardless ATM Anti-Fraud Kiosk** completely discards physical card slots:
- **Zero Physical Card Readers**: The physical ATM acts as an ephemeral terminal generating high-entropy, rotating cryptographic session QR codes.
- **Out-of-Band Mobile Authentication**: Scanning the QR code binds the physical terminal session directly to the customer's authenticated smartphone.
- **Dual Biometric Gate**:
  - **Tier 1 (Device-Side Possession & Liveness)**: Native device fingerprint / Android BiometricPrompt via Capacitor `BiometricPlugin.java`.
  - **Tier 2 (Cloud Multimodal Identity Verification)**: High-resolution live selfie matched against the user's encrypted baseline profile using **Google Gemini Multimodal Vision AI** with anti-spoofing and perimeter liveness checks.
- **Fail-Safe Cloud Resiliency**: A 3-key dynamic rotator intelligently cycles Google Gemini API keys with 60s quarantine cooldowns to guarantee continuous service under heavy load or rate limits.
- **Delegated Emergency Withdrawals**: Trusted family members can be granted temporary, cryptographically bound withdrawal quotas with strict expiration windows and spend caps.

---

## 🏛️ Swiss Private Wealth Design System

All three frontends (`dashboard/`, `atm-kiosk/`, and `mobile-app/`) adhere to an authentic **Swiss Private Banking / Quiet Luxury** light design system inspired by Lombard Odier, Coutts, and American Express Centurion:

- **Warm Alabaster Canvas (`#F5F2EB`)**: Stationery-like warm limestone background with an ultra-subtle 2% paper grain overlay.
- **Soft Warm Ivory Surfaces (`#FCFBF8`)**: Elevated cards with architectural hairline borders (`1px solid #E6E0D4`) and warm soft shadows (`0 12px 32px -12px rgba(24, 34, 28, 0.08)`).
- **Signature Hero Cards & Primary CTAs (`#102A22` to `#193D32`)**: Deep Heritage Forest Green satin gradient with warm ivory typography (`#FAF8F3`).
- **Brushed Champagne Gold Accents (`#B5935A`)**: Delicate corner brackets, active indicators, luxury chips (`#F4EFE4`, `#E2D4BC`), and metallic borders.
- **Editorial Typography**: `Cormorant Garamond` & `Playfair Display` serif headings paired with `Plus Jakarta Sans` body and `JetBrains Mono` tabular-nums.
- **Strict Anti-AI Rules**: Zero developer/tech jargon in client-facing UI (e.g., *"MongoDB Atlas"*, *"Gemini AI Vision"* replaced with *"SENTINEL PRIVATE BANK"*, *"Biometric Identity Enrolled & Verified"*). Zero duplicate CTAs.

---

## 🛡️ 4 Advanced Security & UX Features

### 1. ⚡ Express Pre-Staged "10-Second" Cash Dispense
- Customers can select and pre-stage their desired withdrawal amount on their mobile device before approaching the ATM.
- Upon scanning the terminal's QR code and verifying biometrics, the pre-staged amount is transferred automatically.
- If no shoulder-surfing or disguise threats are detected, the terminal **skips all on-screen amount prompts and begins dispensing cash immediately**—completing the entire transaction in under 10 seconds.

### 2. 🎛️ Real-Time Dynamic Risk Engine (0-100) & Admin Emergency Kill Switch
- The backend risk engine (`backend/app/risk_engine.py`) continuously computes a dynamic **Risk Score (0–100)** factoring:
  - Silent duress triggers (forces score to 100)
  - Consecutive failed authentication attempts (+25 per failure)
  - Unusual nocturnal withdrawal hours (12:00 AM – 5:00 AM) (+20)
  - High-velocity consecutive sessions within 5 minutes (+25)
  - Multimodal background threat or disguise detection (+30)
- The Admin Security Operations Center (SOC) features an animated **Circular SVG Risk Gauge** displaying real-time threat levels (Low: 0–39, Medium: 40–69, High/Critical: 70–100).
- **Central Kill Switch**: Admins can instantly terminate any suspicious session remotely via `POST /api/session/{id}/kill` or WebSocket `KILL_SESSION`, immediately locking the ATM terminal into a secure lockout state.

### 3. 👁️ Gemini Multimodal Shoulder-Surfing & Threat Detection (Privacy Shield)
- During facial verification, Google Gemini Vision analyzes the camera background perimeter for unauthorized observers standing behind the customer, disguised individuals wearing masks/sunglasses, or physical duress.
- If a threat is detected:
  - Express instant auto-dispense is paused.
  - The ATM terminal automatically engages **Privacy Shield Mode**: balances and numerical inputs are obscured behind a blur filter with a Burnished Ochre warning banner (`#FDF6E7`, `#9A6700`).
  - The customer must explicitly confirm safety before figures are revealed.

### 4. 🚨 Silent Duress Decoy Mode with Hidden SOC Emergency Alerting
- If a customer is coerced at an ATM, they can trigger Silent Duress by:
  - Entering their confidential **Duress PIN** (default: `4321`) instead of their standard passcode (`1111`) on the fallback keypad.
  - Discreetly **long-pressing (2 seconds) on the security shield icon** on the mobile verification screen.
- **Zero Panic Indication**: The mobile app and ATM kiosk show normal success screens and dispense a decoy/capped cash amount to prevent provoking the assailant.
- **Immediate Hidden SOC Alert**: An emergency duress notification (`type: "DURESS_TRIGGERED"`) is dispatched over `/ws/admin`, triggering an audible emergency siren and flashing crimson banner in the Security Operations Center.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SENTINEL SWISS PRIVATE BANKING ECOSYSTEM                        │
└────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────┐                            ┌────────────────────────┐
    │  Concierge ATM Kiosk    │                            │   Mobile Banking App   │
    │  (React 18 + Vite UI)   │                            │ (Capacitor Android APK)│
    └───────────┬─────────────┘                            └───────────┬────────────┘
                │ 1. Dynamic Session QR                                │ 2. Scan QR / Pre-Stage
                │    (180s TTL)                                        │    Express Dispense
                ▼                                                      ▼
    ┌───────────────────────────────────────────────────────────────────────────────┐
    │                        FastAPI Asynchronous Gateway                           │
    │                         (Port 8000 • Python 3.10+)                            │
    └───────┬───────────────────────────────┬───────────────────────────────┬───────┘
            │                               │                               │
            │ Bi-directional WebSocket      │ Motor Async MongoDB Engine    │ Multimodal Vision
            │ (/ws/kiosk/{session_id})      │ (Atomic $inc Balance Updates) │ (/api/verify-selfie)
            ▼                               ▼                               ▼
    ┌───────────────┐             ┌────────────────────┐       ┌────────────────────────┐
    │ WebSocket Hub │             │   MongoDB Atlas    │       │ Google Gemini AI Engine│
    │ (Real-Time    │             │   Cloud Database   │       │ (3-Key Dynamic Rotator │
    │  Kiosk Sync)  │             │  (Atlas Cluster)   │       │  & Threat Heuristics)  │
    └───────┬───────┘             └─────────┬──────────┘       └────────────────────────┘
            │                               │
            │ Real-Time SOC Audit Channel   │ Dynamic Risk Engine
            ▼ (/ws/admin)                   ▼ (0-100 Risk Scoring & Kill Switch)
    ┌───────────────────────────────────────────────────────────────────────────────┐
    │                  Security Operations Center (SOC) & Portal                    │
    │        (Circular SVG Risk Gauge, Emergency Siren, Gemini Rotator Telemetry)    │
    └───────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Monorepo Project Structure

```
ATM Kisok/
├── Sentinel-ATM-Updated.apk      # Compiled ready-to-install Android APK (7.44 MB)
├── IMPLEMENTATION.md             # In-depth technical and architectural manual
├── WORKING.md                    # Operational workflow, sequences, and threat model
├── package.json                  # Root monorepo dev orchestrator scripts
├── test_rotator_e2e.py           # E2E integration test suite for rotator & balance pipeline
│
├── backend/                      # FastAPI REST & WebSocket Backend
│   ├── app/
│   │   ├── routes/
│   │   │   ├── atm_session.py    # Session generation, kill switch, QR binding
│   │   │   ├── auth.py           # User authentication, balance refresh, profile
│   │   │   ├── delegations.py   # Temporary delegated cash withdrawal manager
│   │   │   ├── transactions.py   # Atomic balance decrement & dispense pipeline
│   │   │   └── verification.py   # Gemini Vision face & threat detection
│   │   ├── gemini_rotator.py     # 3-key dynamic rotator with quota failover
│   │   ├── risk_engine.py        # Real-time dynamic 0-100 risk scoring engine
│   │   ├── database.py           # Motor async MongoDB Atlas connection
│   │   ├── models.py             # Pydantic schema models
│   │   ├── schemas.py            # API request/response schemas
│   │   ├── seed_data.py          # MongoDB database seeder
│   │   └── websocket_manager.py  # WebSocket connection manager
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Environment variables template
│
├── atm-kiosk/                    # Concierge ATM Kiosk Terminal (React 18 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AmountSelectionScreen.tsx  # Denominations & Privacy Shield Mode
│   │   │   ├── AuthProcessingScreen.tsx   # Concentric calm breathing aura verification
│   │   │   ├── CashDispenser.tsx          # Animated banknote ejection & rolling counter
│   │   │   ├── Header.tsx                 # Swiss private bank brand & live enclave
│   │   │   ├── Keypad.tsx                 # Tactile warm keys with audio feedback
│   │   │   ├── SessionQRCode.tsx          # Gold-corner framed QR code container
│   │   │   └── TransactionSuccessScreen.tsx# Voucher debit advice & print receipt
│   │   ├── utils/sound.ts                 # Web Audio API sound synthesis
│   │   ├── App.tsx                        # Kiosk state machine & WebSocket handler
│   │   └── index.css                      # Swiss Private Wealth styling
│   └── package.json
│
├── dashboard/                    # Security Operations Center & User Portal
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx         # Circular SVG Risk Gauge & Kill Switch
│   │   │   ├── UserDashboard.tsx          # Heritage Forest Green balance card & mandates
│   │   │   ├── DelegationModal.tsx        # Cardless mandate generator
│   │   │   └── ProfileSelfieModal.tsx     # Webcam capture / baseline enrollment
│   │   └── App.tsx
│   └── package.json
│
└── mobile-app/                   # Capacitor Android Mobile Banking App
    ├── android/                  # Native Android Studio project (Gradle + Java 21)
    │   └── app/src/main/java/com/sentinel/atm/
    │       ├── MainActivity.java          # Native bridge initialization
    │       └── BiometricPlugin.java       # Native Android BiometricPrompt bridge
    ├── src/
    │   ├── screens/
    │   │   ├── HomeScreen.tsx             # Heritage card, Express 10s selector, QR scan CTA
    │   │   ├── QRScannerScreen.tsx        # Viewfinder with gold corner brackets
    │   │   ├── BiometricScreen.tsx        # Breathing sensor aura, keypad, silent duress
    │   │   ├── SelfieScreen.tsx           # Gold HUD reticle & Gemini verification
    │   │   ├── SuccessScreen.tsx          # Swiss voucher debit advice
    │   │   ├── LoginScreen.tsx            # Quiet luxury login & IP settings modal
    │   │   └── RegisterScreen.tsx         # Account onboarding & selfie enrollment
    │   └── services/api.ts                # API client with auto-refresh hooks
    └── package.json
```

---

## 💻 Prerequisites & Dependencies

- **Python**: `3.10` or higher
- **Node.js**: `v18.0.0` or higher
- **npm**: `9.0.0` or higher
- **Java Development Kit**: JDK 21 (for native Android builds)
- **Android SDK**: Build tools & command-line tools
- **MongoDB Atlas**: Active MongoDB Atlas cluster (or local MongoDB 6+)
- **Google Gemini API Key(s)**: At least one API key from [Google AI Studio](https://aistudio.google.com/)

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI + MongoDB Atlas)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate       # Windows PowerShell
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB Atlas URL and Gemini API keys

# Start FastAPI server on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. ATM Concierge Terminal (React + Vite)

```bash
cd atm-kiosk
npm install
npm run dev
```

- **ATM Kiosk Terminal**: [http://localhost:3000](http://localhost:3000)
- Features rotating dynamic session QR code, simulated mobile pairing, tactile Web Audio keypad, and motorized banknote ejection.

---

### 3. User & Admin Security Dashboard

```bash
cd dashboard
npm install
npm run dev
```

- **Portal & SOC Dashboard**: [http://localhost:3001](http://localhost:3001)
- **Admin Login (`admin` / `9999`)**: Circular SVG Risk Gauge, Remote Emergency Kill Switch, Gemini Rotator Telemetry, and Silent Duress Alarm.
- **User Login (`alex` / `1234`)**: Heritage Forest Green balance card, live rolling counter, delegation mandates.

---

### 4. Mobile Banking App (Capacitor Android)

```bash
cd mobile-app
npm install

# Run Web Simulator for rapid testing:
npm run dev

# Or build production web bundle:
npm run build
```

- **Mobile Web Simulator**: [http://localhost:5173](http://localhost:5173)

---

### 5. Building the Native Android APK

The mobile application is packaged as a native Android project using Capacitor:

```powershell
# 1. Build and copy web assets to Android
cd mobile-app
npm run build
npx cap copy android

# 2. Compile debug APK with Gradle
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.8.9-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
cd android
.\gradlew.bat assembleDebug

# 3. Output APK
# Generates: mobile-app\android\app\build\outputs\apk\debug\app-debug.apk
# Copied to root as: Sentinel-ATM-Updated.apk
```

**Install to Connected Device or Emulator:**
```powershell
adb install -r "S:\Projects\ATM Kisok\Sentinel-ATM-Updated.apk"
```

---

## 👥 Seed Demo Credentials

| Role | Username | Standard PIN | Duress PIN | Default Balance | Notes |
|:-----|:---------|:-------------|:-----------|:----------------|:------|
| **Security Admin** | `admin` | `9999` | — | ₹99,999.00 | Security Operations Center, Kill Switch, Risk Engine |
| **Private Client** | `alex` | `1234` | `4321` | ₹25,000.00 | Enrolled facial baseline, cardless enabled |
| **Client Beneficiary** | `sarah` | `4321` | — | ₹1,200.00 | Pre-configured mandate beneficiary |

---

## 🔌 REST API & WebSocket Specifications

### Core Endpoints

| Method | Endpoint | Description | Auth Required |
|:-------|:---------|:------------|:--------------|
| `GET` | `/health` | API and database health status | No |
| `POST` | `/api/auth/login` | Authenticate with username and PIN | No |
| `POST` | `/api/auth/register` | Register new customer account | No |
| `GET` | `/api/auth/me` | Fetch fresh user profile & live account balance | Yes |
| `POST` | `/api/session/create` | Generate dynamic ATM kiosk session & QR token | No |
| `POST` | `/api/session/{id}/scan` | Bind mobile app device to kiosk session | Yes |
| `POST` | `/api/session/{id}/biometric-auth` | Submit local fingerprint authentication confirmation | Yes |
| `POST` | `/api/verify-selfie` | Gemini Vision facial match & background threat analysis | Yes |
| `POST` | `/api/transactions/withdraw` | Execute atomic cash withdrawal & update balance | Yes |
| `POST` | `/api/session/{id}/kill` | **Admin Emergency Kill Switch**: abort session & lockout | Admin |
| `GET` | `/api/gemini/status` | Real-time status of 3 Gemini API key slots | Admin |

### WebSocket Channels

| Protocol | Route | Description |
|:---------|:------|:------------|
| `ws://` | `/ws/kiosk/{session_id}` | Dedicated channel between kiosk and backend. Events: `QR_SCANNED`, `BIOMETRICS_VERIFIED`, `AUTHORIZED`, `DISPENSING_CASH`, `SESSION_TERMINATED`, `COMPLETED`. |
| `ws://` | `/ws/admin` | Real-time SOC telemetry feed. Events: `TRANSACTION_LOG`, `ROTATOR_TELEMETRY`, `DURESS_TRIGGERED`, `THREAT_DETECTED`, `BALANCE_UPDATED`. |

---

## 🧠 Google Gemini 3-Key Rotator Engine

```
[Request: /api/verify-selfie]
            │
            ▼
┌─────────────────────────┐
│ Gemini Rotator Manager  │
└───────────┬─────────────┘
            │
    ┌───────┴───────────────┬──────────────────────┐
    ▼                       ▼                      ▼
┌───────────────┐   ┌───────────────┐     ┌───────────────┐
│  Slot: KEY_1  │   │  Slot: KEY_2  │     │  Slot: KEY_3  │
│ Status: READY │   │ Status: 429   │     │ Status: READY │
│               │   │ Cooldown: 42s │     │               │
└───────┬───────┘   └───────────────┘     └───────────────┘
        │
        ▼ (Selected Key)
┌─────────────────────────────────┐
│ Google Gemini Vision 1.5 Flash  │
│ Multimodal Facial Verification  │
│ & Shoulder-Surfing Detection    │
└─────────────────────────────────┘
```

1. **Round-Robin Key Cycling**: Requests are distributed across healthy keys.
2. **Dynamic 429 Quota Quarantine**: Upon encountering HTTP 429 (Rate Limit), the key is quarantined for 60 seconds with an active countdown.
3. **Seamless Instant Failover**: Requests automatically shift to healthy slots without disrupting ongoing transactions.
4. **Offline Deterministic Fallback**: Built-in comparator guarantees demo continuity in offline sandbox environments.

---

## 💰 Verified Balance Deduction Pipeline

The withdrawal pipeline enforces ACID consistency and real-time balance updates across MongoDB and all three frontends:
1. **Atomic Decrement**: All 3 withdrawal paths (Standard, Express 10s, and Silent Duress Decoy) execute atomic updates:
   ```python
   await db["users"].update_one(
       {"id": user_id},
       {"$inc": {"account_balance": -actual_dispensed_amount, "balance": -actual_dispensed_amount}}
   )
   ```
2. **Immediate Return & Broadcast**: Returns `remaining_balance` and `new_balance` in the HTTP response and broadcasts `BALANCE_UPDATED` via WebSockets.
3. **Live Sync**:
   - ATM Kiosk updates remaining balance directly from the dispense payload.
   - Mobile App refreshes balance upon returning to `HomeScreen` and after `SuccessScreen`.
   - Dashboard automatically updates the user's balance and transaction ledger over WebSocket without page refresh.

---

## 🛡️ Security Threat Model & Countermeasures

| Attack Vector | Traditional ATM Vulnerability | Sentinel Kiosk Defense Mechanism |
|:--------------|:------------------------------|:---------------------------------|
| **Card Skimming** | Magnetic stripe read by illicit overlay | **Zero card reader present.** Out-of-band dynamic QR pairing. |
| **PIN Shoulder-Surfing** | Overhead camera records PIN pad | **Zero PIN entered at ATM.** Biometrics occur on private smartphone. |
| **Perimeter Observers** | Attacker stands behind user to peek | **Gemini AI Shoulder-Surfing Detection** triggers **Privacy Shield Mode**. |
| **Physical Duress / Coercion**| Forced cash withdrawal | **Silent Duress Mode**: dispenses decoy cash, alerts Admin SOC with audio siren. |
| **QR Code Replay** | Attacker photographs ATM QR code | **Single-use UUIDv4 tokens with 180s TTL.** Token invalidated upon pairing. |
| **Facial Photo Spoofing** | Holding photo/tablet to camera | **Gemini Multimodal Liveness Inspection** verifies skin reflectance, depth, and micro-movements. |
| **ATM Rogue Manipulation** | Physical terminal compromise | **Admin Emergency Kill Switch**: terminates active sessions remotely in real time. |

---

## 📚 Extended Technical Documentation

- 📖 [IMPLEMENTATION.md](IMPLEMENTATION.md) — Exhaustive code-level implementation manual, data models, state machines, sound synthesis, and component architecture.
- ⚙️ [WORKING.md](WORKING.md) — Step-by-step user operational flows, Mermaid sequence charts, WebSocket packet definitions, and threat modeling.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

Developed with ❤️ by [Sujay](https://github.com/sujay-237).
