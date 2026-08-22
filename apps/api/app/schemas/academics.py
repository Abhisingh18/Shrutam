import uuid

from pydantic import BaseModel, ConfigDict, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------


class DepartmentBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=1, max_length=32)
    campus_id: uuid.UUID | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    campus_id: uuid.UUID | None = None


class DepartmentRead(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class DepartmentListResponse(BaseModel):
    data: list[DepartmentRead]
    meta: PaginationMeta


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------


class SubjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=1, max_length=32)
    department_id: uuid.UUID
    credits: int = Field(ge=0)


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    department_id: uuid.UUID | None = None
    credits: int | None = Field(default=None, ge=0)


class SubjectRead(SubjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class SubjectListResponse(BaseModel):
    data: list[SubjectRead]
    meta: PaginationMeta


# ---------------------------------------------------------------------------
# Program
# ---------------------------------------------------------------------------


class ProgramBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    code: str = Field(min_length=1, max_length=32)
    department_id: uuid.UUID
    degree_type: str = Field(pattern="^(undergraduate|postgraduate|diploma)$")


class ProgramCreate(ProgramBase):
    pass


class ProgramRead(ProgramBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class ProgramListResponse(BaseModel):
    data: list[ProgramRead]
    meta: PaginationMeta


# ---------------------------------------------------------------------------
# Academic Year
# ---------------------------------------------------------------------------


class AcademicYearBase(BaseModel):
    name: str = Field(min_length=1, max_length=32)
    start_date: str
    end_date: str
    is_current: bool = False


class AcademicYearCreate(AcademicYearBase):
    pass


class AcademicYearRead(AcademicYearBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class AcademicYearListResponse(BaseModel):
    data: list[AcademicYearRead]
    meta: PaginationMeta


# ---------------------------------------------------------------------------
# Semester
# ---------------------------------------------------------------------------


class SemesterBase(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    academic_year_id: uuid.UUID
    start_date: str
    end_date: str
    is_current: bool = False


class SemesterCreate(SemesterBase):
    pass


class SemesterRead(SemesterBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class SemesterListResponse(BaseModel):
    data: list[SemesterRead]
    meta: PaginationMeta


# ---------------------------------------------------------------------------
# Section
# ---------------------------------------------------------------------------


class SectionBase(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    program_id: uuid.UUID
    semester_id: uuid.UUID
    capacity: int = Field(ge=0)
    class_teacher_id: uuid.UUID | None = None


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = Field(default=None, ge=0)
    class_teacher_id: uuid.UUID | None = None


class SectionRead(SectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID


class SectionListResponse(BaseModel):
    data: list[SectionRead]
    meta: PaginationMeta
