from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage import StorageService


ALLOWED_AUDIO_MIME_TYPES = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/flac", "audio/x-flac"}
ALLOWED_AUDIO_SUFFIXES = {".mp3", ".wav", ".flac"}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB

router = APIRouter()


class UploadAudioResponse(BaseModel):
    audio_file_name: str
    audio_url: str
    file_size_bytes: int
    detected_duration_seconds: float


@router.post("/audio", response_model=UploadAudioResponse, status_code=status.HTTP_201_CREATED)
async def upload_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> UploadAudioResponse:
    # Validate MIME type from content-type header
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    suffix = Path(file.filename or "").suffix.lower()

    if content_type not in ALLOWED_AUDIO_MIME_TYPES and suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported audio format. Accepted formats: MP3, WAV, FLAC.",
        )

    # Read file content and validate size before uploading to storage
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File exceeds the 200 MB size limit.",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded file is empty.",
        )

    # Upload validated file to storage
    storage = StorageService()
    safe_name = file.filename or f"upload-{current_user.id}"
    from uuid import uuid4
    relative_path = f"uploads/{current_user.id}/{uuid4()}-{safe_name}"
    audio_url = await storage.write_bytes(relative_path, content)

    return UploadAudioResponse(
        audio_file_name=file.filename or "upload",
        audio_url=audio_url,
        file_size_bytes=len(content),
        detected_duration_seconds=0.0,
    )
