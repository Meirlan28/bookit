from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.bookit.auth.dependencies import get_current_user
from src.bookit.auth.models import User
from src.bookit.rooms.bookings.dependencies import BookingServiceDep
from src.bookit.rooms.bookings.schemas import BookingCreate, BookingResponse

router = APIRouter(tags=["Bookings"])


@router.get("/bookings", response_model=list[BookingResponse])
async def get_bookings(
    booking_service: BookingServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await booking_service.get_user_bookings(current_user.id)


@router.post(
    "/rooms/{room_id}/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    room_id: int,
    booking_data: BookingCreate,
    booking_service: BookingServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
):
    return await booking_service.create_booking(room_id, current_user.id, booking_data)


@router.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: int,
    booking_service: BookingServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
):
    await booking_service.delete_booking(booking_id, current_user.id)
