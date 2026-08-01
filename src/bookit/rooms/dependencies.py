from typing import Annotated

from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.database import get_async_session
from src.bookit.rooms.service import RoomService


def get_room_service(
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> RoomService:
    return RoomService(db)

RoomServiceDep = Annotated[RoomService, Depends(get_room_service)]
