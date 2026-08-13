"""Hostel module API — Hostels, Rooms, and Room Allocations.

Scope for this wave is limited to hostels + rooms + allocations. Mess planning,
visitor logs, and maintenance requests are out of scope and left for future work.
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.hostel import Hostel, Room, RoomAllocation, RoomAllocationStatus
from app.schemas.hostel import (
    HostelCreate,
    HostelListResponse,
    HostelRead,
    PaginationMeta,
    RoomAllocationCreate,
    RoomAllocationListResponse,
    RoomAllocationRead,
    RoomCreate,
    RoomListResponse,
    RoomRead,
    RoomUpdate,
)

router = APIRouter(prefix="/hostel", tags=["hostel"])


# --- Hostels (list + create only this wave) ---


@router.get("/hostels", response_model=HostelListResponse)
async def list_hostels(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("hostel:room:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> HostelListResponse:
    stmt = select(Hostel).where(
        Hostel.tenant_id == current_user.tenant_id, Hostel.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Hostel).where(
        Hostel.tenant_id == current_user.tenant_id, Hostel.deleted_at.is_(None)
    )

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Hostel.name).offset((page - 1) * page_size).limit(page_size)
    hostels = (await db.execute(stmt)).scalars().all()

    return HostelListResponse(
        data=[HostelRead.model_validate(h) for h in hostels],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/hostels", response_model=HostelRead, status_code=status.HTTP_201_CREATED)
async def create_hostel(
    body: HostelCreate,
    current_user: CurrentUser = Depends(require_permission("hostel:room:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> HostelRead:
    hostel = Hostel(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(hostel)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # see app/api/v1/students.py create_student for the full rationale.
    await db.flush()
    response = HostelRead.model_validate(hostel)
    await db.commit()
    return response


# --- Rooms (full CRUD) ---


async def _get_room_or_404(room_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Room:
    stmt = select(Room).where(
        Room.id == room_id, Room.tenant_id == tenant_id, Room.deleted_at.is_(None)
    )
    room = (await db.execute(stmt)).scalar_one_or_none()
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Room not found"}},
        )
    return room


@router.get("/rooms", response_model=RoomListResponse)
async def list_rooms(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    hostel_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("hostel:room:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RoomListResponse:
    stmt = select(Room).where(
        Room.tenant_id == current_user.tenant_id, Room.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Room).where(
        Room.tenant_id == current_user.tenant_id, Room.deleted_at.is_(None)
    )
    if hostel_id is not None:
        stmt = stmt.where(Room.hostel_id == hostel_id)
        count_stmt = count_stmt.where(Room.hostel_id == hostel_id)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Room.room_number).offset((page - 1) * page_size).limit(page_size)
    rooms = (await db.execute(stmt)).scalars().all()

    return RoomListResponse(
        data=[RoomRead.model_validate(r) for r in rooms],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/rooms", response_model=RoomRead, status_code=status.HTTP_201_CREATED)
async def create_room(
    body: RoomCreate,
    current_user: CurrentUser = Depends(require_permission("hostel:room:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RoomRead:
    room = Room(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(room)
    await db.flush()
    response = RoomRead.model_validate(room)
    await db.commit()
    return response


@router.get("/rooms/{room_id}", response_model=RoomRead)
async def get_room(
    room_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("hostel:room:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RoomRead:
    room = await _get_room_or_404(room_id, current_user.tenant_id, db)
    return RoomRead.model_validate(room)


@router.patch("/rooms/{room_id}", response_model=RoomRead)
async def update_room(
    room_id: uuid.UUID,
    body: RoomUpdate,
    current_user: CurrentUser = Depends(require_permission("hostel:room:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RoomRead:
    room = await _get_room_or_404(room_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    await db.flush()
    response = RoomRead.model_validate(room)
    await db.commit()
    return response


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("hostel:room:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    room = await _get_room_or_404(room_id, current_user.tenant_id, db)
    room.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Room allocations ---


async def _get_allocation_or_404(
    allocation_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> RoomAllocation:
    stmt = select(RoomAllocation).where(
        RoomAllocation.id == allocation_id,
        RoomAllocation.tenant_id == tenant_id,
        RoomAllocation.deleted_at.is_(None),
    )
    allocation = (await db.execute(stmt)).scalar_one_or_none()
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Room allocation not found"}},
        )
    return allocation


@router.get("/allocations", response_model=RoomAllocationListResponse)
async def list_room_allocations(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    room_id: uuid.UUID | None = Query(default=None),
    student_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: CurrentUser = Depends(require_permission("hostel:allocation:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RoomAllocationListResponse:
    stmt = select(RoomAllocation).where(
        RoomAllocation.tenant_id == current_user.tenant_id, RoomAllocation.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(RoomAllocation).where(
        RoomAllocation.tenant_id == current_user.tenant_id, RoomAllocation.deleted_at.is_(None)
    )
    if room_id is not None:
        stmt = stmt.where(RoomAllocation.room_id == room_id)
        count_stmt = count_stmt.where(RoomAllocation.room_id == room_id)
    if student_id is not None:
        stmt = stmt.where(RoomAllocation.student_id == student_id)
        count_stmt = count_stmt.where(RoomAllocation.student_id == student_id)
    if status_filter:
        stmt = stmt.where(RoomAllocation.status == status_filter)
        count_stmt = count_stmt.where(RoomAllocation.status == status_filter)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(RoomAllocation.allocated_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    allocations = (await db.execute(stmt)).scalars().all()

    return RoomAllocationListResponse(
        data=[RoomAllocationRead.model_validate(a) for a in allocations],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post(
    "/allocations", response_model=RoomAllocationRead, status_code=status.HTTP_201_CREATED
)
async def create_room_allocation(
    body: RoomAllocationCreate,
    current_user: CurrentUser = Depends(require_permission("hostel:allocation:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RoomAllocationRead:
    room = await _get_room_or_404(body.room_id, current_user.tenant_id, db)
    if room.occupied_count >= room.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "room_full", "message": "Room has no available capacity"}},
        )

    allocation = RoomAllocation(
        tenant_id=current_user.tenant_id,
        room_id=body.room_id,
        student_id=body.student_id,
        allocated_date=body.allocated_date,
        status=RoomAllocationStatus.active,
    )
    room.occupied_count += 1
    db.add(allocation)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # see app/api/v1/students.py create_student for the full rationale.
    await db.flush()
    response = RoomAllocationRead.model_validate(allocation)
    await db.commit()
    return response


@router.post("/allocations/{allocation_id}/vacate", response_model=RoomAllocationRead)
async def vacate_room_allocation(
    allocation_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("hostel:allocation:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RoomAllocationRead:
    allocation = await _get_allocation_or_404(allocation_id, current_user.tenant_id, db)
    room = await _get_room_or_404(allocation.room_id, current_user.tenant_id, db)

    allocation.vacated_date = date.today()
    allocation.status = RoomAllocationStatus.vacated
    if room.occupied_count > 0:
        room.occupied_count -= 1

    await db.flush()
    response = RoomAllocationRead.model_validate(allocation)
    await db.commit()
    return response
