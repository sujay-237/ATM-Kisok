# ATM Anti-Fraud Kiosk - Backend API

Production-ready FastAPI backend for the Cardless ATM Anti-Fraud Kiosk system.

## Key Features
- **MongoDB Atlas Cloud Database (v8.0.34)**: Async Motor driver with high-performance document collections, indexing (`users`, `auth_sessions`, `transactions`, `delegations`), and atomic balance deductions.
- **Google Gemini API Key Rotator**: 3-Key dynamic failover engine configured with live Gemini Vision API keys. Automatically monitors HTTP 429 Rate Limits / Quotas, applies adaptive 60s cooldowns, and routes to next available key with fallback sandbox verification.
- **Multimodal Facial Biometrics**: `/api/verify-selfie` accepts live selfie base64 and validates facial geometry & liveness against registered profile using Google Gemini Vision.
- **Real-Time WebSocket Pipeline**: `/ws/kiosk/{session_id}` pushes state transitions (`QR_SCANNED`, `BIOMETRICS_VERIFIED`, `AUTHORIZED`, `DISPENSING`) to the kiosk display instantaneously.
- **Admin Telemetry Channel**: `/ws/admin` broadcasts transactions, anomaly flags, and Gemini key health statistics.

## Environment Variables (`.env`)
```env
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?appName=AtmCluster
DATABASE_NAME=atm_kiosk

GEMINI_API_KEY_1=AIzaSy_YOUR_FIRST_KEY
GEMINI_API_KEY_2=AIzaSy_YOUR_SECOND_KEY
GEMINI_API_KEY_3=AIzaSy_YOUR_THIRD_KEY

ATM_SESSION_EXPIRY_SECONDS=180
GEMINI_FAILOVER_COOLDOWN_SECONDS=60
```

## Running Backend
```bash
# In backend/ directory:
.\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger Docs will be available at: `http://localhost:8000/docs`
