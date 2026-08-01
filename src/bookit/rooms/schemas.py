from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class RoomBase(BaseModel):
    name: str = Field(..., max_length=100, description="Название переговорки")
    capacity: int = Field(..., gt=0, description="Вместимость (человек)")
    description: Optional[str] = None
    has_projector: bool = False
    has_whiteboard: bool = False

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
