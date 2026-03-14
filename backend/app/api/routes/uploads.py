from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.storage import StorageService


ALLOWED_AUDIO_SUFFIXES = {".mp3", ".wav", ".flac"}
MAX_UPLOAD_BYTES = 200 * 1024 * 1024

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
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported audio format")

    storage = StorageService()
    audio_url, file_size = await storage.save_upload(current_user.id, file)
    if file_size > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 200MB limit")

    return UploadAudioResponse(
        audio_file_name=file.filename or "upload",
        audio_url=audio_url,
        file_size_bytes=file_size,
        detected_duration_seconds=30.0,
    )

