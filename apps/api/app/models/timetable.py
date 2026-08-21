import enum
import uuid
from datetime import time

from sqlalchemy import Enum, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class DayOfWeek(str, enum.Enum):
    monday = "monday"
    tuesday = "tuesday"
    wednesday = "wednesday"
    thursday = "thursday"
    friday = "friday"
    saturday = "saturday"
    sunday = "sunday"


class TimetableSlot(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """One scheduled period for a section — docs/03-database-design.md conventions.
    Overlap conflicts (same section/day, same faculty/day) are enforced at the API
    layer in app/api/v1/timetable.py, not via a DB constraint (Postgres has no
    portable range-overlap unique constraint without btree_gist)."""

    __tablename__ = "timetable_slots"

    section_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sections.id"), nullable=False, index=True
    )
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True
    )
    faculty_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("faculty.id"), nullable=True
    )
    day_of_week: Mapped[DayOfWeek] = mapped_column(
        Enum(DayOfWeek, name="timetable_day_of_week"), nullable=False
    )
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    room: Mapped[str | None] = mapped_column(String(64), nullable=True)
