from pydantic import EmailStr

from app.schemas.common import TimestampedResponse


class UserResponse(TimestampedResponse):
    email: EmailStr
    username: str
    role: str
    credits_balance: int
    email_verified: bool

