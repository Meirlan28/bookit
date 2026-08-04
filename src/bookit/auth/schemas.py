from dataclasses import dataclass
from datetime import datetime
from enum import Enum, StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Role(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=3)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=3)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool
    is_verified: bool
    role: Role

    model_config = ConfigDict(from_attributes=True)


class RegistrationResponse(BaseModel):
    id: int
    email: EmailStr
    detail: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class SessionResponse(BaseModel):
    id: int
    ip_address: str | None
    user_agent: str | None
    last_activity: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class AuthFailure(StrEnum):
    USER_INACTIVE = "user_inactive"
    USER_NOT_VERIFIED = "user_not_verified"
    INVALID_TWO_FACTOR_CODE = "invalid_two_factor_code"


# Authentication Schemas
@dataclass(frozen=True, slots=True)
class AuthSuccess:
    access_token: str
    refresh_token: str


@dataclass(frozen=True, slots=True)
class InvalidCredentialsResult:
    security_alert_email: EmailStr | None = None


@dataclass(frozen=True, slots=True)
class LoginCooldownResult:
    seconds_left: int


@dataclass(frozen=True, slots=True)
class NewDeviceVerificationRequired:
    email: EmailStr
    code: str
    ip_address: str | None
    user_agent: str | None


type AuthResult = (
    AuthSuccess
    | InvalidCredentialsResult
    | LoginCooldownResult
    | NewDeviceVerificationRequired
    | AuthFailure
)


# Registration Schemas
@dataclass(frozen=True, slots=True)
class RegistrationSuccess:
    user_id: int
    email: EmailStr
    verification_token: str


class RegistrationFailure(StrEnum):
    USER_ALREADY_EXISTS = "user_already_exists"


type RegistrationResult = RegistrationSuccess | RegistrationFailure


# Token Refresh Schemas
@dataclass(frozen=True, slots=True)
class TokenRefreshSuccess:
    access_token: str
    refresh_token: str


class TokenRefreshFailure(StrEnum):
    INVALID_REFRESH_TOKEN = "invalid_refresh_token"


type TokenRefreshResult = (TokenRefreshSuccess | TokenRefreshFailure)
