import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


# ---- Employee ----


class EmployeeBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: str
    phone: str | None = None
    department_id: uuid.UUID | None = None
    designation: str = Field(min_length=1, max_length=128)
    employment_type: str = Field(
        default="full_time", pattern="^(full_time|part_time|contract|intern)$"
    )
    joining_date: date


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    designation: str | None = None
    status: str | None = Field(
        default=None, pattern="^(active|on_leave|resigned|terminated)$"
    )


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str


class EmployeeListResponse(BaseModel):
    data: list[EmployeeRead]
    meta: PaginationMeta


# ---- Leave requests ----


class LeaveRequestCreate(BaseModel):
    employee_id: uuid.UUID
    leave_type: str = Field(min_length=1, max_length=64)
    start_date: date
    end_date: date
    reason: str | None = None


class LeaveRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    leave_type: str
    start_date: date
    end_date: date
    reason: str | None
    status: str
    approved_by_user_id: uuid.UUID | None


class LeaveRequestListResponse(BaseModel):
    data: list[LeaveRequestRead]
    meta: PaginationMeta


class LeaveRequestDecision(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")
