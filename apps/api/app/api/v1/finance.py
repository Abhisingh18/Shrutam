import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.finance import FeeStructure, Invoice, InvoiceStatus, Payment
from app.schemas.finance import (
    FeeStructureCreate,
    FeeStructureListResponse,
    FeeStructureRead,
    InvoiceCreate,
    InvoiceListResponse,
    InvoiceRead,
    InvoiceUpdate,
    PaginationMeta,
    PaymentCreate,
    PaymentRead,
)

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/fee-structures", response_model=FeeStructureListResponse)
async def list_fee_structures(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("fees:structure:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> FeeStructureListResponse:
    stmt = select(FeeStructure).where(
        FeeStructure.tenant_id == current_user.tenant_id, FeeStructure.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(FeeStructure).where(
        FeeStructure.tenant_id == current_user.tenant_id, FeeStructure.deleted_at.is_(None)
    )
    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(FeeStructure.name).offset((page - 1) * page_size).limit(page_size)
    structures = (await db.execute(stmt)).scalars().all()

    return FeeStructureListResponse(
        data=[FeeStructureRead.model_validate(s) for s in structures],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post(
    "/fee-structures", response_model=FeeStructureRead, status_code=status.HTTP_201_CREATED
)
async def create_fee_structure(
    body: FeeStructureCreate,
    current_user: CurrentUser = Depends(require_permission("fees:structure:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> FeeStructureRead:
    structure = FeeStructure(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(structure)
    await db.flush()
    response = FeeStructureRead.model_validate(structure)
    await db.commit()
    return response


@router.get("/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    current_user: CurrentUser = Depends(require_permission("fees:invoice:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> InvoiceListResponse:
    stmt = select(Invoice).where(
        Invoice.tenant_id == current_user.tenant_id, Invoice.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Invoice).where(
        Invoice.tenant_id == current_user.tenant_id, Invoice.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Invoice.invoice_number.ilike(pattern))
        count_stmt = count_stmt.where(Invoice.invoice_number.ilike(pattern))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Invoice.due_date.desc()).offset((page - 1) * page_size).limit(page_size)
    invoices = (await db.execute(stmt)).scalars().all()

    return InvoiceListResponse(
        data=[InvoiceRead.model_validate(i) for i in invoices],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("/invoices", response_model=InvoiceRead, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    body: InvoiceCreate,
    current_user: CurrentUser = Depends(require_permission("fees:invoice:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> InvoiceRead:
    data = body.model_dump()
    invoice_number = data.pop("invoice_number", None) or f"INV-{uuid.uuid4().hex[:8].upper()}"
    invoice = Invoice(tenant_id=current_user.tenant_id, invoice_number=invoice_number, **data)
    db.add(invoice)
    await db.flush()
    response = InvoiceRead.model_validate(invoice)
    await db.commit()
    return response


async def _get_invoice_or_404(
    invoice_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Invoice:
    stmt = select(Invoice).where(
        Invoice.id == invoice_id, Invoice.tenant_id == tenant_id, Invoice.deleted_at.is_(None)
    )
    invoice = (await db.execute(stmt)).scalar_one_or_none()
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Invoice not found"}},
        )
    return invoice


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
async def get_invoice(
    invoice_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("fees:invoice:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> InvoiceRead:
    invoice = await _get_invoice_or_404(invoice_id, current_user.tenant_id, db)
    return InvoiceRead.model_validate(invoice)


@router.patch("/invoices/{invoice_id}", response_model=InvoiceRead)
async def update_invoice(
    invoice_id: uuid.UUID,
    body: InvoiceUpdate,
    current_user: CurrentUser = Depends(require_permission("fees:invoice:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> InvoiceRead:
    invoice = await _get_invoice_or_404(invoice_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(invoice, field, value)
    await db.flush()
    response = InvoiceRead.model_validate(invoice)
    await db.commit()
    return response


@router.delete("/invoices/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("fees:invoice:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    invoice = await _get_invoice_or_404(invoice_id, current_user.tenant_id, db)
    invoice.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/invoices/{invoice_id}/payments", response_model=list[PaymentRead])
async def list_invoice_payments(
    invoice_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("fees:invoice:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[PaymentRead]:
    await _get_invoice_or_404(invoice_id, current_user.tenant_id, db)

    stmt = select(Payment).where(
        Payment.invoice_id == invoice_id,
        Payment.tenant_id == current_user.tenant_id,
        Payment.deleted_at.is_(None),
    )
    payments = (await db.execute(stmt)).scalars().all()
    return [PaymentRead.model_validate(p) for p in payments]


@router.post(
    "/invoices/{invoice_id}/payments",
    response_model=PaymentRead,
    status_code=status.HTTP_201_CREATED,
)
async def record_payment(
    invoice_id: uuid.UUID,
    body: PaymentCreate,
    current_user: CurrentUser = Depends(require_permission("fees:payment:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> PaymentRead:
    invoice = await _get_invoice_or_404(invoice_id, current_user.tenant_id, db)

    payment = Payment(tenant_id=current_user.tenant_id, invoice_id=invoice_id, **body.model_dump())
    db.add(payment)
    await db.flush()

    paid_stmt = select(func.coalesce(func.sum(Payment.amount), 0)).where(
        Payment.invoice_id == invoice_id,
        Payment.tenant_id == current_user.tenant_id,
        Payment.deleted_at.is_(None),
    )
    total_paid: Decimal = (await db.execute(paid_stmt)).scalar_one()

    if total_paid >= invoice.amount:
        invoice.status = InvoiceStatus.paid
    elif total_paid > 0:
        invoice.status = InvoiceStatus.partially_paid

    response = PaymentRead.model_validate(payment)
    await db.commit()
    return response
