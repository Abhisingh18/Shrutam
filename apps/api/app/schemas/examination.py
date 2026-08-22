import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ExamBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    exam_type: str = Field(min_length=1, max_length=64)
    subject_id: uuid.UUID | None = None
    start_date: date
    end_date: date
    max_marks: int = Field(default=100, ge=1)


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    name: str | None = None
    exam_type: str | None = None
    subject_id: uuid.UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    max_marks: int | None = Field(default=None, ge=1)
    status: str | None = Field(
        default=None, pattern="^(draft|scheduled|ongoing|completed|results_published)$"
    )


class ExamRead(ExamBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class ExamListResponse(BaseModel):
    data: list[ExamRead]
    meta: PaginationMeta


class ExamMarkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    exam_id: uuid.UUID
    student_id: uuid.UUID
    marks_obtained: float | None = None
    grade: str | None = None
    grade_point: float | None = None
    remarks: str | None = None


class ExamMarkEntry(BaseModel):
    student_id: uuid.UUID
    marks_obtained: float | None = None
    grade: str | None = None
    remarks: str | None = None


class ExamMarksBulkUpdateRequest(BaseModel):
    marks: list[ExamMarkEntry]


class StudentCGPAResponse(BaseModel):
    student_id: uuid.UUID
    cgpa: float | None
    scale: str = "10-point"
    exams_graded: int


class ExamRankEntry(BaseModel):
    rank: int
    student_id: uuid.UUID
    student_name: str
    marks_obtained: float
    percentage: float
    grade: str | None = None


class ExamRankListResponse(BaseModel):
    exam_id: uuid.UUID
    max_marks: int
    data: list[ExamRankEntry]


class ExamAnalyticsResponse(BaseModel):
    exam_id: uuid.UUID
    students_graded: int
    average_marks: float | None
    highest_marks: float | None
    lowest_marks: float | None
    pass_count: int
    fail_count: int
    pass_percentage: float | None
    grade_distribution: dict[str, int]


class ReportCardResult(BaseModel):
    exam_id: uuid.UUID
    exam_name: str
    exam_type: str
    max_marks: int
    marks_obtained: float | None
    grade: str | None
    grade_point: float | None
