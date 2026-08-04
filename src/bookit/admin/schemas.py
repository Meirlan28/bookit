from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.bookit.auth.models import Role


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    verified_users: int
    total_rooms: int
    total_bookings: int
    upcoming_bookings: int
    bookings_today: int


class AdminUserResponse(BaseModel):
    id: int
    email: EmailStr
    role: Role
    is_active: bool
    is_verified: bool
    booking_count: int


class AdminUserPage(BaseModel):
    items: list[AdminUserResponse]
    total: int
    page: int
    page_size: int
    pages: int


class AdminUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Role | None = None
    is_active: bool | None = None


class BookingStatus(StrEnum):
    ALL = "all"
    UPCOMING = "upcoming"
    PAST = "past"


class AdminBookingResponse(BaseModel):
    id: int
    user_id: int
    user_email: EmailStr
    room_id: int
    room_name: str
    start_time: datetime
    end_time: datetime
    created_at: datetime


class AdminBookingPage(BaseModel):
    items: list[AdminBookingResponse]
    total: int
    page: int
    page_size: int
    pages: int


class AdminRoomUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=1, max_length=100)
    capacity: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=500)
    has_projector: bool | None = None
    has_whiteboard: bool | None = None
