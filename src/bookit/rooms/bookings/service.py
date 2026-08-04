from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.bookit.rooms.bookings.exceptions import (
    BookingConflictException,
    BookingNotFoundException,
    ForbiddenActionException,
)
from src.bookit.rooms.bookings.models import Booking
from src.bookit.rooms.bookings.schemas import BookingCreate
from src.bookit.rooms.exceptions import RoomNotFoundException
from src.bookit.rooms.models import Room


class BookingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_bookings(self, user_id: int) -> list[Booking]:
        result = await self.db.execute(
            select(Booking)
            .where(Booking.user_id == user_id)
            .order_by(Booking.start_time.desc())
            .options(selectinload(Booking.room))
        )
        return result.scalars().all()

    async def create_booking(
        self, room_id: int, user_id: int, booking_in: BookingCreate
    ) -> Booking:
        room = await self.db.execute(select(Room).where(Room.id == room_id))
        if not room.scalar_one_or_none():
            raise RoomNotFoundException()

        overlapping_booking = await self.db.execute(
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

        new_booking = Booking(
            room_id=room_id,
            user_id=user_id,
            start_time=booking_in.start_time,
            end_time=booking_in.end_time,
        )
        self.db.add(new_booking)
        await self.db.commit()
        await self.db.refresh(new_booking)

        return new_booking

    async def delete_booking(self, booking_id: int, user_id: int):
        result = await self.db.execute(select(Booking).where(Booking.id == booking_id))
        booking = result.scalar_one_or_none()

        if not booking:
            raise BookingNotFoundException()

        if booking.user_id != user_id:
            raise ForbiddenActionException()

        await self.db.delete(booking)
        await self.db.commit()
