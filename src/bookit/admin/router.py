from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.bookit.admin.dependencies import AdminServiceDep, CurrentAdminDep
from src.bookit.admin.schemas import (
    AdminBookingPage,
    AdminRoomUpdate,
    AdminStatsResponse,
    AdminUserPage,
    AdminUserResponse,
    AdminUserUpdate,
    BookingStatus,
)
from src.bookit.auth.dependencies import get_current_admin
from src.bookit.rooms.schemas import RoomResponse

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    admin_service: AdminServiceDep,
):
    return await admin_service.get_stats()


@router.get("/users", response_model=AdminUserPage)
async def get_users(
    admin_service: AdminServiceDep,
    search: Annotated[str | None, Query(max_length=255)] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return await admin_service.get_users(search, page, page_size)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    admin_service: AdminServiceDep,
    current_admin: CurrentAdminDep,
):
    return await admin_service.update_user(user_id, payload, current_admin.id)


@router.get("/bookings", response_model=AdminBookingPage)
async def get_bookings(
    admin_service: AdminServiceDep,
    search: Annotated[str | None, Query(max_length=255)] = None,
    booking_status: Annotated[BookingStatus, Query(alias="status")] = (
        BookingStatus.ALL
    ),
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return await admin_service.get_bookings(
        search,
        booking_status,
        page,
        page_size,
    )


@router.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: int,
    admin_service: AdminServiceDep,
) -> None:
    await admin_service.delete_booking(booking_id)


@router.patch("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    payload: AdminRoomUpdate,
    admin_service: AdminServiceDep,
):
    return await admin_service.update_room(room_id, payload)


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    admin_service: AdminServiceDep,
) -> None:
    await admin_service.delete_room(room_id)
