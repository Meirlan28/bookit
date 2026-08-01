from datetime import datetime
from pydantic import BaseModel, ConfigDict, model_validator

class BookingCreate(BaseModel):
    start_time: datetime
    end_time: datetime

    @model_validator(mode="after")
    def validate_times(self) -> "BookingCreate":
        if self.start_time >= self.end_time:
            raise ValueError("Время окончания должно быть позже времени начала.")
        if self.start_time < datetime.utcnow():
            raise ValueError("Нельзя создать бронь в прошлом.")
        return self

class BookingResponse(BookingCreate):
    id: int
    user_id: int
    room_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
