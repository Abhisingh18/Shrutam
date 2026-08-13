import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    visiting = "visiting"
    contract = "contract"


class FacultyStatus(str, enum.Enum):
    active = "active"
    on_leave = "on_leave"
    resigned = "resigned"
    retired = "retired"


class Faculty(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """Core faculty profile — docs/03-database-design.md §5.2. This wave only builds
    the primary `faculty` table; faculty_attendance/leaves/payroll follow in a later
    wave."""

    __tablename__ = "faculty"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_faculty_tenant_email"),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    designation: Mapped[str] = mapped_column(String(128), nullable=False)
    employment_type: Mapped[EmploymentType] = mapped_column(
        Enum(EmploymentType, name="faculty_employment_type"),
        default=EmploymentType.full_time,
        nullable=False,
    )
    joining_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[FacultyStatus] = mapped_column(
        Enum(FacultyStatus, name="faculty_status"), default=FacultyStatus.active, nullable=False
    )
