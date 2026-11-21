import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("websocket_manager")
logger.setLevel(logging.INFO)


class WebSocketManager:
    """
    Manages real-time WebSocket connections for:
    1. ATM Kiosks listening for specific session_id updates (QR Scanned, Biometrics Verified, Authorized, Dispensing, etc.)
    2. Admin dashboards listening for global kiosk events, active threat telemetry, and duress alerts.
    """

    def __init__(self):
        # Maps session_id -> Set[WebSocket]
        self.kiosk_connections: Dict[str, Set[WebSocket]] = {}
        # Set of Admin WebSockets
        self.admin_connections: Set[WebSocket] = set()
        # Live active kiosk sessions tracking: session_id -> session_dict
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect_kiosk(self, session_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            if session_id not in self.kiosk_connections:
                self.kiosk_connections[session_id] = set()
            self.kiosk_connections[session_id].add(websocket)
        logger.info(f"[WS] Kiosk connected for session: {session_id}")

    async def disconnect_kiosk(self, session_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            if session_id in self.kiosk_connections:
                self.kiosk_connections[session_id].discard(websocket)
                if not self.kiosk_connections[session_id]:
                    del self.kiosk_connections[session_id]
        logger.info(f"[WS] Kiosk disconnected for session: {session_id}")

    async def connect_admin(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.admin_connections.add(websocket)
            # Send initial active sessions snapshot immediately upon connecting
            active_list = list(self.active_sessions.values())
        logger.info("[WS] Admin dashboard connected")
        try:
            init_payload = {
                "type": "ACTIVE_SESSIONS_INIT",
                "sessions": active_list,
            }
            await websocket.send_text(json.dumps(init_payload))
        except Exception as e:
            logger.warning(f"[WS] Error sending initial sessions to admin: {e}")

    async def disconnect_admin(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.admin_connections.discard(websocket)
        logger.info("[WS] Admin dashboard disconnected")

    async def update_session_state(self, session_id: str, updates: Dict[str, Any]) -> None:
        """Helper to register or update an active session in memory and notify admins."""
        async with self._lock:
            if session_id not in self.active_sessions:
                self.active_sessions[session_id] = {
                    "session_id": session_id,
                    "kiosk_id": updates.get("kiosk_id", "KIOSK-EAST-01"),
                    "status": updates.get("status", "CREATED"),
                    "step": updates.get("step", "QR_DISPLAY"),
                    "user_id": updates.get("user_id"),
                    "user_name": updates.get("user_name"),
                    "risk_score": updates.get("risk_score", 0),
                    "risk_factors": updates.get("risk_factors", []),
                    "shoulder_surfing_detected": updates.get("shoulder_surfing_detected", False),
                    "disguise_detected": updates.get("disguise_detected", False),
                    "threat_reason": updates.get("threat_reason"),
                    "prestaged_amount": updates.get("prestaged_amount"),
                    "is_duress": updates.get("is_duress", False),
                    "created_at": updates.get("created_at", datetime.now(timezone.utc).isoformat()),
                    "expires_at": updates.get("expires_at", ""),
                }
            else:
                self.active_sessions[session_id].update(updates)
            session_snapshot = dict(self.active_sessions[session_id])

        # Push session snapshot to Admin Dashboard
        await self.broadcast_admin({
            "type": "ACTIVE_SESSION_UPDATED",
            "session": session_snapshot,
        })

    async def remove_session_state(self, session_id: str) -> None:
        async with self._lock:
            self.active_sessions.pop(session_id, None)
        await self.broadcast_admin({
            "type": "ACTIVE_SESSION_REMOVED",
            "session_id": session_id,
        })

    async def get_active_sessions_list(self) -> List[Dict[str, Any]]:
        async with self._lock:
            return list(self.active_sessions.values())

    async def terminate_kiosk_session(self, session_id: str, reason: str = "Terminated by Security Admin") -> bool:
        """
        Kill Switch: Immediately pushes SESSION_TERMINATED to the target kiosk display,
        marks session as terminated, and alerts admin dashboard.
        """
        kill_payload = {
            "type": "SESSION_TERMINATED",
            "event": "SESSION_TERMINATED",
            "session_id": session_id,
            "reason": reason,
            "status": "TERMINATED",
        }
        await self.broadcast_session_update(session_id, kill_payload)
        await self.update_session_state(session_id, {
            "status": "TERMINATED",
            "step": "TERMINATED",
            "failure_reason": reason,
        })
        logger.warning(f"[KILL SWITCH] Admin terminated ATM session: {session_id} - Reason: {reason}")
        return True

    async def broadcast_duress(
        self,
        kiosk_id: str,
        user_id: str,
        user_name: str,
        decoy_amount: float,
        session_id: Optional[str] = None,
    ) -> None:
        """
        High-priority silent panic withdrawal alert emitted directly to all connected Admin Dashboards.
        Never alerts or shows red warnings on the kiosk or mobile screens!
        """
        alert_payload = {
            "type": "DURESS_ALERT",
            "kiosk_id": kiosk_id,
            "user_id": user_id,
            "user_name": user_name,
            "decoy_amount": decoy_amount,
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": f"CRITICAL: Silent Duress Mode triggered at {kiosk_id}! Account frozen. Decoy amount ₹{decoy_amount:,.2f} dispensed.",
        }
        await self.broadcast_admin(alert_payload)
        logger.error(f"[DURESS ALERT] Silent duress triggered by user {user_name} ({user_id}) at {kiosk_id}!")

    async def broadcast_session_update(self, session_id: str, payload: Dict[str, Any]) -> None:
        """
        Send update to all ATM kiosk clients listening to `session_id`,
        and also mirror the event to Admin dashboard connections.
        """
        message_json = json.dumps(payload)
        
        # 1. Send to kiosk clients
        dead_kiosk_sockets: List[WebSocket] = []
        async with self._lock:
            sockets = list(self.kiosk_connections.get(session_id, []))

        for ws in sockets:
            try:
                await ws.send_text(message_json)
            except Exception as e:
                logger.warning(f"[WS] Error sending to kiosk {session_id}: {e}")
                dead_kiosk_sockets.append(ws)

        if dead_kiosk_sockets:
            async with self._lock:
                if session_id in self.kiosk_connections:
                    for dead_ws in dead_kiosk_sockets:
                        self.kiosk_connections[session_id].discard(dead_ws)

        # 2. Mirror event to Admin dashboards
        admin_event = {
            "type": "KIOSK_SESSION_UPDATE",
            "session_id": session_id,
            "data": payload,
        }
        await self.broadcast_admin(admin_event)

    async def broadcast_admin(self, payload: Dict[str, Any]) -> None:
        """Broadcast an arbitrary event to all connected admin dashboards."""
        message_json = json.dumps(payload)
        dead_admin_sockets: List[WebSocket] = []
        
        async with self._lock:
            sockets = list(self.admin_connections)

        for ws in sockets:
            try:
                await ws.send_text(message_json)
            except Exception as e:
                logger.warning(f"[WS] Error sending to admin: {e}")
                dead_admin_sockets.append(ws)

        if dead_admin_sockets:
            async with self._lock:
                for dead_ws in dead_admin_sockets:
                    self.admin_connections.discard(dead_ws)


ws_manager = WebSocketManager()
