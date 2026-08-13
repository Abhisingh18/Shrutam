from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.examination import Exam, ExamStatus
from app.models.faculty import Faculty
from app.models.finance import Invoice, InvoiceStatus, Payment
from app.models.student import Admission, AdmissionStatus, Student, StudentStatus
from app.schemas.analytics import AnalyticsSummary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    current_user: CurrentUser = Depends(require_permission("analytics:dashboard:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> AnalyticsSummary:
    tenant_id = current_user.tenant_id
    today = date.today()

    total_students_stmt = select(func.count()).select_from(Student).where(
        Student.tenant_id == tenant_id, Student.deleted_at.is_(None)
    )
    active_students_stmt = select(func.count()).select_from(Student).where(
        Student.tenant_id == tenant_id,
        Student.deleted_at.is_(None),
        Student.status == StudentStatus.active,
    )
    total_faculty_stmt = select(func.count()).select_from(Faculty).where(
        Faculty.tenant_id == tenant_id, Faculty.deleted_at.is_(None)
    )
    pending_admissions_stmt = select(func.count()).select_from(Admission).where(
        Admission.tenant_id == tenant_id,
        Admission.deleted_at.is_(None),
        Admission.status.in_([AdmissionStatus.submitted, AdmissionStatus.under_review]),
    )
    todays_attendance_total_stmt = select(func.count()).select_from(AttendanceRecord).where(
        AttendanceRecord.tenant_id == tenant_id,
        AttendanceRecord.deleted_at.is_(None),
        AttendanceRecord.attendance_date == today,
    )
    todays_attendance_present_stmt = select(func.count()).select_from(AttendanceRecord).where(
        AttendanceRecord.tenant_id == tenant_id,
        AttendanceRecord.deleted_at.is_(None),
        AttendanceRecord.attendance_date == today,
        AttendanceRecord.status == AttendanceStatus.present,
    )
    upcoming_exams_stmt = select(func.count()).select_from(Exam).where(
        Exam.tenant_id == tenant_id,
        Exam.deleted_at.is_(None),
        Exam.start_date >= today,
        Exam.status != ExamStatus.results_published,
    )
    pending_invoice_statuses = [
        InvoiceStatus.pending,
        InvoiceStatus.partially_paid,
        InvoiceStatus.overdue,
    ]
    pending_invoices_count_stmt = select(func.count()).select_from(Invoice).where(
        Invoice.tenant_id == tenant_id,
        Invoice.deleted_at.is_(None),
        Invoice.status.in_(pending_invoice_statuses),
    )
    pending_invoices_amount_stmt = select(func.coalesce(func.sum(Invoice.amount), 0)).where(
        Invoice.tenant_id == tenant_id,
        Invoice.deleted_at.is_(None),
        Invoice.status.in_(pending_invoice_statuses),
    )
    total_revenue_collected_stmt = select(func.coalesce(func.sum(Payment.amount), 0)).where(
        Payment.tenant_id == tenant_id,
        Payment.deleted_at.is_(None),
    )

    total_students = (await db.execute(total_students_stmt)).scalar_one()
    active_students = (await db.execute(active_students_stmt)).scalar_one()
    total_faculty = (await db.execute(total_faculty_stmt)).scalar_one()
    pending_admissions = (await db.execute(pending_admissions_stmt)).scalar_one()
    todays_attendance_total = (await db.execute(todays_attendance_total_stmt)).scalar_one()
    todays_attendance_present = (await db.execute(todays_attendance_present_stmt)).scalar_one()
    upcoming_exams = (await db.execute(upcoming_exams_stmt)).scalar_one()
    pending_invoices_count = (await db.execute(pending_invoices_count_stmt)).scalar_one()
    pending_invoices_amount: Decimal = (await db.execute(pending_invoices_amount_stmt)).scalar_one()
    total_revenue_collected: Decimal = (await db.execute(total_revenue_collected_stmt)).scalar_one()

    return AnalyticsSummary(
        total_students=total_students,
        active_students=active_students,
        total_faculty=total_faculty,
        pending_admissions=pending_admissions,
        todays_attendance_present=todays_attendance_present,
        todays_attendance_total=todays_attendance_total,
        upcoming_exams=upcoming_exams,
        pending_invoices_count=pending_invoices_count,
        pending_invoices_amount=str(pending_invoices_amount),
        total_revenue_collected=str(total_revenue_collected),
    )
