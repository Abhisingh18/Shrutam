import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class AdmissionBase(BaseModel):
    applicant_name: str = Field(min_length=1, max_length=255)
    applicant_email: EmailStr | None = None
    applicant_phone: str | None = None
    campus_id: uuid.UUID | None = None


class AdmissionCreate(AdmissionBase):
    pass


class AdmissionUpdate(BaseModel):
    status: str | None = Field(
        default=None, pattern="^(submitted|under_review|accepted|rejected)$"
    )


class AdmissionRead(AdmissionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str


class AdmissionListResponse(BaseModel):
    data: list[AdmissionRead]
    meta: PaginationMeta


class ConvertToStudentRequest(BaseModel):
    """Fields not captured at application time but required on the Student record —
    docs/06-ux-flows.md Admission Flow, conversion step."""

    admission_number: str = Field(min_length=1, max_length=32)
