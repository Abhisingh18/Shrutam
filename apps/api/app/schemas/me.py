import uuid

from pydantic import BaseModel

from app.schemas.examination import StudentCGPAResponse


class MyExamResultRead(BaseModel):
    exam_id: uuid.UUID
    exam_name: str
    exam_type: str
    max_marks: int
    marks_obtained: float | None
    grade: str | None
    grade_point: float | None


class MyResultsResponse(BaseModel):
    results: list[MyExamResultRead]
    cgpa: StudentCGPAResponse
