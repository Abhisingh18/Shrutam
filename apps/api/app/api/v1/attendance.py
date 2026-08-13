import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.attendance import AttendanceRecord
from app.schemas.attendance import (
    AttendanceBulkMarkRequest,
    AttendanceListResponse,
    AttendanceRecordRead,
    PaginationMeta,
)

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.get("", response_model=AttendanceListResponse)
async def list_attendance(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    date: date | None = Query(default=None),
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("attendance:record:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AttendanceListResponse:
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.tenant_id == current_user.tenant_id,
        AttendanceRecord.deleted_at.is_(None),
    )
    count_stmt = select(func.count()).select_from(AttendanceRecord).where(
        AttendanceRecord.tenant_id == current_user.tenant_id,
        AttendanceRecord.deleted_at.is_(None),
    )
    if date is not None:
        stmt = stmt.where(AttendanceRecord.attendance_date == date)
        count_stmt = count_stmt.where(AttendanceRecord.attendance_date == date)
    if student_id is not None:
        stmt = stmt.where(AttendanceRecord.student_id == student_id)
        count_stmt = count_stmt.where(AttendanceRecord.student_id == student_id)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(AttendanceRecord.attendance_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    records = (await db.execute(stmt)).scalars().all()

    return AttendanceListResponse(
        data=[AttendanceRecordRead.model_validate(r) for r in records],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.get("/date/{attendance_date}", response_model=list[AttendanceRecordRead])
async def get_attendance_for_date(
    attendance_date: date,
    current_user: CurrentUser = Depends(require_permission("attendance:record:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[AttendanceRecordRead]:
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.tenant_id == current_user.tenant_id,
        AttendanceRecord.deleted_at.is_(None),
        AttendanceRecord.attendance_date == attendance_date,
    )
    records = (await db.execute(stmt)).scalars().all()
    return [AttendanceRecordRead.model_validate(r) for r in records]


@router.post("/mark", response_model=list[AttendanceRecordRead])
async def mark_attendance(
    body: AttendanceBulkMarkRequest,
    current_user: CurrentUser = Depends(require_permission("attendance:record:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[AttendanceRecordRead]:
    # Upsert-by-loop (query-then-add-or-update) rather than a raw SQL ON CONFLICT
    # upsert — simplicity over throughput for the class-roster-sized batches
    # (dozens–hundreds of rows) this endpoint handles per docs/06-ux-flows.md §5.2.
    results: list[AttendanceRecord] = []
    for entry in body.entries:
        stmt = select(AttendanceRecord).where(
            AttendanceRecord.tenant_id == current_user.tenant_id,
            AttendanceRecord.student_id == entry.student_id,
            AttendanceRecord.attendance_date == body.attendance_date,
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing is not None:
            existing.status = entry.status
            existing.remarks = entry.remarks
            existing.marked_by_user_id = current_user.user_id
            results.append(existing)
        else:
            record = AttendanceRecord(
                tenant_id=current_user.tenant_id,
                student_id=entry.student_id,
                attendance_date=body.attendance_date,
                status=entry.status,
                remarks=entry.remarks,
                marked_by_user_id=current_user.user_id,
            )
            db.add(record)
            results.append(record)

    # Flush (not commit) so RETURNING/defaults populate while the RLS session GUC
    # set by get_tenant_db is still in scope for *this* transaction — see
    # app/api/v1/students.py create_student for the full rationale.
    await db.flush()
    response = [AttendanceRecordRead.model_validate(r) for r in results]
    await db.commit()
    return response
