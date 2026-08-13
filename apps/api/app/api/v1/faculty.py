import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.faculty import Faculty
from app.schemas.faculty import (
    FacultyCreate,
    FacultyListResponse,
    FacultyRead,
    FacultyUpdate,
    PaginationMeta,
)

router = APIRouter(prefix="/faculty", tags=["faculty"])


@router.get("", response_model=FacultyListResponse)
async def list_faculty(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    current_user: CurrentUser = Depends(require_permission("faculty:profile:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> FacultyListResponse:
    stmt = select(Faculty).where(
        Faculty.tenant_id == current_user.tenant_id, Faculty.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Faculty).where(
        Faculty.tenant_id == current_user.tenant_id, Faculty.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Faculty.full_name.ilike(pattern))
        count_stmt = count_stmt.where(Faculty.full_name.ilike(pattern))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Faculty.full_name).offset((page - 1) * page_size).limit(page_size)
    faculty = (await db.execute(stmt)).scalars().all()

    return FacultyListResponse(
        data=[FacultyRead.model_validate(f) for f in faculty],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=FacultyRead, status_code=status.HTTP_201_CREATED)
async def create_faculty(
    body: FacultyCreate,
    current_user: CurrentUser = Depends(require_permission("faculty:profile:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> FacultyRead:
    faculty = Faculty(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(faculty)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # `SET LOCAL`/`set_config(..., true)` resets on commit, so a refresh() after
    # commit() would run in a fresh, tenant-less transaction and be filtered out.
    await db.flush()
    response = FacultyRead.model_validate(faculty)
    await db.commit()
    return response


async def _get_faculty_or_404(
    faculty_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Faculty:
    stmt = select(Faculty).where(
        Faculty.id == faculty_id, Faculty.tenant_id == tenant_id, Faculty.deleted_at.is_(None)
    )
    faculty = (await db.execute(stmt)).scalar_one_or_none()
    if faculty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Faculty not found"}},
        )
    return faculty


@router.get("/{faculty_id}", response_model=FacultyRead)
async def get_faculty(
    faculty_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("faculty:profile:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> FacultyRead:
    faculty = await _get_faculty_or_404(faculty_id, current_user.tenant_id, db)
    return FacultyRead.model_validate(faculty)


@router.patch("/{faculty_id}", response_model=FacultyRead)
async def update_faculty(
    faculty_id: uuid.UUID,
    body: FacultyUpdate,
    current_user: CurrentUser = Depends(require_permission("faculty:profile:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> FacultyRead:
    faculty = await _get_faculty_or_404(faculty_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(faculty, field, value)
    await db.flush()
    response = FacultyRead.model_validate(faculty)
    await db.commit()
    return response


@router.delete("/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faculty(
    faculty_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("faculty:profile:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    faculty = await _get_faculty_or_404(faculty_id, current_user.tenant_id, db)
    faculty.deleted_at = datetime.now(timezone.utc)
    await db.commit()
