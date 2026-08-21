import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.academics import Department, Program, Section, Semester, Subject
from app.models.tenancy import AcademicYear
from app.schemas.academics import (
    AcademicYearCreate,
    AcademicYearListResponse,
    AcademicYearRead,
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentRead,
    DepartmentUpdate,
    PaginationMeta,
    ProgramCreate,
    ProgramListResponse,
    ProgramRead,
    SectionCreate,
    SectionListResponse,
    SectionRead,
    SemesterCreate,
    SemesterListResponse,
    SemesterRead,
    SubjectCreate,
    SubjectListResponse,
    SubjectRead,
    SubjectUpdate,
)

router = APIRouter(prefix="/academics", tags=["academics"])


# ---------------------------------------------------------------------------
# Department — full CRUD
# ---------------------------------------------------------------------------


@router.get("/departments", response_model=DepartmentListResponse)
async def list_departments(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> DepartmentListResponse:
    stmt = select(Department).where(
        Department.tenant_id == current_user.tenant_id, Department.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Department).where(
        Department.tenant_id == current_user.tenant_id, Department.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Department.name.ilike(pattern))
        count_stmt = count_stmt.where(Department.name.ilike(pattern))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Department.name).offset((page - 1) * page_size).limit(page_size)
    departments = (await db.execute(stmt)).scalars().all()

    return DepartmentListResponse(
        data=[DepartmentRead.model_validate(d) for d in departments],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/departments", response_model=DepartmentRead, status_code=status.HTTP_201_CREATED)
async def create_department(
    body: DepartmentCreate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> DepartmentRead:
    department = Department(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(department)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # `SET LOCAL`/`set_config(..., true)` resets on commit, so a refresh() after
    # commit() would run in a fresh, tenant-less transaction and be filtered out.
    await db.flush()
    response = DepartmentRead.model_validate(department)
    await db.commit()
    return response


async def _get_department_or_404(
    department_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Department:
    stmt = select(Department).where(
        Department.id == department_id,
        Department.tenant_id == tenant_id,
        Department.deleted_at.is_(None),
    )
    department = (await db.execute(stmt)).scalar_one_or_none()
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Department not found"}},
        )
    return department


@router.get("/departments/{department_id}", response_model=DepartmentRead)
async def get_department(
    department_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> DepartmentRead:
    department = await _get_department_or_404(department_id, current_user.tenant_id, db)
    return DepartmentRead.model_validate(department)


@router.patch("/departments/{department_id}", response_model=DepartmentRead)
async def update_department(
    department_id: uuid.UUID,
    body: DepartmentUpdate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> DepartmentRead:
    department = await _get_department_or_404(department_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(department, field, value)
    await db.flush()
    response = DepartmentRead.model_validate(department)
    await db.commit()
    return response


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    department = await _get_department_or_404(department_id, current_user.tenant_id, db)
    department.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ---------------------------------------------------------------------------
# Subject — full CRUD
# ---------------------------------------------------------------------------


@router.get("/subjects", response_model=SubjectListResponse)
async def list_subjects(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    department_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SubjectListResponse:
    stmt = select(Subject).where(
        Subject.tenant_id == current_user.tenant_id, Subject.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Subject).where(
        Subject.tenant_id == current_user.tenant_id, Subject.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Subject.name.ilike(pattern))
        count_stmt = count_stmt.where(Subject.name.ilike(pattern))
    if department_id:
        stmt = stmt.where(Subject.department_id == department_id)
        count_stmt = count_stmt.where(Subject.department_id == department_id)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Subject.name).offset((page - 1) * page_size).limit(page_size)
    subjects = (await db.execute(stmt)).scalars().all()

    return SubjectListResponse(
        data=[SubjectRead.model_validate(s) for s in subjects],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/subjects", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
async def create_subject(
    body: SubjectCreate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SubjectRead:
    subject = Subject(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(subject)
    await db.flush()
    response = SubjectRead.model_validate(subject)
    await db.commit()
    return response


async def _get_subject_or_404(
    subject_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Subject:
    stmt = select(Subject).where(
        Subject.id == subject_id, Subject.tenant_id == tenant_id, Subject.deleted_at.is_(None)
    )
    subject = (await db.execute(stmt)).scalar_one_or_none()
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Subject not found"}},
        )
    return subject


@router.get("/subjects/{subject_id}", response_model=SubjectRead)
async def get_subject(
    subject_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SubjectRead:
    subject = await _get_subject_or_404(subject_id, current_user.tenant_id, db)
    return SubjectRead.model_validate(subject)


@router.patch("/subjects/{subject_id}", response_model=SubjectRead)
async def update_subject(
    subject_id: uuid.UUID,
    body: SubjectUpdate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SubjectRead:
    subject = await _get_subject_or_404(subject_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(subject, field, value)
    await db.flush()
    response = SubjectRead.model_validate(subject)
    await db.commit()
    return response


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    subject = await _get_subject_or_404(subject_id, current_user.tenant_id, db)
    subject.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ---------------------------------------------------------------------------
# Program — list + create only (full management UI lands in a later wave)
# ---------------------------------------------------------------------------


@router.get("/programs", response_model=ProgramListResponse)
async def list_programs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    department_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProgramListResponse:
    stmt = select(Program).where(
        Program.tenant_id == current_user.tenant_id, Program.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Program).where(
        Program.tenant_id == current_user.tenant_id, Program.deleted_at.is_(None)
    )
    if department_id:
        stmt = stmt.where(Program.department_id == department_id)
        count_stmt = count_stmt.where(Program.department_id == department_id)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Program.name).offset((page - 1) * page_size).limit(page_size)
    programs = (await db.execute(stmt)).scalars().all()

    return ProgramListResponse(
        data=[ProgramRead.model_validate(p) for p in programs],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/programs", response_model=ProgramRead, status_code=status.HTTP_201_CREATED)
async def create_program(
    body: ProgramCreate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ProgramRead:
    program = Program(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(program)
    await db.flush()
    response = ProgramRead.model_validate(program)
    await db.commit()
    return response


# ---------------------------------------------------------------------------
# Academic Year — list + create only (prerequisite for Semester -> Section,
# which the Timetable module FKs into; added retroactively since nothing had
# exposed AcademicYear via the API despite the model existing since the
# platform-foundation wave).
# ---------------------------------------------------------------------------


@router.get("/academic-years", response_model=AcademicYearListResponse)
async def list_academic_years(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AcademicYearListResponse:
    stmt = select(AcademicYear).where(
        AcademicYear.tenant_id == current_user.tenant_id, AcademicYear.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(AcademicYear).where(
        AcademicYear.tenant_id == current_user.tenant_id, AcademicYear.deleted_at.is_(None)
    )

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(AcademicYear.start_date.desc()).offset((page - 1) * page_size).limit(page_size)
    years = (await db.execute(stmt)).scalars().all()

    return AcademicYearListResponse(
        data=[AcademicYearRead.model_validate(y) for y in years],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/academic-years", response_model=AcademicYearRead, status_code=status.HTTP_201_CREATED)
async def create_academic_year(
    body: AcademicYearCreate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AcademicYearRead:
    year = AcademicYear(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(year)
    await db.flush()
    response = AcademicYearRead.model_validate(year)
    await db.commit()
    return response


# ---------------------------------------------------------------------------
# Semester — list + create only
# ---------------------------------------------------------------------------


@router.get("/semesters", response_model=SemesterListResponse)
async def list_semesters(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    academic_year_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SemesterListResponse:
    stmt = select(Semester).where(
        Semester.tenant_id == current_user.tenant_id, Semester.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Semester).where(
        Semester.tenant_id == current_user.tenant_id, Semester.deleted_at.is_(None)
    )
    if academic_year_id:
        stmt = stmt.where(Semester.academic_year_id == academic_year_id)
        count_stmt = count_stmt.where(Semester.academic_year_id == academic_year_id)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Semester.start_date).offset((page - 1) * page_size).limit(page_size)
    semesters = (await db.execute(stmt)).scalars().all()

    return SemesterListResponse(
        data=[SemesterRead.model_validate(s) for s in semesters],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/semesters", response_model=SemesterRead, status_code=status.HTTP_201_CREATED)
async def create_semester(
    body: SemesterCreate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SemesterRead:
    semester = Semester(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(semester)
    await db.flush()
    response = SemesterRead.model_validate(semester)
    await db.commit()
    return response


# ---------------------------------------------------------------------------
# Section — list + create only
# ---------------------------------------------------------------------------


@router.get("/sections", response_model=SectionListResponse)
async def list_sections(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    program_id: uuid.UUID | None = Query(default=None),
    semester_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("courses:catalog:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SectionListResponse:
    stmt = select(Section).where(
        Section.tenant_id == current_user.tenant_id, Section.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Section).where(
        Section.tenant_id == current_user.tenant_id, Section.deleted_at.is_(None)
    )
    if program_id:
        stmt = stmt.where(Section.program_id == program_id)
        count_stmt = count_stmt.where(Section.program_id == program_id)
    if semester_id:
        stmt = stmt.where(Section.semester_id == semester_id)
        count_stmt = count_stmt.where(Section.semester_id == semester_id)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Section.name).offset((page - 1) * page_size).limit(page_size)
    sections = (await db.execute(stmt)).scalars().all()

    return SectionListResponse(
        data=[SectionRead.model_validate(s) for s in sections],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/sections", response_model=SectionRead, status_code=status.HTTP_201_CREATED)
async def create_section(
    body: SectionCreate,
    current_user: CurrentUser = Depends(require_permission("courses:catalog:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> SectionRead:
    section = Section(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(section)
    await db.flush()
    response = SectionRead.model_validate(section)
    await db.commit()
    return response
