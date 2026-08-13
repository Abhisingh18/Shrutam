import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


# --- Hostel (list + create only this wave) ---


class HostelBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    warden_name: str | None = None
    campus_id: uuid.UUID | None = None


class HostelCreate(HostelBase):
    pass


class HostelRead(HostelBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class HostelListResponse(BaseModel):
    data: list[HostelRead]
    meta: PaginationMeta


# --- Room (full CRUD) ---


class RoomBase(BaseModel):
    hostel_id: uuid.UUID
    room_number: str = Field(min_length=1, max_length=32)
    capacity: int = Field(ge=1)


class RoomCreate(RoomBase):
    pass


class RoomUpdate(BaseModel):
    room_number: str | None = Field(default=None, min_length=1, max_length=32)
    capacity: int | None = Field(default=None, ge=1)


class RoomRead(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    occupied_count: int


class RoomListResponse(BaseModel):
    data: list[RoomRead]
    meta: PaginationMeta


# --- Room allocations ---


class RoomAllocationCreate(BaseModel):
    room_id: uuid.UUID
    student_id: uuid.UUID
    allocated_date: date


class RoomAllocationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    room_id: uuid.UUID
    student_id: uuid.UUID
    allocated_date: date
    vacated_date: date | None = None
    status: str


class RoomAllocationListResponse(BaseModel):
    data: list[RoomAllocationRead]
    meta: PaginationMeta
