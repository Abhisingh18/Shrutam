import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.hr import Employee, LeaveRequest
from app.schemas.hr import (
    EmployeeCreate,
    EmployeeListResponse,
    EmployeeRead,
    EmployeeUpdate,
    LeaveRequestCreate,
    LeaveRequestDecision,
    LeaveRequestListResponse,
    LeaveRequestRead,
    PaginationMeta,
)

router = APIRouter(prefix="/hr", tags=["hr"])


# ---- Employees ----


@router.get("/employees", response_model=EmployeeListResponse)
async def list_employees(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    current_user: CurrentUser = Depends(require_permission("hr:employee:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> EmployeeListResponse:
    stmt = select(Employee).where(
        Employee.tenant_id == current_user.tenant_id, Employee.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Employee).where(
        Employee.tenant_id == current_user.tenant_id, Employee.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Employee.full_name.ilike(pattern))
        count_stmt = count_stmt.where(Employee.full_name.ilike(pattern))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Employee.full_name).offset((page - 1) * page_size).limit(page_size)
    employees = (await db.execute(stmt)).scalars().all()

    return EmployeeListResponse(
        data=[EmployeeRead.model_validate(e) for e in employees],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/employees", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    body: EmployeeCreate,
    current_user: CurrentUser = Depends(require_permission("hr:employee:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> EmployeeRead:
    employee = Employee(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(employee)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # `SET LOCAL`/`set_config(..., true)` resets on commit, so a refresh() after
    # commit() would run in a fresh, tenant-less transaction and be filtered out.
    await db.flush()
    response = EmployeeRead.model_validate(employee)
    await db.commit()
    return response


async def _get_employee_or_404(
    employee_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Employee:
    stmt = select(Employee).where(
        Employee.id == employee_id,
        Employee.tenant_id == tenant_id,
        Employee.deleted_at.is_(None),
    )
    employee = (await db.execute(stmt)).scalar_one_or_none()
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Employee not found"}},
        )
    return employee


@router.get("/employees/{employee_id}", response_model=EmployeeRead)
async def get_employee(
    employee_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("hr:employee:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> EmployeeRead:
    employee = await _get_employee_or_404(employee_id, current_user.tenant_id, db)
    return EmployeeRead.model_validate(employee)


@router.patch("/employees/{employee_id}", response_model=EmployeeRead)
async def update_employee(
    employee_id: uuid.UUID,
    body: EmployeeUpdate,
    current_user: CurrentUser = Depends(require_permission("hr:employee:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> EmployeeRead:
    employee = await _get_employee_or_404(employee_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(employee, field, value)
    await db.flush()
    response = EmployeeRead.model_validate(employee)
    await db.commit()
    return response


@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("hr:employee:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    employee = await _get_employee_or_404(employee_id, current_user.tenant_id, db)
    employee.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# ---- Leave requests ----


@router.get("/leave-requests", response_model=LeaveRequestListResponse)
async def list_leave_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    employee_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: CurrentUser = Depends(require_permission("hr:leave:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> LeaveRequestListResponse:
    stmt = select(LeaveRequest).where(
        LeaveRequest.tenant_id == current_user.tenant_id, LeaveRequest.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(LeaveRequest).where(
        LeaveRequest.tenant_id == current_user.tenant_id, LeaveRequest.deleted_at.is_(None)
    )
    if employee_id is not None:
        stmt = stmt.where(LeaveRequest.employee_id == employee_id)
        count_stmt = count_stmt.where(LeaveRequest.employee_id == employee_id)
    if status_filter is not None:
        stmt = stmt.where(LeaveRequest.status == status_filter)
        count_stmt = count_stmt.where(LeaveRequest.status == status_filter)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(LeaveRequest.start_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    leave_requests = (await db.execute(stmt)).scalars().all()

    return LeaveRequestListResponse(
        data=[LeaveRequestRead.model_validate(lr) for lr in leave_requests],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post(
    "/leave-requests", response_model=LeaveRequestRead, status_code=status.HTTP_201_CREATED
)
async def create_leave_request(
    body: LeaveRequestCreate,
    current_user: CurrentUser = Depends(require_permission("hr:leave:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> LeaveRequestRead:
    # Confirms the employee exists in this tenant before creating the leave request.
    await _get_employee_or_404(body.employee_id, current_user.tenant_id, db)

    leave_request = LeaveRequest(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(leave_request)
    await db.flush()
    response = LeaveRequestRead.model_validate(leave_request)
    await db.commit()
    return response


async def _get_leave_request_or_404(
    leave_request_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> LeaveRequest:
    stmt = select(LeaveRequest).where(
        LeaveRequest.id == leave_request_id,
        LeaveRequest.tenant_id == tenant_id,
        LeaveRequest.deleted_at.is_(None),
    )
    leave_request = (await db.execute(stmt)).scalar_one_or_none()
    if leave_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Leave request not found"}},
        )
    return leave_request


@router.post("/leave-requests/{leave_request_id}/decide", response_model=LeaveRequestRead)
async def decide_leave_request(
    leave_request_id: uuid.UUID,
    body: LeaveRequestDecision,
    current_user: CurrentUser = Depends(require_permission("hr:leave:approve")),
    db: AsyncSession = Depends(get_tenant_db),
) -> LeaveRequestRead:
    leave_request = await _get_leave_request_or_404(
        leave_request_id, current_user.tenant_id, db
    )
    leave_request.status = body.status
    leave_request.approved_by_user_id = current_user.user_id
    await db.flush()
    response = LeaveRequestRead.model_validate(leave_request)
    await db.commit()
    return response
