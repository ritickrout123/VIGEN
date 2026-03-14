import logging
from pathlib import Path
from typing import AsyncIterator
from uuid import uuid4

from fastapi import UploadFile

try:
    import aioboto3
    HAS_AIOBOTO3 = True
except ImportError:
    HAS_AIOBOTO3 = False

logger = logging.getLogger(__name__)

from app.core.config import get_settings


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.session = aioboto3.Session() if HAS_AIOBOTO3 else None

    async def save_upload(self, user_id: str, upload: UploadFile) -> tuple[str, int]:
        safe_name = upload.filename or f"upload-{uuid4()}"
        relative_path = f"uploads/{user_id}/{uuid4()}-{safe_name}"
        content = await upload.read()
        url = await self.write_bytes(relative_path, content)
        return url, len(content)

    async def write_bytes(self, path: str, data: bytes) -> str:
        """Write bytes to storage and return the public URL."""
        if self.settings.storage_backend == "r2":
            return await self._write_r2(path, data)
        return await self._write_fs(path, data)

    async def read_bytes(self, path: str) -> bytes:
        """Read bytes from storage by path."""
        if self.settings.storage_backend == "r2":
            return await self._read_r2(path)
        return await self._read_fs(path)

    async def write_stream(self, path: str, stream: AsyncIterator[bytes]) -> str:
        """Write a stream of bytes to storage and return the public URL."""
        chunks: list[bytes] = []
        async for chunk in stream:
            chunks.append(chunk)
        data = b"".join(chunks)
        return await self.write_bytes(path, data)

    # ── Filesystem backend ────────────────────────────────────────────────────

    async def _write_fs(self, path: str, data: bytes) -> str:
        target = self.settings.filesystem_storage_root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return f"/media/{path}"

    async def _read_fs(self, path: str) -> bytes:
        target = self.settings.filesystem_storage_root / path
        return target.read_bytes()

    # ── R2 backend ────────────────────────────────────────────────────────────

    async def _write_r2(self, path: str, data: bytes) -> str:
        if not HAS_AIOBOTO3 or not self.session:
            raise RuntimeError("aioboto3 is required for R2 storage but is not installed")

        async with self.session.client(
            "s3",
            endpoint_url=self.settings.r2_endpoint_url,
            aws_access_key_id=self.settings.r2_access_key_id,
            aws_secret_access_key=self.settings.r2_secret_access_key,
        ) as s3:
            # Raises on failure — Celery task will catch and retry
            await s3.put_object(
                Bucket=self.settings.r2_bucket,
                Key=path,
                Body=data,
            )

        return f"{self.settings.r2_public_base_url}/{path}"

    async def _read_r2(self, path: str) -> bytes:
        if not HAS_AIOBOTO3 or not self.session:
            raise RuntimeError("aioboto3 is required for R2 storage but is not installed")

        async with self.session.client(
            "s3",
            endpoint_url=self.settings.r2_endpoint_url,
            aws_access_key_id=self.settings.r2_access_key_id,
            aws_secret_access_key=self.settings.r2_secret_access_key,
        ) as s3:
            response = await s3.get_object(
                Bucket=self.settings.r2_bucket,
                Key=path,
            )
            return await response["Body"].read()
