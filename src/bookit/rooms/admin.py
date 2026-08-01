from sqladmin import ModelView

from src.bookit.rooms.models import Room


class RoomAdmin(ModelView, model=Room):
    column_list = [Room.id, Room.name, Room.capacity, Room.has_projector]
    column_searchable_list = [Room.name]
    icon = "fa-solid fa-house"
