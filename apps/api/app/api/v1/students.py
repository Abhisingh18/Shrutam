import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.institution import get_institution_name
from app.core.pdf import render_id_card, render_transfer_certificate
from app.core.permissions import CurrentUser, require_permission
from app.models.student import Student
from app.schemas.student import (
    PaginationMeta,
    StudentCreate,
    StudentListResponse,
    StudentRead,
    StudentUpdate,
)

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=StudentListResponse)
async def list_students(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    current_user: CurrentUser = Depends(require_permission("students:profile:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> StudentListResponse:
    stmt = select(Student).where(
        Student.tenant_id == current_user.tenant_id, Student.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Student).where(
        Student.tenant_id == current_user.tenant_id, Student.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Student.full_name.ilike(pattern))
        count_stmt = count_stmt.where(Student.full_name.ilike(pattern))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Student.full_name).offset((page - 1) * page_size).limit(page_size)
    students = (await db.execute(stmt)).scalars().all()

    return StudentListResponse(
        data=[StudentRead.model_validate(s) for s in students],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
async def create_student(
    body: StudentCreate,
    current_user: CurrentUser = Depends(require_permission("students:profile:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> StudentRead:
    student = Student(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(student)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # `SET LOCAL`/`set_config(..., true)` resets on commit, so a refresh() after
    # commit() would run in a fresh, tenant-less transaction and be filtered out.
    await db.flush()
    response = StudentRead.model_validate(student)
    await db.commit()
    return response


async def _get_student_or_404(
    student_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Student:
    stmt = select(Student).where(
        Student.id == student_id, Student.tenant_id == tenant_id, Student.deleted_at.is_(None)
    )
    student = (await db.execute(stmt)).scalar_one_or_none()
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Student not found"}},
        )
    return student


@router.get("/{student_id}", response_model=StudentRead)
async def get_student(
    student_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("students:profile:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> StudentRead:
    student = await _get_student_or_404(student_id, current_user.tenant_id, db)
    return StudentRead.model_validate(student)


@router.patch("/{student_id}", response_model=StudentRead)
async def update_student(
    student_id: uuid.UUID,
    body: StudentUpdate,
    current_user: CurrentUser = Depends(require_permission("students:profile:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> StudentRead:
    student = await _get_student_or_404(student_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    await db.flush()
    response = StudentRead.model_validate(student)
    await db.commit()
    return response


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("students:profile:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    student = await _get_student_or_404(student_id, current_user.tenant_id, db)
    student.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/{student_id}/id-card.pdf")
async def download_student_id_card(
    student_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("students:profile:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    student = await _get_student_or_404(student_id, current_user.tenant_id, db)
    institution_name = await get_institution_name(current_user.tenant_id, db)
    pdf_bytes = render_id_card(
        institution_name=institution_name,
        student_name=student.full_name,
        admission_number=student.admission_number,
        status=student.status.value,
        date_of_birth=student.date_of_birth,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="id-card-{student.admission_number}.pdf"'
        },
    )


class TransferCertificateRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    conduct: str = Field(default="Good", max_length=100)


@router.post("/{student_id}/transfer-certificate.pdf")
async def download_transfer_certificate(
    student_id: uuid.UUID,
    body: TransferCertificateRequest,
    current_user: CurrentUser = Depends(require_permission("students:profile:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    student = await _get_student_or_404(student_id, current_user.tenant_id, db)
    institution_name = await get_institution_name(current_user.tenant_id, db)
    admission_display = (
        student.created_at.strftime("%d %B %Y") if student.created_at else "Not on record"
    )
    pdf_bytes = render_transfer_certificate(
        institution_name=institution_name,
        student_name=student.full_name,
        admission_number=student.admission_number,
        date_of_birth=student.date_of_birth,
        admission_date_display=admission_display,
        issue_date=date.today(),
        reason=body.reason,
        conduct=body.conduct,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="transfer-certificate-{student.admission_number}.pdf"'
            )
        },
    )
