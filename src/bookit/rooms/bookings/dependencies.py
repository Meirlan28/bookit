from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.database import get_async_session
from src.bookit.rooms.bookings.service import BookingService


def get_book_service(
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> BookingService:
    return BookingService(db)

BookingServiceDep = Annotated[BookingService, Depends(get_book_service)]
