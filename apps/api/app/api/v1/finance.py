import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.institution import get_institution_name
from app.core.pdf import render_fee_receipt
from app.core.permissions import CurrentUser, require_permission
from app.models.finance import FeeStructure, Invoice, InvoiceStatus, Payment
from app.models.student import Student
from app.schemas.finance import (
    FeeStructureCreate,
    FeeStructureListResponse,
    FeeStructureRead,
    InvoiceCreate,
    InvoiceDefaulterRead,
    InvoiceDefaultersResponse,
    InvoiceListResponse,
    InvoiceRead,
    InvoiceUpdate,
    PaginationMeta,
    PaymentCreate,
    PaymentRead,
)

router = APIRouter(prefix="/finance", tags=["finance"])


async def _total_paid(invoice_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Decimal:
    stmt = select(func.coalesce(func.sum(Payment.amount), 0)).where(
        Payment.invoice_id == invoice_id, Payment.tenant_id == tenant_id, Payment.deleted_at.is_(None)
    )
    return (await db.execute(stmt)).scalar_one()


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


@router.get("/invoices/defaulters", response_model=InvoiceDefaultersResponse)
async def list_invoice_defaulters(
    current_user: CurrentUser = Depends(require_permission("fees:invoice:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> InvoiceDefaultersResponse:
    """Every unpaid/partially-paid invoice past its due date, with an on-the-fly
    late fee (days overdue * the originating fee structure's late_fee_per_day,
    or 0 if the invoice wasn't raised off a structure)."""
    today = date.today()
    stmt = (
        select(Invoice, Student.full_name, FeeStructure.late_fee_per_day)
        .join(Student, Student.id == Invoice.student_id)
        .outerjoin(FeeStructure, FeeStructure.id == Invoice.fee_structure_id)
        .where(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.deleted_at.is_(None),
            Invoice.due_date < today,
            Invoice.status.in_([InvoiceStatus.pending, InvoiceStatus.partially_paid, InvoiceStatus.overdue]),
        )
        .order_by(Invoice.due_date)
    )
    rows = (await db.execute(stmt)).all()

    entries: list[InvoiceDefaulterRead] = []
    total_outstanding = Decimal("0")
    for invoice, student_name, late_fee_per_day in rows:
        paid = await _total_paid(invoice.id, current_user.tenant_id, db)
        outstanding = invoice.amount - paid
        if outstanding <= 0:
            continue
        days_overdue = (today - invoice.due_date).days
        late_fee = (late_fee_per_day or Decimal("0")) * days_overdue
        total_outstanding += outstanding
        entries.append(
            InvoiceDefaulterRead(
                invoice_id=invoice.id,
                invoice_number=invoice.invoice_number,
                student_id=invoice.student_id,
                student_name=student_name,
                amount=invoice.amount,
                total_paid=paid,
                outstanding=outstanding,
                due_date=invoice.due_date,
                days_overdue=days_overdue,
                late_fee=late_fee,
            )
        )

    return InvoiceDefaultersResponse(data=entries, total_outstanding=total_outstanding)


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

    total_paid = await _total_paid(invoice_id, current_user.tenant_id, db)

    if total_paid >= invoice.amount:
        invoice.status = InvoiceStatus.paid
    elif total_paid > 0:
        invoice.status = InvoiceStatus.partially_paid

    response = PaymentRead.model_validate(payment)
    await db.commit()
    return response


async def _get_payment_or_404(
    payment_id: uuid.UUID, invoice_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Payment:
    stmt = select(Payment).where(
        Payment.id == payment_id,
        Payment.invoice_id == invoice_id,
        Payment.tenant_id == tenant_id,
        Payment.deleted_at.is_(None),
    )
    payment = (await db.execute(stmt)).scalar_one_or_none()
    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Payment not found"}},
        )
    return payment


@router.get("/invoices/{invoice_id}/payments/{payment_id}/receipt.pdf")
async def download_payment_receipt(
    invoice_id: uuid.UUID,
    payment_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("fees:invoice:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    invoice = await _get_invoice_or_404(invoice_id, current_user.tenant_id, db)
    payment = await _get_payment_or_404(payment_id, invoice_id, current_user.tenant_id, db)

    student_stmt = select(Student).where(
        Student.id == invoice.student_id, Student.tenant_id == current_user.tenant_id
    )
    student = (await db.execute(student_stmt)).scalar_one_or_none()
    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Student not found"}},
        )

    total_paid = await _total_paid(invoice_id, current_user.tenant_id, db)
    institution_name = await get_institution_name(current_user.tenant_id, db)
    pdf_bytes = render_fee_receipt(
        institution_name=institution_name,
        student_name=student.full_name,
        admission_number=student.admission_number,
        invoice_number=invoice.invoice_number,
        payment_amount=payment.amount,
        payment_date=payment.payment_date,
        payment_method=payment.method.value,
        reference_number=payment.reference_number,
        invoice_amount=invoice.amount,
        total_paid=total_paid,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="receipt-{invoice.invoice_number}.pdf"'
        },
    )
