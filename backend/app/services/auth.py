from uuid import uuid4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPairResponse
from app.schemas.user import UserResponse


class AuthService:
    @staticmethod
    async def register(session: AsyncSession, payload: RegisterRequest) -> TokenPairResponse:
        existing_user = await session.scalar(select(User).where(User.email == payload.email))
        if existing_user:
            raise ValueError("Email is already registered")

        existing_username = await session.scalar(select(User).where(User.username == payload.username))
        if existing_username:
            raise ValueError("Username is already taken")

        user = User(
            email=str(payload.email),
            username=payload.username,
            password_hash=get_password_hash(payload.password),
            role="user",
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return await AuthService._token_response(session, user)

    @staticmethod
    async def login(session: AsyncSession, payload: LoginRequest) -> TokenPairResponse:
        user = await session.scalar(select(User).where(User.email == payload.email))
        if not user or not verify_password(payload.password, user.password_hash):
            raise ValueError("Invalid credentials")
        return await AuthService._token_response(session, user)

    @staticmethod
    async def refresh(session: AsyncSession, user: User, current_jti: str) -> TokenPairResponse:
        if user.refresh_token_jti != current_jti:
            # Reuse detected or token revoked
            user.refresh_token_jti = None
            await session.commit()
            raise ValueError("Invalid or expired refresh token")
        return await AuthService._token_response(session, user)

    @staticmethod
    async def _token_response(session: AsyncSession, user: User) -> TokenPairResponse:
        jti = str(uuid4())
        access_token = create_access_token(user.id, user.email, user.role)
        refresh_token = create_refresh_token(user.id, user.email, user.role, jti)

        user.refresh_token_jti = jti
        await session.commit()

        return TokenPairResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

