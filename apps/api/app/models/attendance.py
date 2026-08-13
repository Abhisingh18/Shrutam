import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"
    excused = "excused"


class AttendanceRecord(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """One row per student per day — docs/03-database-design.md §5.1 `student_attendance`,
    docs/06-ux-flows.md §5.2 (Faculty mark-attendance-then-enter-marks flow)."""

    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "student_id", "attendance_date", name="uq_attendance_tenant_student_date"
        ),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendance_status"), nullable=False
    )
    marked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    remarks: Mapped[str | None] = mapped_column(String(512), nullable=True)
