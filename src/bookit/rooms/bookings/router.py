from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.auth.dependencies import get_current_user
from src.bookit.auth.models import User
from src.bookit.database import get_async_session

from .schemas import BookingCreate, BookingResponse
from .service import BookingService

router = APIRouter(tags=["Bookings"])


@router.post(
    "/rooms/{room_id}/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_booking(
    room_id: int,
    booking_data: BookingCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Создать бронирование (Доступно любому авторизованному юзеру)."""
    return await BookingService.create_booking(
        room_id, current_user.id, booking_data, db
    )


@router.delete("/bookings/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(
    booking_id: int,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """Удалить бронирование (Юзер может удалить только свою бронь)."""
    await BookingService.delete_booking(booking_id, current_user.id, db)
    await BookingService.delete_booking(booking_id, current_user.id, db)
