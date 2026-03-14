from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenPairResponse
from app.schemas.user import UserResponse
from app.services.auth import AuthService


router = APIRouter()


@router.post("/register", response_model=TokenPairResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_db)) -> TokenPairResponse:
    try:
        return await AuthService.register(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/login", response_model=TokenPairResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_db)) -> TokenPairResponse:
    try:
        return await AuthService.login(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post("/refresh", response_model=TokenPairResponse)
async def refresh(
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenPairResponse:
    from sqlalchemy import select

    from app.core.security import decode_token
    from app.models.user import User

    try:
        token = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    if token.type != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user = await session.scalar(select(User).where(User.id == token.sub))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return AuthService.refresh(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)

