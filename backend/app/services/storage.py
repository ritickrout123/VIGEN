from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import get_settings


class StorageService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def save_upload(self, user_id: str, upload: UploadFile) -> tuple[str, int]:
        safe_name = upload.filename or f"upload-{uuid4()}"
        target_dir = self.settings.filesystem_storage_root / "uploads" / user_id
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f"{uuid4()}-{safe_name}"

        content = await upload.read()
        target_path.write_bytes(content)
        return self._to_public_url(target_path), len(content)

    def write_bytes(self, relative_path: str, content: bytes) -> str:
        target_path = self.settings.filesystem_storage_root / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(content)
        return self._to_public_url(target_path)

    def _to_public_url(self, path: Path) -> str:
        root = self.settings.filesystem_storage_root.resolve()
        relative = path.resolve().relative_to(root)
        return f"/media/{relative.as_posix()}"

