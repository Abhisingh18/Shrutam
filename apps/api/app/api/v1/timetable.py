import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.timetable import TimetableSlot
from app.schemas.timetable import (
    PaginationMeta,
    TimetableSlotCreate,
    TimetableSlotListResponse,
    TimetableSlotRead,
    TimetableSlotUpdate,
)

router = APIRouter(prefix="/timetable", tags=["timetable"])

# A week's schedule for one section/faculty is inherently small — cap instead of
# paginating (per spec: "a week's schedule is small — cap naturally").
_MAX_SLOTS = 500


async def _check_conflicts(
    db: AsyncSession,
    *,
    tenant_id: uuid.UUID,
    section_id: uuid.UUID,
    faculty_id: uuid.UUID | None,
    day_of_week: str,
    start_time,
    end_time,
    exclude_id: uuid.UUID | None = None,
) -> None:
    """Two ranges [a_start, a_end) and [b_start, b_end) overlap iff
    a_start < b_end and b_start < a_end. Applied per section (a section can't
    host two classes at once) and, if a faculty is assigned, per faculty
    (a faculty member can't be double-booked across sections)."""

    overlap_clause = and_(
        TimetableSlot.start_time < end_time, TimetableSlot.end_time > start_time
    )

    section_stmt = select(TimetableSlot.id).where(
        TimetableSlot.tenant_id == tenant_id,
        TimetableSlot.deleted_at.is_(None),
        TimetableSlot.section_id == section_id,
        TimetableSlot.day_of_week == day_of_week,
        overlap_clause,
    )
    if exclude_id is not None:
        section_stmt = section_stmt.where(TimetableSlot.id != exclude_id)
    if (await db.execute(section_stmt)).scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "section_schedule_conflict",
                    "message": (
                        "This section already has a class scheduled that overlaps "
                        "this day and time."
                    ),
                }
            },
        )

    if faculty_id is not None:
        faculty_stmt = select(TimetableSlot.id).where(
            TimetableSlot.tenant_id == tenant_id,
            TimetableSlot.deleted_at.is_(None),
            TimetableSlot.faculty_id == faculty_id,
            TimetableSlot.day_of_week == day_of_week,
            overlap_clause,
        )
        if exclude_id is not None:
            faculty_stmt = faculty_stmt.where(TimetableSlot.id != exclude_id)
        if (await db.execute(faculty_stmt)).scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "faculty_schedule_conflict",
                        "message": (
                            "This faculty member is already scheduled for an "
                            "overlapping class at this day and time."
                        ),
                    }
                },
            )


def _to_list_response(slots: list[TimetableSlot]) -> TimetableSlotListResponse:
    return TimetableSlotListResponse(
        data=[TimetableSlotRead.model_validate(s) for s in slots],
        meta=PaginationMeta(page=1, page_size=_MAX_SLOTS, total=len(slots)),
    )


@router.get("/section/{section_id}", response_model=TimetableSlotListResponse)
async def list_section_timetable(
    section_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("timetable:slot:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> TimetableSlotListResponse:
    stmt = (
        select(TimetableSlot)
        .where(
            TimetableSlot.tenant_id == current_user.tenant_id,
            TimetableSlot.deleted_at.is_(None),
            TimetableSlot.section_id == section_id,
        )
        .order_by(TimetableSlot.day_of_week, TimetableSlot.start_time)
        .limit(_MAX_SLOTS)
    )
    slots = (await db.execute(stmt)).scalars().all()
    return _to_list_response(list(slots))


@router.get("/faculty/{faculty_id}", response_model=TimetableSlotListResponse)
async def list_faculty_timetable(
    faculty_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("timetable:slot:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> TimetableSlotListResponse:
    stmt = (
        select(TimetableSlot)
        .where(
            TimetableSlot.tenant_id == current_user.tenant_id,
            TimetableSlot.deleted_at.is_(None),
            TimetableSlot.faculty_id == faculty_id,
        )
        .order_by(TimetableSlot.day_of_week, TimetableSlot.start_time)
        .limit(_MAX_SLOTS)
    )
    slots = (await db.execute(stmt)).scalars().all()
    return _to_list_response(list(slots))


async def _get_slot_or_404(
    slot_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> TimetableSlot:
    stmt = select(TimetableSlot).where(
        TimetableSlot.id == slot_id,
        TimetableSlot.tenant_id == tenant_id,
        TimetableSlot.deleted_at.is_(None),
    )
    slot = (await db.execute(stmt)).scalar_one_or_none()
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Timetable slot not found"}},
        )
    return slot


@router.post("/slots", response_model=TimetableSlotRead, status_code=status.HTTP_201_CREATED)
async def create_timetable_slot(
    body: TimetableSlotCreate,
    current_user: CurrentUser = Depends(require_permission("timetable:slot:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> TimetableSlotRead:
    await _check_conflicts(
        db,
        tenant_id=current_user.tenant_id,
        section_id=body.section_id,
        faculty_id=body.faculty_id,
        day_of_week=body.day_of_week,
        start_time=body.start_time,
        end_time=body.end_time,
    )

    slot = TimetableSlot(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(slot)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # see app/api/v1/academics.py create_department for the full rationale.
    await db.flush()
    response = TimetableSlotRead.model_validate(slot)
    await db.commit()
    return response


@router.patch("/slots/{slot_id}", response_model=TimetableSlotRead)
async def update_timetable_slot(
    slot_id: uuid.UUID,
    body: TimetableSlotUpdate,
    current_user: CurrentUser = Depends(require_permission("timetable:slot:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> TimetableSlotRead:
    slot = await _get_slot_or_404(slot_id, current_user.tenant_id, db)
    updates = body.model_dump(exclude_unset=True)

    await _check_conflicts(
        db,
        tenant_id=current_user.tenant_id,
        section_id=updates.get("section_id", slot.section_id),
        faculty_id=updates.get("faculty_id", slot.faculty_id),
        day_of_week=updates.get("day_of_week", slot.day_of_week),
        start_time=updates.get("start_time", slot.start_time),
        end_time=updates.get("end_time", slot.end_time),
        exclude_id=slot.id,
    )

    for field, value in updates.items():
        setattr(slot, field, value)
    await db.flush()
    response = TimetableSlotRead.model_validate(slot)
    await db.commit()
    return response


@router.delete("/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_timetable_slot(
    slot_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("timetable:slot:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    slot = await _get_slot_or_404(slot_id, current_user.tenant_id, db)
    slot.deleted_at = datetime.now(timezone.utc)
    await db.commit()
