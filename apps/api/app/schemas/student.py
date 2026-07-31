import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class StudentBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, pattern="^(male|female|other|prefer_not_to_say)$")
    email: str | None = None
    phone: str | None = None
    campus_id: uuid.UUID | None = None


class StudentCreate(StudentBase):
    admission_number: str = Field(min_length=1, max_length=32)


class StudentUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    status: str | None = Field(
        default=None, pattern="^(active|inactive|graduated|transferred|expelled)$"
    )


class StudentRead(StudentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    admission_number: str
    status: str


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class StudentListResponse(BaseModel):
    data: list[StudentRead]
    meta: PaginationMeta
