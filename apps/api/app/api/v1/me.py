"""
Self-service endpoints for the `student` and `parent` roles.

Unlike every other router, these are NOT gated by `require_permission()` —
students and parents are deliberately granted zero entries in
scripts/seed_platform.py's role-permission matrix (see the comment there),
because the RBAC model is role-level, not row-level. A blanket
`students:profile:read` grant for "student" would let any student browse
every other student's record. Instead, every endpoint here resolves the
caller's OWN linked Student row(s) — via `Student.user_id` for a student,
or via `Guardian.user_id` -> `StudentGuardian` for a parent — and 403s on
any `student_id` that doesn't resolve to one of those rows. That resolution
*is* the security boundary for this router.
"""
import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.examinations import _student_report_card_data
from app.core.db import get_tenant_db
from app.core.institution import get_institution_name
from app.core.pdf import render_fee_receipt, render_id_card, render_report_card
from app.core.permissions import CurrentUser, get_current_user
from app.models.attendance import AttendanceRecord
from app.models.examination import Exam, ExamMark, ExamStatus
from app.models.finance import Invoice, Payment
from app.models.hostel import HostelComplaint, RoomAllocation, RoomAllocationStatus
from app.models.student import Guardian, Student, StudentGuardian
from app.schemas.attendance import AttendanceRecordRead
from app.schemas.examination import StudentCGPAResponse
from app.schemas.finance import InvoiceRead, PaymentRead
from app.schemas.hostel import HostelComplaintCreate, HostelComplaintRead
from app.schemas.me import MyExamResultRead, MyResultsResponse
from app.schemas.student import StudentRead

router = APIRouter(prefix="/me", tags=["me"])


async def _authorized_student_ids(current_user: CurrentUser, db: AsyncSession) -> list[uuid.UUID]:
    """The set of student_ids this caller is allowed to see — themselves if
    they're a student, or their linked children if they're a parent."""
    if current_user.role_slug == "student":
        stmt = select(Student.id).where(
            Student.tenant_id == current_user.tenant_id,
            Student.user_id == current_user.user_id,
            Student.deleted_at.is_(None),
        )
        return list((await db.execute(stmt)).scalars().all())

    if current_user.role_slug == "parent":
        stmt = (
            select(StudentGuardian.student_id)
            .join(Guardian, Guardian.id == StudentGuardian.guardian_id)
            .where(
                Guardian.tenant_id == current_user.tenant_id,
                Guardian.user_id == current_user.user_id,
            )
        )
        return list((await db.execute(stmt)).scalars().all())

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "error": {
                "code": "not_a_student_or_parent",
                "message": "This endpoint is only for the student and parent roles.",
            }
        },
    )


async def _resolve_student_id(
    current_user: CurrentUser, db: AsyncSession, requested: uuid.UUID | None
) -> uuid.UUID:
    """Validates (or defaults) `requested` against the caller's own authorized
    student_ids — never trusts the caller-supplied id on its own."""
    allowed = await _authorized_student_ids(current_user, db)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "no_linked_student",
                    "message": "Your account isn't linked to a student record yet.",
                }
            },
        )
    if requested is None:
        if len(allowed) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "student_id_required",
                        "message": "You have multiple children — specify ?student_id=.",
                    }
                },
            )
        return allowed[0]
    if requested not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "not_your_student",
                    "message": "This student record isn't linked to your account.",
                }
            },
        )
    return requested


@router.get("/children", response_model=list[StudentRead])
async def my_children(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[StudentRead]:
    """For `student`, this returns their own single-item profile too — the
    frontend treats "my linked students" uniformly regardless of role."""
    student_ids = await _authorized_student_ids(current_user, db)
    if not student_ids:
        return []
    stmt = select(Student).where(Student.id.in_(student_ids), Student.deleted_at.is_(None))
    students = (await db.execute(stmt)).scalars().all()
    return [StudentRead.model_validate(s) for s in students]


@router.get("/attendance", response_model=list[AttendanceRecordRead])
async def my_attendance(
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[AttendanceRecordRead]:
    resolved_id = await _resolve_student_id(current_user, db, student_id)
    stmt = (
        select(AttendanceRecord)
        .where(
            AttendanceRecord.tenant_id == current_user.tenant_id,
            AttendanceRecord.student_id == resolved_id,
            AttendanceRecord.deleted_at.is_(None),
        )
        .order_by(AttendanceRecord.attendance_date.desc())
        .limit(90)
    )
    records = (await db.execute(stmt)).scalars().all()
    return [AttendanceRecordRead.model_validate(r) for r in records]


@router.get("/invoices", response_model=list[InvoiceRead])
async def my_invoices(
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[InvoiceRead]:
    resolved_id = await _resolve_student_id(current_user, db, student_id)
    stmt = (
        select(Invoice)
        .where(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.student_id == resolved_id,
            Invoice.deleted_at.is_(None),
        )
        .order_by(Invoice.due_date.desc())
    )
    invoices = (await db.execute(stmt)).scalars().all()
    return [InvoiceRead.model_validate(i) for i in invoices]


@router.get("/results", response_model=MyResultsResponse)
async def my_results(
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> MyResultsResponse:
    resolved_id = await _resolve_student_id(current_user, db, student_id)

    marks_stmt = (
        select(ExamMark, Exam.name, Exam.exam_type, Exam.max_marks)
        .join(Exam, Exam.id == ExamMark.exam_id)
        .where(
            ExamMark.tenant_id == current_user.tenant_id,
            ExamMark.student_id == resolved_id,
            ExamMark.deleted_at.is_(None),
            Exam.status == ExamStatus.results_published,
        )
        .order_by(Exam.start_date.desc())
    )
    rows = (await db.execute(marks_stmt)).all()
    results = [
        MyExamResultRead(
            exam_id=mark.exam_id,
            exam_name=exam_name,
            exam_type=exam_type,
            max_marks=max_marks,
            marks_obtained=mark.marks_obtained,
            grade=mark.grade,
            grade_point=mark.grade_point,
        )
        for mark, exam_name, exam_type, max_marks in rows
    ]

    weighted = [(r.grade_point, r.max_marks) for r in results if r.grade_point is not None]
    cgpa = None
    if weighted:
        total_weight = sum(w for _, w in weighted)
        cgpa = round(sum(gp * w for gp, w in weighted) / total_weight, 2) if total_weight else None

    return MyResultsResponse(
        results=results,
        cgpa=StudentCGPAResponse(
            student_id=resolved_id, cgpa=cgpa, exams_graded=len(weighted)
        ),
    )


@router.get("/id-card.pdf")
async def my_id_card(
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    resolved_id = await _resolve_student_id(current_user, db, student_id)
    student_stmt = select(Student).where(
        Student.id == resolved_id, Student.tenant_id == current_user.tenant_id
    )
    student = (await db.execute(student_stmt)).scalar_one()
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


@router.get("/report-card.pdf")
async def my_report_card(
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    resolved_id = await _resolve_student_id(current_user, db, student_id)
    student, results, cgpa = await _student_report_card_data(
        resolved_id, current_user.tenant_id, db
    )
    institution_name = await get_institution_name(current_user.tenant_id, db)
    pdf_bytes = render_report_card(
        institution_name=institution_name,
        student_name=student.full_name,
        admission_number=student.admission_number,
        results=results,
        cgpa=cgpa,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="report-card-{student.admission_number}.pdf"'
        },
    )


@router.get("/invoices/{invoice_id}/payments", response_model=list[PaymentRead])
async def my_invoice_payments(
    invoice_id: uuid.UUID,
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[PaymentRead]:
    resolved_id = await _resolve_student_id(current_user, db, student_id)
    invoice_stmt = select(Invoice.id).where(
        Invoice.id == invoice_id,
        Invoice.student_id == resolved_id,
        Invoice.tenant_id == current_user.tenant_id,
        Invoice.deleted_at.is_(None),
    )
    if (await db.execute(invoice_stmt)).scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Invoice not found"}},
        )

    payments_stmt = select(Payment).where(
        Payment.invoice_id == invoice_id,
        Payment.tenant_id == current_user.tenant_id,
        Payment.deleted_at.is_(None),
    )
    payments = (await db.execute(payments_stmt)).scalars().all()
    return [PaymentRead.model_validate(p) for p in payments]


@router.get("/invoices/{invoice_id}/payments/{payment_id}/receipt.pdf")
async def my_payment_receipt(
    invoice_id: uuid.UUID,
    payment_id: uuid.UUID,
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    resolved_id = await _resolve_student_id(current_user, db, student_id)

    invoice_stmt = select(Invoice).where(
        Invoice.id == invoice_id,
        Invoice.student_id == resolved_id,
        Invoice.tenant_id == current_user.tenant_id,
        Invoice.deleted_at.is_(None),
    )
    invoice = (await db.execute(invoice_stmt)).scalar_one_or_none()
    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Invoice not found"}},
        )

    payment_stmt = select(Payment).where(
        Payment.id == payment_id,
        Payment.invoice_id == invoice_id,
        Payment.tenant_id == current_user.tenant_id,
        Payment.deleted_at.is_(None),
    )
    payment = (await db.execute(payment_stmt)).scalar_one_or_none()
    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Payment not found"}},
        )

    student_stmt = select(Student).where(Student.id == resolved_id)
    student = (await db.execute(student_stmt)).scalar_one()

    paid_stmt = select(Payment).where(
        Payment.invoice_id == invoice_id,
        Payment.tenant_id == current_user.tenant_id,
        Payment.deleted_at.is_(None),
    )
    all_payments = (await db.execute(paid_stmt)).scalars().all()
    total_paid = sum((p.amount for p in all_payments), Decimal("0"))

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


class MyComplaintCreate(BaseModel):
    category: str = Field(pattern="^(electrical|plumbing|furniture|cleanliness|internet|other)$")
    description: str = Field(min_length=1, max_length=2000)


@router.get("/hostel-complaints", response_model=list[HostelComplaintRead])
async def my_hostel_complaints(
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[HostelComplaintRead]:
    resolved_id = await _resolve_student_id(current_user, db, student_id)
    stmt = (
        select(HostelComplaint)
        .where(
            HostelComplaint.tenant_id == current_user.tenant_id,
            HostelComplaint.student_id == resolved_id,
            HostelComplaint.deleted_at.is_(None),
        )
        .order_by(HostelComplaint.raised_date.desc())
    )
    complaints = (await db.execute(stmt)).scalars().all()
    return [HostelComplaintRead.model_validate(c) for c in complaints]


@router.post(
    "/hostel-complaints", response_model=HostelComplaintRead, status_code=status.HTTP_201_CREATED
)
async def raise_hostel_complaint(
    body: MyComplaintCreate,
    student_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_tenant_db),
) -> HostelComplaintRead:
    """The room is derived from the caller's own active room allocation —
    never trusted from the request body — so a student can't file a
    complaint against a room they aren't staying in."""
    resolved_id = await _resolve_student_id(current_user, db, student_id)

    allocation_stmt = select(RoomAllocation).where(
        RoomAllocation.tenant_id == current_user.tenant_id,
        RoomAllocation.student_id == resolved_id,
        RoomAllocation.status == RoomAllocationStatus.active,
        RoomAllocation.deleted_at.is_(None),
    )
    allocation = (await db.execute(allocation_stmt)).scalar_one_or_none()
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "no_active_allocation",
                    "message": "You don't have an active hostel room allocation.",
                }
            },
        )

    complaint = HostelComplaint(
        tenant_id=current_user.tenant_id,
        room_id=allocation.room_id,
        student_id=resolved_id,
        category=body.category,
        description=body.description,
        raised_date=date.today(),
    )
    db.add(complaint)
    await db.flush()
    response = HostelComplaintRead.model_validate(complaint)
    await db.commit()
    return response
