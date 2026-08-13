"""Transport module API — Vehicles, Routes, and Transport Passes.

Scope for this wave is limited to vehicles + routes + passes (a student assigned
to a route). GPS tracking and driver attendance are out of scope and left for
future work.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.transport import Route, TransportPass, TransportPassStatus, Vehicle
from app.schemas.transport import (
    PaginationMeta,
    RouteCreate,
    RouteListResponse,
    RouteRead,
    RouteUpdate,
    TransportPassCreate,
    TransportPassListResponse,
    TransportPassRead,
    VehicleCreate,
    VehicleListResponse,
    VehicleRead,
    VehicleUpdate,
)

router = APIRouter(prefix="/transport", tags=["transport"])


# --- Vehicles (full CRUD) ---


async def _get_vehicle_or_404(
    vehicle_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Vehicle:
    stmt = select(Vehicle).where(
        Vehicle.id == vehicle_id, Vehicle.tenant_id == tenant_id, Vehicle.deleted_at.is_(None)
    )
    vehicle = (await db.execute(stmt)).scalar_one_or_none()
    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Vehicle not found"}},
        )
    return vehicle


@router.get("/vehicles", response_model=VehicleListResponse)
async def list_vehicles(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("transport:vehicle:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> VehicleListResponse:
    stmt = select(Vehicle).where(
        Vehicle.tenant_id == current_user.tenant_id, Vehicle.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Vehicle).where(
        Vehicle.tenant_id == current_user.tenant_id, Vehicle.deleted_at.is_(None)
    )

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(Vehicle.registration_number).offset((page - 1) * page_size).limit(page_size)
    )
    vehicles = (await db.execute(stmt)).scalars().all()

    return VehicleListResponse(
        data=[VehicleRead.model_validate(v) for v in vehicles],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/vehicles", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    body: VehicleCreate,
    current_user: CurrentUser = Depends(require_permission("transport:vehicle:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> VehicleRead:
    vehicle = Vehicle(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(vehicle)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # see app/api/v1/students.py create_student for the full rationale.
    await db.flush()
    response = VehicleRead.model_validate(vehicle)
    await db.commit()
    return response


@router.get("/vehicles/{vehicle_id}", response_model=VehicleRead)
async def get_vehicle(
    vehicle_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("transport:vehicle:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> VehicleRead:
    vehicle = await _get_vehicle_or_404(vehicle_id, current_user.tenant_id, db)
    return VehicleRead.model_validate(vehicle)


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleRead)
async def update_vehicle(
    vehicle_id: uuid.UUID,
    body: VehicleUpdate,
    current_user: CurrentUser = Depends(require_permission("transport:vehicle:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> VehicleRead:
    vehicle = await _get_vehicle_or_404(vehicle_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(vehicle, field, value)
    await db.flush()
    response = VehicleRead.model_validate(vehicle)
    await db.commit()
    return response


@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(
    vehicle_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("transport:vehicle:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    vehicle = await _get_vehicle_or_404(vehicle_id, current_user.tenant_id, db)
    vehicle.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Routes (full CRUD) ---


async def _get_route_or_404(route_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Route:
    stmt = select(Route).where(
        Route.id == route_id, Route.tenant_id == tenant_id, Route.deleted_at.is_(None)
    )
    route = (await db.execute(stmt)).scalar_one_or_none()
    if route is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Route not found"}},
        )
    return route


@router.get("/routes", response_model=RouteListResponse)
async def list_routes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("transport:route:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RouteListResponse:
    stmt = select(Route).where(
        Route.tenant_id == current_user.tenant_id, Route.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Route).where(
        Route.tenant_id == current_user.tenant_id, Route.deleted_at.is_(None)
    )

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Route.name).offset((page - 1) * page_size).limit(page_size)
    routes = (await db.execute(stmt)).scalars().all()

    return RouteListResponse(
        data=[RouteRead.model_validate(r) for r in routes],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/routes", response_model=RouteRead, status_code=status.HTTP_201_CREATED)
async def create_route(
    body: RouteCreate,
    current_user: CurrentUser = Depends(require_permission("transport:route:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RouteRead:
    route = Route(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(route)
    await db.flush()
    response = RouteRead.model_validate(route)
    await db.commit()
    return response


@router.get("/routes/{route_id}", response_model=RouteRead)
async def get_route(
    route_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("transport:route:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RouteRead:
    route = await _get_route_or_404(route_id, current_user.tenant_id, db)
    return RouteRead.model_validate(route)


@router.patch("/routes/{route_id}", response_model=RouteRead)
async def update_route(
    route_id: uuid.UUID,
    body: RouteUpdate,
    current_user: CurrentUser = Depends(require_permission("transport:route:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> RouteRead:
    route = await _get_route_or_404(route_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(route, field, value)
    await db.flush()
    response = RouteRead.model_validate(route)
    await db.commit()
    return response


@router.delete("/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    route_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("transport:route:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    route = await _get_route_or_404(route_id, current_user.tenant_id, db)
    route.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- Transport passes (list + create + cancel) ---


async def _get_pass_or_404(
    pass_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> TransportPass:
    stmt = select(TransportPass).where(
        TransportPass.id == pass_id,
        TransportPass.tenant_id == tenant_id,
        TransportPass.deleted_at.is_(None),
    )
    transport_pass = (await db.execute(stmt)).scalar_one_or_none()
    if transport_pass is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Transport pass not found"}},
        )
    return transport_pass


@router.get("/passes", response_model=TransportPassListResponse)
async def list_transport_passes(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    student_id: uuid.UUID | None = Query(default=None),
    route_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: CurrentUser = Depends(require_permission("transport:pass:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> TransportPassListResponse:
    stmt = select(TransportPass).where(
        TransportPass.tenant_id == current_user.tenant_id, TransportPass.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(TransportPass).where(
        TransportPass.tenant_id == current_user.tenant_id, TransportPass.deleted_at.is_(None)
    )
    if student_id is not None:
        stmt = stmt.where(TransportPass.student_id == student_id)
        count_stmt = count_stmt.where(TransportPass.student_id == student_id)
    if route_id is not None:
        stmt = stmt.where(TransportPass.route_id == route_id)
        count_stmt = count_stmt.where(TransportPass.route_id == route_id)
    if status_filter:
        stmt = stmt.where(TransportPass.status == status_filter)
        count_stmt = count_stmt.where(TransportPass.status == status_filter)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(TransportPass.valid_from.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    passes = (await db.execute(stmt)).scalars().all()

    return TransportPassListResponse(
        data=[TransportPassRead.model_validate(p) for p in passes],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/passes", response_model=TransportPassRead, status_code=status.HTTP_201_CREATED)
async def create_transport_pass(
    body: TransportPassCreate,
    current_user: CurrentUser = Depends(require_permission("transport:pass:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> TransportPassRead:
    transport_pass = TransportPass(
        tenant_id=current_user.tenant_id,
        student_id=body.student_id,
        route_id=body.route_id,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        status=TransportPassStatus.active,
    )
    db.add(transport_pass)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # see app/api/v1/students.py create_student for the full rationale.
    await db.flush()
    response = TransportPassRead.model_validate(transport_pass)
    await db.commit()
    return response


@router.post("/passes/{pass_id}/cancel", response_model=TransportPassRead)
async def cancel_transport_pass(
    pass_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("transport:pass:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> TransportPassRead:
    transport_pass = await _get_pass_or_404(pass_id, current_user.tenant_id, db)
    transport_pass.status = TransportPassStatus.cancelled
    await db.flush()
    response = TransportPassRead.model_validate(transport_pass)
    await db.commit()
    return response
