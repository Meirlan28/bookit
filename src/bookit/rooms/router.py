from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from bookit.auth.dependencies import get_current_user
from src.bookit.database import get_async_session

from .schemas import RoomCreate, RoomResponse
from .service import RoomService

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("", response_model=list[RoomResponse])
async def get_rooms(db: AsyncSession = Depends(get_async_session)):
    """Получить список всех переговорных комнат."""
    return await RoomService.get_all_rooms(db)

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_id: int, db: AsyncSession = Depends(get_async_session)):
    """Получить информацию о конкретной комнате."""
    return await RoomService.get_room_by_id(room_id, db)

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate,
    db: AsyncSession = Depends(get_async_session),
    current_user = Depends(get_current_user)  # Требуем авторизацию
):
    """Создать новую комнату."""
    return await RoomService.create_room(room_data, db)
