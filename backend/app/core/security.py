from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import get_settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


class TokenPayload(BaseModel):
    sub: str
    email: str
    role: str
    type: str
    exp: int


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _encode_token(subject: dict[str, Any], expires_delta: timedelta) -> str:
    settings = get_settings()
    payload = subject.copy()
    expires_at = datetime.now(UTC) + expires_delta
    payload["exp"] = int(expires_at.timestamp())
    return jwt.encode(payload, settings.app_secret_key, algorithm=ALGORITHM)


def create_access_token(user_id: str, email: str, role: str) -> str:
    settings = get_settings()
    return _encode_token(
        {"sub": user_id, "email": email, "role": role, "type": "access"},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: str, email: str, role: str) -> str:
    settings = get_settings()
    return _encode_token(
        {"sub": user_id, "email": email, "role": role, "type": "refresh"},
        timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str) -> TokenPayload:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.app_secret_key, algorithms=[ALGORITHM])
        return TokenPayload.model_validate(payload)
    except JWTError as exc:
        raise ValueError("Invalid token") from exc

