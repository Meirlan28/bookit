from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.bookit.auth.dependencies import get_current_admin
from src.bookit.auth.models import User
from src.bookit.rooms.dependencies import RoomServiceDep
from src.bookit.rooms.schemas import RoomCreate, RoomResponse

router = APIRouter(prefix="/rooms", tags=["Rooms"])


@router.get("", response_model=list[RoomResponse])
async def get_rooms(room_service: RoomServiceDep):
    return await room_service.get_all_rooms()


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(room_service: RoomServiceDep, room_id: int):
    return await room_service.get_room_by_id(room_id)


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_service: RoomServiceDep,
    room_data: RoomCreate,
    current_admin: Annotated[User, Depends(get_current_admin)],
):

    return await room_service.create_room(room_data)
