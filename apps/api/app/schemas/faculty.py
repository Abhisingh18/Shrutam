import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class FacultyBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: str
    phone: str | None = None
    department_id: uuid.UUID | None = None
    designation: str = Field(min_length=1, max_length=128)
    employment_type: str = Field(
        default="full_time", pattern="^(full_time|part_time|visiting|contract|intern)$"
    )
    joining_date: date


class FacultyCreate(FacultyBase):
    pass


class FacultyUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    designation: str | None = None
    status: str | None = Field(
        default=None, pattern="^(active|on_leave|resigned|retired)$"
    )


class FacultyRead(FacultyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class FacultyListResponse(BaseModel):
    data: list[FacultyRead]
    meta: PaginationMeta
