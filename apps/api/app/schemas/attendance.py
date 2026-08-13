import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field

STATUS_PATTERN = "^(present|absent|late|excused)$"


class AttendanceRecordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    student_id: uuid.UUID
    attendance_date: date
    status: str
    marked_by_user_id: uuid.UUID | None = None
    remarks: str | None = None


class AttendanceMarkEntry(BaseModel):
    student_id: uuid.UUID
    status: str = Field(pattern=STATUS_PATTERN)
    remarks: str | None = None


class AttendanceBulkMarkRequest(BaseModel):
    attendance_date: date
    entries: list[AttendanceMarkEntry]


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class AttendanceListResponse(BaseModel):
    data: list[AttendanceRecordRead]
    meta: PaginationMeta
