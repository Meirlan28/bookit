from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .models import Room
from .schemas import RoomCreate
from .exceptions import RoomNotFoundException, RoomAlreadyExistsException

class RoomService:
    @staticmethod
    async def get_all_rooms(db: AsyncSession) -> list[Room]:
        result = await db.execute(select(Room))
        return list(result.scalars().all())

    @staticmethod
    async def get_room_by_id(room_id: int, db: AsyncSession) -> Room:
        result = await db.execute(select(Room).where(Room.id == room_id))
        room = result.scalar_one_or_none()

        if not room:
            raise RoomNotFoundException()
        return room

    @staticmethod
    async def create_room(room_in: RoomCreate, db: AsyncSession) -> Room:
        # Проверяем уникальность имени
        result = await db.execute(select(Room).where(Room.name == room_in.name))
        if result.scalar_one_or_none():
            raise RoomAlreadyExistsException()

        # Создаем комнату (распаковываем Pydantic модель в kwargs)
        new_room = Room(**room_in.model_dump())
        db.add(new_room)
        await db.commit()
        await db.refresh(new_room)

        return new_room
