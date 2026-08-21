import uuid
from datetime import time

from pydantic import BaseModel, ConfigDict, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


# ---------------------------------------------------------------------------
# TimetableSlot
# ---------------------------------------------------------------------------


class TimetableSlotBase(BaseModel):
    section_id: uuid.UUID
    subject_id: uuid.UUID | None = None
    faculty_id: uuid.UUID | None = None
    day_of_week: str = Field(
        pattern="^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$"
    )
    start_time: time
    end_time: time
    room: str | None = Field(default=None, max_length=64)


class TimetableSlotCreate(TimetableSlotBase):
    pass


class TimetableSlotUpdate(BaseModel):
    section_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    faculty_id: uuid.UUID | None = None
    day_of_week: str | None = Field(
        default=None, pattern="^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$"
    )
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = Field(default=None, max_length=64)


class TimetableSlotRead(TimetableSlotBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class TimetableSlotListResponse(BaseModel):
    data: list[TimetableSlotRead]
    meta: PaginationMeta
