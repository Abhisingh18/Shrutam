import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.grading import compute_grade
from app.core.permissions import CurrentUser, require_permission
from app.models.examination import Exam, ExamMark, ExamStatus
from app.models.student import Student
from app.schemas.examination import (
    ExamCreate,
    ExamListResponse,
    ExamMarkRead,
    ExamMarksBulkUpdateRequest,
    ExamRead,
    ExamUpdate,
    PaginationMeta,
    StudentCGPAResponse,
)

router = APIRouter(prefix="/examinations", tags=["examinations"])


@router.get("", response_model=ExamListResponse)
async def list_exams(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    current_user: CurrentUser = Depends(require_permission("exams:schedule:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ExamListResponse:
    stmt = select(Exam).where(
        Exam.tenant_id == current_user.tenant_id, Exam.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Exam).where(
        Exam.tenant_id == current_user.tenant_id, Exam.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Exam.name.ilike(pattern))
        count_stmt = count_stmt.where(Exam.name.ilike(pattern))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Exam.start_date.desc()).offset((page - 1) * page_size).limit(page_size)
    exams = (await db.execute(stmt)).scalars().all()

    return ExamListResponse(
        data=[ExamRead.model_validate(e) for e in exams],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=ExamRead, status_code=status.HTTP_201_CREATED)
async def create_exam(
    body: ExamCreate,
    current_user: CurrentUser = Depends(require_permission("exams:schedule:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ExamRead:
    exam = Exam(tenant_id=current_user.tenant_id, **body.model_dump())
    db.add(exam)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # `SET LOCAL`/`set_config(..., true)` resets on commit, so a refresh() after
    # commit() would run in a fresh, tenant-less transaction and be filtered out.
    await db.flush()
    response = ExamRead.model_validate(exam)
    await db.commit()
    return response


async def _get_exam_or_404(exam_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Exam:
    stmt = select(Exam).where(
        Exam.id == exam_id, Exam.tenant_id == tenant_id, Exam.deleted_at.is_(None)
    )
    exam = (await db.execute(stmt)).scalar_one_or_none()
    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Exam not found"}},
        )
    return exam


@router.get("/{exam_id}", response_model=ExamRead)
async def get_exam(
    exam_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("exams:schedule:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ExamRead:
    exam = await _get_exam_or_404(exam_id, current_user.tenant_id, db)
    return ExamRead.model_validate(exam)


@router.patch("/{exam_id}", response_model=ExamRead)
async def update_exam(
    exam_id: uuid.UUID,
    body: ExamUpdate,
    current_user: CurrentUser = Depends(require_permission("exams:schedule:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ExamRead:
    exam = await _get_exam_or_404(exam_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(exam, field, value)
    await db.flush()
    response = ExamRead.model_validate(exam)
    await db.commit()
    return response


@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("exams:schedule:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    exam = await _get_exam_or_404(exam_id, current_user.tenant_id, db)
    exam.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/{exam_id}/marks", response_model=list[ExamMarkRead])
async def list_exam_marks(
    exam_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("exams:schedule:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[ExamMarkRead]:
    # Confirms the exam exists (and belongs to this tenant) before returning marks.
    await _get_exam_or_404(exam_id, current_user.tenant_id, db)

    stmt = select(ExamMark).where(
        ExamMark.exam_id == exam_id,
        ExamMark.tenant_id == current_user.tenant_id,
        ExamMark.deleted_at.is_(None),
    )
    marks = (await db.execute(stmt)).scalars().all()
    return [ExamMarkRead.model_validate(m) for m in marks]


@router.put("/{exam_id}/marks", response_model=list[ExamMarkRead])
async def update_exam_marks(
    exam_id: uuid.UUID,
    body: ExamMarksBulkUpdateRequest,
    current_user: CurrentUser = Depends(require_permission("exams:marks:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> list[ExamMarkRead]:
    exam = await _get_exam_or_404(exam_id, current_user.tenant_id, db)

    updated: list[ExamMark] = []
    for entry in body.marks:
        stmt = select(ExamMark).where(
            ExamMark.tenant_id == current_user.tenant_id,
            ExamMark.exam_id == exam_id,
            ExamMark.student_id == entry.student_id,
            ExamMark.deleted_at.is_(None),
        )
        mark = (await db.execute(stmt)).scalar_one_or_none()
        if mark is None:
            mark = ExamMark(
                tenant_id=current_user.tenant_id,
                exam_id=exam_id,
                student_id=entry.student_id,
            )
            db.add(mark)

        mark.marks_obtained = entry.marks_obtained
        mark.remarks = entry.remarks
        if entry.marks_obtained is not None:
            # grade_point is always auto-derived from marks (it's what CGPA
            # aggregates) — grade is auto-derived too unless the caller
            # explicitly overrides the letter (e.g. a moderation bump),
            # which the underlying grade_point deliberately doesn't follow.
            computed_grade, computed_point = compute_grade(entry.marks_obtained, exam.max_marks)
            mark.grade = entry.grade if entry.grade is not None else computed_grade
            mark.grade_point = computed_point
        else:
            mark.grade = entry.grade
            mark.grade_point = None
        updated.append(mark)

    await db.flush()
    response = [ExamMarkRead.model_validate(m) for m in updated]
    await db.commit()
    return response


@router.get("/students/{student_id}/cgpa", response_model=StudentCGPAResponse)
async def get_student_cgpa(
    student_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("exams:schedule:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> StudentCGPAResponse:
    """
    Weighted by each exam's max_marks (a 100-mark final counts more than a
    20-mark quiz) rather than a flat average of grade points — a simple
    proxy for exam weight until Subject.credits-based weighting is wired up.
    """
    student_stmt = select(Student.id).where(
        Student.id == student_id,
        Student.tenant_id == current_user.tenant_id,
        Student.deleted_at.is_(None),
    )
    if (await db.execute(student_stmt)).scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Student not found"}},
        )

    rows_stmt = (
        select(ExamMark.grade_point, Exam.max_marks)
        .join(Exam, Exam.id == ExamMark.exam_id)
        .where(
            ExamMark.tenant_id == current_user.tenant_id,
            ExamMark.student_id == student_id,
            ExamMark.deleted_at.is_(None),
            ExamMark.grade_point.is_not(None),
        )
    )
    rows = (await db.execute(rows_stmt)).all()

    if not rows:
        return StudentCGPAResponse(student_id=student_id, cgpa=None, exams_graded=0)

    total_weight = sum(max_marks for _, max_marks in rows)
    weighted_sum = sum(float(grade_point) * max_marks for grade_point, max_marks in rows)
    cgpa = round(weighted_sum / total_weight, 2) if total_weight else None

    return StudentCGPAResponse(student_id=student_id, cgpa=cgpa, exams_graded=len(rows))


@router.post("/{exam_id}/publish", response_model=ExamRead)
async def publish_exam_results(
    exam_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("exams:results:publish")),
    db: AsyncSession = Depends(get_tenant_db),
) -> ExamRead:
    exam = await _get_exam_or_404(exam_id, current_user.tenant_id, db)
    exam.status = ExamStatus.results_published
    await db.flush()
    response = ExamRead.model_validate(exam)
    await db.commit()
    return response
