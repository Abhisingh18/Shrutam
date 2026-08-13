import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.student import Admission, AdmissionStatus, Student
from app.schemas.admissions import (
    AdmissionCreate,
    AdmissionListResponse,
    AdmissionRead,
    AdmissionUpdate,
    ConvertToStudentRequest,
    PaginationMeta,
)

router = APIRouter(prefix="/admissions", tags=["admissions"])


class ConvertToStudentResponse(BaseModel):
    student_id: uuid.UUID
    admission_id: uuid.UUID


@router.get("", response_model=AdmissionListResponse)
async def list_admissions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: CurrentUser = Depends(require_permission("admissions:application:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AdmissionListResponse:
    stmt = select(Admission).where(
        Admission.tenant_id == current_user.tenant_id, Admission.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Admission).where(
        Admission.tenant_id == current_user.tenant_id, Admission.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Admission.applicant_name.ilike(pattern))
        count_stmt = count_stmt.where(Admission.applicant_name.ilike(pattern))
    if status_filter:
        stmt = stmt.where(Admission.status == status_filter)
        count_stmt = count_stmt.where(Admission.status == status_filter)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(Admission.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    admissions = (await db.execute(stmt)).scalars().all()

    return AdmissionListResponse(
        data=[AdmissionRead.model_validate(a) for a in admissions],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=AdmissionRead, status_code=status.HTTP_201_CREATED)
async def create_admission(
    body: AdmissionCreate,
    current_user: CurrentUser = Depends(require_permission("admissions:application:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AdmissionRead:
    admission = Admission(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(admission)
    await db.flush()
    response = AdmissionRead.model_validate(admission)
    await db.commit()
    return response


async def _get_admission_or_404(
    admission_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Admission:
    stmt = select(Admission).where(
        Admission.id == admission_id,
        Admission.tenant_id == tenant_id,
        Admission.deleted_at.is_(None),
    )
    admission = (await db.execute(stmt)).scalar_one_or_none()
    if admission is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Admission not found"}},
        )
    return admission


@router.get("/{admission_id}", response_model=AdmissionRead)
async def get_admission(
    admission_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("admissions:application:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AdmissionRead:
    admission = await _get_admission_or_404(admission_id, current_user.tenant_id, db)
    return AdmissionRead.model_validate(admission)


@router.patch("/{admission_id}", response_model=AdmissionRead)
async def update_admission(
    admission_id: uuid.UUID,
    body: AdmissionUpdate,
    current_user: CurrentUser = Depends(require_permission("admissions:application:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AdmissionRead:
    admission = await _get_admission_or_404(admission_id, current_user.tenant_id, db)
    if admission.status == AdmissionStatus.converted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "already_converted",
                    "message": "This application has already been converted to a student",
                }
            },
        )
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(admission, field, value)
    await db.flush()
    response = AdmissionRead.model_validate(admission)
    await db.commit()
    return response


@router.delete("/{admission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admission(
    admission_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("admissions:application:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    admission = await _get_admission_or_404(admission_id, current_user.tenant_id, db)
    admission.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/{admission_id}/convert", response_model=ConvertToStudentResponse)
async def convert_to_student(
    admission_id: uuid.UUID,
    body: ConvertToStudentRequest,
    current_user: CurrentUser = Depends(require_permission("admissions:application:convert")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ConvertToStudentResponse:
    """
    docs/06-ux-flows.md Admission Flow conversion step: Admission (accepted) ->
    Student created. Fee record / library account / hostel / transport / ID
    card / student login creation are the remaining steps in that saga —
    intentionally out of scope this wave until Finance/Library/Auth wiring
    between modules is designed; this endpoint only creates the Student row.
    """
    admission = await _get_admission_or_404(admission_id, current_user.tenant_id, db)

    if admission.status == AdmissionStatus.converted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "already_converted",
                    "message": "This application has already been converted to a student",
                }
            },
        )
    if admission.status != AdmissionStatus.accepted:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "not_accepted",
                    "message": "Only accepted applications can be converted to a student",
                }
            },
        )

    student = Student(
        tenant_id=current_user.tenant_id,
        admission_id=admission.id,
        admission_number=body.admission_number,
        full_name=admission.applicant_name,
        email=admission.applicant_email,
        phone=admission.applicant_phone,
        campus_id=admission.campus_id,
    )
    db.add(student)
    admission.status = AdmissionStatus.converted
    await db.flush()

    response = ConvertToStudentResponse(student_id=student.id, admission_id=admission.id)
    await db.commit()
    return response
