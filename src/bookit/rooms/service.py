from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.bookit.rooms.exceptions import (
    RoomAlreadyExistsException,
    RoomNotFoundException,
)
from src.bookit.rooms.models import Room
from src.bookit.rooms.schemas import RoomCreate


class RoomService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_rooms(self) -> list[Room]:
        result = await self.db.execute(select(Room))
        return list(result.scalars().all())

    async def get_room_by_id(self, room_id: int) -> Room:
        result = await self.db.execute(select(Room).where(Room.id == room_id))
        room = result.scalar_one_or_none()

        if not room:
            raise RoomNotFoundException()
        return room

    async def create_room(self, room_in: RoomCreate) -> Room:
        result = await self.db.execute(select(Room).where(Room.name == room_in.name))
        if result.scalar_one_or_none():
            raise RoomAlreadyExistsException()

        new_room = Room(**room_in.model_dump())
        self.db.add(new_room)
        await self.db.commit()
        await self.db.refresh(new_room)

        return new_room
