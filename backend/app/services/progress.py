import asyncio
from collections import defaultdict

from fastapi import WebSocket

from app.schemas.pipeline import ProgressEvent


class ProgressBroker:
    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._latest: dict[str, ProgressEvent] = {}
        self._lock = asyncio.Lock()

    async def connect(self, job_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[job_id].add(websocket)
        if job_id in self._latest:
            await websocket.send_json(self._latest[job_id].model_dump())

    async def disconnect(self, job_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections[job_id].discard(websocket)

    async def publish(self, event: ProgressEvent) -> None:
        self._latest[event.job_id] = event
        async with self._lock:
            sockets = list(self._connections.get(event.job_id, set()))
        for socket in sockets:
            await socket.send_json(event.model_dump())


progress_broker = ProgressBroker()

