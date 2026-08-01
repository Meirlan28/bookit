from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.rooms.exceptions import RoomNotFoundException
from src.bookit.rooms.models import Room

from .exceptions import (
    BookingConflictException,
    BookingNotFoundException,
    ForbiddenActionException,
)
from .models import Booking
from .schemas import BookingCreate


class BookingService:
    @staticmethod
    async def create_booking(
        room_id: int, user_id: int, booking_in: BookingCreate, db: AsyncSession
    ) -> Booking:

        # 1. Проверяем, существует ли комната
        room = await db.execute(select(Room).where(Room.id == room_id))
        if not room.scalar_one_or_none():
            raise RoomNotFoundException()

        # 2. Проверяем пересечение броней (Овербукинг)
        overlapping_booking = await db.execute(
            select(Booking).where(
                and_(
                    Booking.room_id == room_id,
                    Booking.start_time < booking_in.end_time,
                    Booking.end_time > booking_in.start_time,
                )
            )
        )
        if overlapping_booking.scalar_one_or_none():
            raise BookingConflictException()

        # 3. Создаем бронь
        new_booking = Booking(
            room_id=room_id,
            user_id=user_id,
            start_time=booking_in.start_time,
            end_time=booking_in.end_time,
        )
        db.add(new_booking)
        await db.commit()
        await db.refresh(new_booking)

        return new_booking

    @staticmethod
    async def delete_booking(booking_id: int, user_id: int, db: AsyncSession):
        result = await db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()

        if not booking:
            raise BookingNotFoundException()

        if booking.user_id != user_id:
            raise ForbiddenActionException()

        await db.delete(booking)
        await db.commit()

        if booking.user_id != user_id:
            raise ForbiddenActionException()

        await db.delete(booking)
        await db.commit()
