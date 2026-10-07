import asyncio
import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("websocket_manager")
logger.setLevel(logging.INFO)


class WebSocketManager:
    """
    Manages real-time WebSocket connections for:
    1. ATM Kiosks listening for specific session_id updates (QR Scanned, Biometrics Verified, Authorized, etc.)
    2. Admin dashboards listening for global kiosk events and anomaly alerts.
    """

    def __init__(self):
        # Maps session_id -> Set[WebSocket]
        self.kiosk_connections: Dict[str, Set[WebSocket]] = {}
        # Set of Admin WebSockets
        self.admin_connections: Set[WebSocket] = set()
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
        logger.info("[WS] Admin dashboard connected")

    async def disconnect_admin(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.admin_connections.discard(websocket)
        logger.info("[WS] Admin dashboard disconnected")

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
