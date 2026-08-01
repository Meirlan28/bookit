from enum import Enum

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
    role: Role

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
