from datetime import UTC, datetime

from pydantic import AwareDatetime, BaseModel, ConfigDict, model_validator


class BookingCreate(BaseModel):
    start_time: AwareDatetime
    end_time: AwareDatetime

    @model_validator(mode="after")
    def validate_times(self) -> "BookingCreate":
        if self.start_time >= self.end_time:
            raise ValueError("end time must be greater than start time.")

        if self.start_time < datetime.now(UTC):
            raise ValueError("start time must be in the future.")

        return self


class BookingResponse(BaseModel):
    id: int
    user_id: int
    room_id: int
    start_time: AwareDatetime
    end_time: AwareDatetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
