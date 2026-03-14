import logging
from pathlib import Path
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

        if self.settings.storage_backend == "r2":
            url = await self._write_r2(relative_path, content)
        else:
            url = await self._write_fs(relative_path, content)

        return url, len(content)

    async def write_bytes(self, relative_path: str, content: bytes) -> str:
        if self.settings.storage_backend == "r2":
            return await self._write_r2(relative_path, content)
        else:
            return await self._write_fs(relative_path, content)

    async def _write_fs(self, relative_path: str, content: bytes) -> str:
        target_path = self.settings.filesystem_storage_root / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        # In a real async environment, we'd use aiofiles, but for now we block on OS write
        target_path.write_bytes(content)
        return self._fs_to_public_url(target_path)

    async def _write_r2(self, relative_path: str, content: bytes) -> str:
        if not HAS_AIOBOTO3 or not self.session:
            logger.error("r2 storage requested but aioboto3 not installed")
            return await self._write_fs(relative_path, content)

        try:
            async with self.session.client(
                "s3",
                endpoint_url=self.settings.r2_endpoint_url,
                aws_access_key_id=self.settings.r2_access_key_id,
                aws_secret_access_key=self.settings.r2_secret_access_key,
            ) as s3:
                await s3.put_object(
                    Bucket=self.settings.r2_bucket,
                    Key=relative_path,
                    Body=content,
                )
            return f"{self.settings.r2_public_base_url}/{relative_path}"
        except Exception as exc:
            logger.exception("Failed to write to R2, falling back to FS")
            return await self._write_fs(relative_path, content)

    def _fs_to_public_url(self, path: Path) -> str:
        root = self.settings.filesystem_storage_root.resolve()
        try:
            relative = path.resolve().relative_to(root)
            return f"/media/{relative.as_posix()}"
        except ValueError:
            return f"/media/{path.name}"

