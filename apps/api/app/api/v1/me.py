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

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, get_current_user
from app.models.attendance import AttendanceRecord
from app.models.examination import Exam, ExamMark, ExamStatus
from app.models.finance import Invoice
from app.models.student import Guardian, Student, StudentGuardian
from app.schemas.attendance import AttendanceRecordRead
from app.schemas.examination import StudentCGPAResponse
from app.schemas.finance import InvoiceRead
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
