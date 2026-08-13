import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ExamStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    ongoing = "ongoing"
    completed = "completed"
    results_published = "results_published"


class Exam(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """Examinations module — this wave covers Exam CRUD + marks entry only.
    Formal exam_schedules (per-subject sittings), hall tickets, grading-rules-driven
    grade computation, CGPA aggregation, and transcripts are future work — see
    docs/03-database-design.md §5.4 and docs/06-ux-flows.md §4.4 for the full model."""

    __tablename__ = "exams"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_type: Mapped[str] = mapped_column(String(64), nullable=False)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    max_marks: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    status: Mapped[ExamStatus] = mapped_column(
        Enum(ExamStatus, name="exam_status"), default=ExamStatus.draft, nullable=False
    )


class ExamMark(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """One row per student per exam. Absence of a row means marks not yet entered —
    rows are only created via the marks bulk-update endpoint, never auto-created."""

    __tablename__ = "exam_marks"
    __table_args__ = (
        UniqueConstraint("tenant_id", "exam_id", "student_id", name="uq_exam_marks_tenant_exam_student"),
    )

    exam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False
    )
    marks_obtained: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(8), nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(500), nullable=True)
