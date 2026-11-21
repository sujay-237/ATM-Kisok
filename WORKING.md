# 🔄 System Operational Mechanics & Workflow Manual (WORKING.md)

This document provides a complete operational guide to the **Cardless ATM Anti-Fraud Kiosk System (Sentinel Architecture)**. It describes end-to-end user journeys, system state transitions, real-time WebSocket protocol payloads, and threat mitigation mechanisms.

---

## 📑 Table of Contents

- [1. Operational Summary](#1-operational-summary)
- [2. End-to-End User Journeys](#2-end-to-end-user-journeys)
  - [Journey 1: Primary User Cardless Cash Withdrawal](#journey-1-primary-user-cardless-cash-withdrawal)
  - [Journey 2: Express Pre-Staged 10-Second Cash Dispense](#journey-2-express-pre-staged-10-second-cash-dispense)
  - [Journey 3: Gemini Shoulder-Surfing Detection & Privacy Shield Mode](#journey-3-gemini-shoulder-surfing-detection--privacy-shield-mode)
  - [Journey 4: Silent Duress Emergency Extraction & SOC Siren](#journey-4-silent-duress-emergency-extraction--soc-siren)
  - [Journey 5: Admin Emergency Kill Switch & Terminal Lockout](#journey-5-admin-emergency-kill-switch--terminal-lockout)
  - [Journey 6: Delegated Emergency Family Withdrawal](#journey-6-delegated-emergency-family-withdrawal)
  - [Journey 7: Gemini 3-Key Rotator Failover Recovery](#journey-7-gemini-3-key-rotator-failover-recovery)
- [3. System State Machine & Lifecycle](#3-system-state-machine--lifecycle)
- [4. WebSocket Protocol Specification](#4-websocket-protocol-specification)
  - [4.1 Kiosk Channel (`/ws/kiosk/{session_id}`)](#41-kiosk-channel-wskiosksession_id)
  - [4.2 Admin Channel (`/ws/admin`)](#42-admin-channel-wsadmin)
- [5. Threat Analysis & Security Mitigations](#5-threat-analysis--security-mitigations)
- [6. Troubleshooting & Diagnostics Playbook](#6-troubleshooting--diagnostics-playbook)

---

## 1. Operational Summary

The Sentinel Architecture replaces traditional card-reading ATMs with an **ephemeral out-of-band authentication model**:

```
[1. ATM Terminal]           [2. Mobile App]               [3. Cloud AI Engine]        [4. Cash Dispenser]
  Dynamic QR Code  ───▶  Biometric Fingerprint  ───▶  Gemini Vision Face Match  ───▶  Physical Cash Ejected
   (180s Timeout)          & Live Selfie Capture       (3-Key Dynamic Rotator)        (Atomic Decrement)
```

By decoupling session initiation (at the public terminal) from identity verification (on the customer's private personal device), the system achieves:
1. **Zero physical contact surface** for card skimmers or magnetic shims.
2. **Zero PIN exposure** to over-the-shoulder cameras or fake keypad overlays.
3. **Multi-factor certainty** uniting device ownership, biometric signature, and cloud facial verification.

---

## 2. End-to-End User Journeys

### Journey 1: Primary User Cardless Cash Withdrawal

```mermaid
sequenceDiagram
    autonumber
    actor User as Alex (Customer)
    participant Kiosk as ATM Terminal Display
    participant Backend as FastAPI Server
    participant Mobile as Mobile App (Alex)
    participant Gemini as Gemini Vision Rotator
    participant DB as MongoDB Atlas

    Note over Kiosk,Backend: Step 1: Session Initiation
    Kiosk->>Backend: POST /api/session/create {kiosk_id: "KIOSK-EAST-01"}
    Backend->>DB: Insert session {status: "CREATED", ttl: 180s}
    Backend-->>Kiosk: Return session_id & QR payload
    Kiosk->>Backend: WS Connect /ws/kiosk/{session_id}
    Kiosk->>User: Displays rotating QR code

    Note over User,Mobile: Step 2: Out-of-Band Pairing
    User->>Mobile: Opens app, taps "Scan Concierge Terminal QR"
    Mobile->>Backend: POST /api/session/{id}/scan {user_id: alex.id}
    Backend-->>Kiosk: WS Event: "QR_SCANNED"
    Kiosk->>User: Display changes: "Connected to Alex's Device"

    Note over User,Mobile: Step 3: Biometric Authentication
    Mobile->>User: Prompts Fingerprint / BiometricPrompt
    User->>Mobile: Scans finger (Success)
    Mobile->>Backend: POST /api/session/{id}/biometric-auth
    Backend-->>Kiosk: WS Event: "BIOMETRICS_VERIFIED"

    Note over User,Gemini: Step 4: Multimodal Face Verification
    Mobile->>User: Displays gold HUD reticle
    User->>Mobile: Takes live selfie
    Mobile->>Backend: POST /api/verify-selfie {live_selfie_base64}
    Backend->>DB: Fetch Alex's registered reference selfie
    Backend->>Gemini: Compare live selfie vs reference photo
    Gemini-->>Backend: Result {match: true, confidence: 0.96}
    Backend->>DB: Update session status to "AUTHORIZED"
    Backend-->>Mobile: Display "Authorization Approved!"
    Backend-->>Kiosk: WS Event: "AUTHORIZED"

    Note over User,Kiosk: Step 5: Cash Dispensing
    Kiosk->>User: Keypad unlocks with audio feedback
    User->>Kiosk: Selects "₹1,000"
    Kiosk->>Backend: POST /api/transactions/withdraw {amount: 1000}
    Backend->>DB: Atomic decrement balance (₹25,000 -> ₹24,000)
    Backend-->>Kiosk: WS Event: "DISPENSING_CASH" {amount: 1000, new_balance: 24000}
    Kiosk->>User: Motorized tray opens, bills eject downward, rolling counter tabulates
    Kiosk->>User: Displays Swiss debit advice receipt and returns to Home
```

---

### Journey 2: Express Pre-Staged 10-Second Cash Dispense

```mermaid
sequenceDiagram
    autonumber
    actor User as Alex (Customer)
    participant Mobile as Mobile App (Alex)
    participant Kiosk as ATM Terminal Display
    participant Backend as FastAPI Server
    participant DB as MongoDB Atlas

    Note over User,Mobile: 1. Pre-Stage Cash
    User->>Mobile: Taps "₹2,000" on Express Pre-Stage Selector
    User->>Mobile: Taps "Scan Concierge Terminal QR"

    Note over User,Kiosk: 2. Scan & Authenticate
    User->>Kiosk: Scans terminal QR code
    Mobile->>Backend: POST /api/session/{id}/scan {prestaged_amount: 2000}
    User->>Mobile: Completes Fingerprint & Facial Selfie
    Mobile->>Backend: POST /api/verify-selfie {prestaged_amount: 2000}

    Note over Backend,Kiosk: 3. Instant Dispense (Skip Kiosk Prompts!)
    Backend->>DB: Atomic Decrement (₹25,000 -> ₹23,000)
    Backend-->>Kiosk: WS Event: "DISPENSING_CASH" {amount: 2000, prestaged: true}
    Kiosk->>User: Cash tray immediately opens & ejects notes in <10s!
```

---

### Journey 3: Gemini Shoulder-Surfing Detection & Privacy Shield Mode

```mermaid
sequenceDiagram
    autonumber
    actor User as Alex (Customer)
    actor Attacker as Shoulder-Surfer (Behind Alex)
    participant Mobile as Mobile App
    participant Backend as FastAPI Server
    participant Gemini as Gemini Vision AI
    participant Kiosk as ATM Terminal Display

    User->>Mobile: Captures verification selfie
    Note over User,Attacker: Attacker is standing 1 meter behind Alex
    Mobile->>Backend: POST /api/verify-selfie
    Backend->>Gemini: Inspect facial landmarks & perimeter background
    Gemini-->>Backend: Result {match: true, shoulder_surfing_detected: true, threat_reason: "Observer detected standing behind user"}

    Note over Backend,Kiosk: Privacy Shield Engaged!
    Backend-->>Kiosk: WS Event: "AUTHORIZED" {shoulder_surfing_detected: true}
    Kiosk->>User: Blurs balances and amount displays (blur-md)
    Kiosk->>User: Displays Burnished Ochre warning banner
    User->>Kiosk: Steps aside, verifies perimeter, taps "Verify Perimeter & Reveal"
    Kiosk->>User: Un-blurs screen for secure entry
```

---

### Journey 4: Silent Duress Emergency Extraction & SOC Siren

```mermaid
sequenceDiagram
    autonumber
    actor CoercedUser as Alex (Under Coercion)
    participant Mobile as Mobile App
    participant Backend as FastAPI Server
    participant Kiosk as ATM Terminal Display
    participant SOC as Admin SOC (/ws/admin)

    Note over CoercedUser,Mobile: Silent Duress Triggered
    CoercedUser->>Mobile: Enters Duress PIN (4321) OR 2s long-press on Shield
    Mobile->>Backend: POST /api/session/{id}/biometric-auth {is_duress: true}
    Mobile->>Backend: POST /api/verify-selfie {is_duress: true}

    Note over Backend,SOC: Hidden SOC Emergency Alert!
    Backend->>SOC: WS Event: "DURESS_TRIGGERED" {terminal: "KIOSK-EAST-01", risk_score: 100}
    SOC->>SOC: Plays loud audible siren, flashes crimson threat alert

    Note over Backend,Kiosk: Zero Panic on Terminal
    Backend-->>Kiosk: WS Event: "AUTHORIZED" (Appears completely normal!)
    Kiosk->>CoercedUser: Prompts amount, dispenses decoy cash
    Kiosk->>CoercedUser: Displays standard receipt to protect customer safety
```

---

### Journey 5: Admin Emergency Kill Switch & Terminal Lockout

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Security Admin (SOC)
    participant SOC as Admin Dashboard
    participant Backend as FastAPI Server
    participant Kiosk as ATM Terminal Display
    actor SuspiciousUser as Terminal Operator

    Admin->>SOC: Notices High Risk Score (95/100) or Duress
    Admin->>SOC: Clicks "Emergency Terminate" Kill Switch
    SOC->>Backend: POST /api/session/{id}/kill
    Backend->>Backend: Update session status to "TERMINATED"
    Backend-->>Kiosk: WS Event: "SESSION_TERMINATED" {reason: "Halted by Security Operations"}

    Note over Kiosk,SuspiciousUser: Terminal Lockout!
    Kiosk->>SuspiciousUser: Instantly aborts dispense
    Kiosk->>SuspiciousUser: Displays crimson lock overlay: "Session Terminated by Risk Operations"
    Kiosk->>Kiosk: Auto-resets session after 5 seconds
```

---

### Journey 6: Delegated Emergency Family Withdrawal

```mermaid
sequenceDiagram
    autonumber
    actor Alex as Alex (Account Holder)
    actor Sarah as Sarah (Beneficiary)
    participant Dashboard as User Web Dashboard
    participant Backend as FastAPI Server
    participant Kiosk as ATM Terminal
    participant SarahApp as Sarah's Mobile App
    participant DB as MongoDB Atlas

    Note over Alex,Dashboard: 1. Granting Delegation
    Alex->>Dashboard: Logs into Portal, opens "Family Delegations"
    Alex->>Dashboard: Specifies Phone: Sarah, Max Limit: ₹5,000.00, Duration: 2h
    Dashboard->>Backend: POST /api/delegations/create
    Backend->>DB: Stores Delegation document {max: 5000, used: 0, expires_in: 2h}

    Note over Sarah,Kiosk: 2. Kiosk Arrival & Withdrawal
    Sarah->>Kiosk: Walks up to ATM Terminal
    Sarah->>SarahApp: Scans dynamic ATM QR code
    SarahApp->>Backend: POST /api/session/{id}/scan {user_id: sarah.id}
    Sarah->>SarahApp: Completes Fingerprint & Facial Selfie
    SarahApp->>Backend: POST /api/verify-selfie
    Backend-->>Kiosk: WS Event: "AUTHORIZED" (Delegated Mode)

    Note over Sarah,Kiosk: 3. Execution & Ceiling Enforcement
    Kiosk->>Sarah: Prompts cash withdrawal amount
    Sarah->>Kiosk: Requests ₹2,000.00
    Kiosk->>Backend: POST /api/transactions/withdraw {amount: 2000}
    Backend->>DB: Checks delegation (used ₹0 + ₹2,000 <= ₹5,000 max) -> Validated!
    Backend->>DB: Atomically increments used_amount and decrements Alex balance
    Backend-->>Kiosk: WS Event: "DISPENSING_CASH" {amount: 2000}
    Kiosk->>Sarah: Ejects ₹2,000 cash notes
```

---

### Journey 7: Gemini 3-Key Rotator Failover Recovery

```mermaid
sequenceDiagram
    autonumber
    participant Client as Verification Request
    participant Rotator as Gemini 3-Key Rotator
    participant Key1 as Key Slot 1
    participant Key2 as Key Slot 2
    participant AdminWS as Admin SOC (/ws/admin)

    Client->>Rotator: verify_selfie(live_frame, reference_frame)
    Rotator->>Key1: Forward request to Key Slot 1
    Key1-->>Rotator: HTTP 429 Too Many Requests (Quota Exhausted)

    Note over Rotator: Dynamic Quarantine Triggered!
    Rotator->>Rotator: Mark Slot 1: COOLDOWN (60s timer)
    Rotator->>AdminWS: Broadcast "ROTATOR_FAILOVER: Slot 1 Quarantined -> Slot 2 Active"

    Note over Rotator: Instant Zero-Downtime Failover
    Rotator->>Key2: Re-route same request to Key Slot 2
    Key2-->>Rotator: HTTP 200 OK: {match: true, confidence: 0.94}
    Rotator-->>Client: Return verification response to user

    Note over Rotator: After 60 Seconds:
    Rotator->>Rotator: Cooldown timer expires -> Slot 1 reset to HEALTHY
```

---

## 3. System State Machine & Lifecycle

```
┌─────────────────────────────────┬─────────────────────────────────────────────────────────┐
│ State                           │ Transition Trigger                                      │
├─────────────────────────────────┼─────────────────────────────────────────────────────────┤
│ `CREATED`                       │ Terminal mounts, fetches session QR from backend.       │
│ `SCANNED`                       │ Mobile app scans QR, binds device & prestaged amount.   │
│ `BIOMETRICS_VERIFIED`           │ Device fingerprint / BiometricPrompt succeeds.          │
│ `AUTHORIZED`                    │ Gemini Vision confirms face >=0.85 & checks perimeter.   │
│ `DISPENSING`                    │ Terminal executes atomic withdrawal & ejects notes.     │
│ `COMPLETED`                     │ Banknotes collected; digital advice receipt rendered.   │
│ `TERMINATED`                    │ Admin triggers Emergency Kill Switch from SOC.          │
│ `EXPIRED`                       │ Session exceeds 180s TTL without completion.           │
└─────────────────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 4. WebSocket Protocol Specification

### 4.1 Kiosk Channel (`/ws/kiosk/{session_id}`)

#### Events

##### `QR_SCANNED`
```json
{
  "event": "QR_SCANNED",
  "status": "SCANNED",
  "prestaged_amount": 2000,
  "user_name": "Alex Mercer"
}
```

##### `BIOMETRICS_VERIFIED`
```json
{
  "event": "BIOMETRICS_VERIFIED",
  "status": "BIOMETRICS_VERIFIED"
}
```

##### `AUTHORIZED`
```json
{
  "event": "AUTHORIZED",
  "status": "AUTHORIZED",
  "user": {"id": "usr_alex_001", "full_name": "Alex Mercer", "account_balance": 25000.0},
  "prestaged_amount": 2000,
  "shoulder_surfing_detected": false,
  "disguise_detected": false,
  "is_duress": false
}
```

##### `DISPENSING_CASH`
```json
{
  "event": "DISPENSING_CASH",
  "status": "COMPLETED",
  "amount": 2000.0,
  "new_balance": 23000.0,
  "transaction_id": "tx_c8914b"
}
```

##### `SESSION_TERMINATED`
```json
{
  "event": "SESSION_TERMINATED",
  "type": "SESSION_TERMINATED",
  "reason": "Terminal lockout enforced by Central Risk Committee"
}
```

---

### 4.2 Admin Channel (`/ws/admin`)

##### `DURESS_TRIGGERED`
```json
{
  "type": "DURESS_TRIGGERED",
  "data": {
    "terminal": "KIOSK-EAST-01",
    "user_id": "usr_alex_001",
    "risk_score": 100,
    "timestamp": "2026-11-21T20:30:00.000Z"
  }
}
```

##### `BALANCE_UPDATED`
```json
{
  "type": "BALANCE_UPDATED",
  "user_id": "usr_alex_001",
  "new_balance": 23000.0
}
```

##### `ROTATOR_TELEMETRY`
```json
{
  "type": "ROTATOR_TELEMETRY",
  "data": {
    "active_slot": "KEY_1",
    "slots": [
      {"slot_id": "KEY_1", "status": "HEALTHY", "cooldown_remaining_sec": 0, "fail_count": 0},
      {"slot_id": "KEY_2", "status": "HEALTHY", "cooldown_remaining_sec": 0, "fail_count": 0},
      {"slot_id": "KEY_3", "status": "HEALTHY", "cooldown_remaining_sec": 0, "fail_count": 0}
    ]
  }
}
```

---

## 5. Threat Analysis & Security Mitigations

```
┌─────────────────────────────────┬───────────────────────────────────────────────────────┐
│ Attack Vector                   │ Sentinel Architectural Defense                        │
├─────────────────────────────────┼───────────────────────────────────────────────────────┤
│ Physical Magnetic Skimmers      │ Zero physical card slots exist on the kiosk.          │
│ Shims on EMV Chip Readers       │ Zero chip reader mechanisms exist on the kiosk.       │
│ Camera Pinhole PIN Recording    │ Zero PINs are typed on physical ATM hardware.         │
│ Shoulder-Surfing Peeking        │ Gemini Vision AI detects bystanders; Privacy Shield.  │
│ Physical Coercion / Duress      │ Silent Duress Mode dispenses decoy & alerts SOC.      │
│ Rogue Terminal Abuse            │ Central Kill Switch remotely terminates session.      │
│ Pre-Recorded Video / Deepfakes  │ Multimodal Gemini Vision checks skin texture & depth. │
│ Stolen Smartphone Attack        │ Requires phone lock + hardware fingerprint + selfie.  │
│ Network Sniffing & Replays      │ TLS/HTTPS and WSS WebSocket transport encryption.     │
└─────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 6. Troubleshooting & Diagnostics Playbook

### 1. Kiosk Displays "WebSocket Disconnected"
- Confirm FastAPI backend is active: `curl http://localhost:8000/health`.
- Verify terminal connection configuration in `atm-kiosk/src/App.tsx`.

### 2. Live Selfie Fails Verification
- Check Gemini Rotator health: `curl http://localhost:8000/api/gemini/status`.
- Ensure the user's reference photo exists via `GET /api/users/{id}/reference-photo`.

### 3. Insufficient Balance Error
- Check user balance on Dashboard or verify remaining delegation quota.

### 4. Running the E2E Integration Suite
```bash
python test_rotator_e2e.py
```
Validates backend database, rotator health, dynamic session, biometrics, facial verification, and atomic balance deduction.
