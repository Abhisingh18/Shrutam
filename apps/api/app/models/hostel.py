"""Hostel module models — Hostels, Rooms, Room Allocations, and Complaints.

Mess planning and visitor logs are still out of scope and left for future work.
"""

import enum
import uuid

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Hostel(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "hostels"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    warden_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True
    )


class Room(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "rooms"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "hostel_id", "room_number", name="uq_rooms_tenant_hostel_room_number"
        ),
    )

    hostel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("hostels.id"), nullable=False, index=True
    )
    room_number: Mapped[str] = mapped_column(String(32), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    occupied_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class RoomAllocationStatus(str, enum.Enum):
    active = "active"
    vacated = "vacated"


class RoomAllocation(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "room_allocations"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    allocated_date: Mapped[Date] = mapped_column(Date, nullable=False)
    vacated_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    status: Mapped[RoomAllocationStatus] = mapped_column(
        Enum(RoomAllocationStatus, name="room_allocation_status"),
        default=RoomAllocationStatus.active,
        nullable=False,
    )


class ComplaintCategory(str, enum.Enum):
    electrical = "electrical"
    plumbing = "plumbing"
    furniture = "furniture"
    cleanliness = "cleanliness"
    internet = "internet"
    other = "other"


class ComplaintStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class HostelComplaint(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """Raised by a student against their allocated room; a warden works it to
    resolution. Raise-side lives on app/api/v1/me.py (self-scoped), resolve-side
    lives on app/api/v1/hostel.py (RBAC — hostel_warden/institution_admin)."""

    __tablename__ = "hostel_complaints"

    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    category: Mapped[ComplaintCategory] = mapped_column(
        Enum(ComplaintCategory, name="hostel_complaint_category"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ComplaintStatus] = mapped_column(
        Enum(ComplaintStatus, name="hostel_complaint_status"),
        default=ComplaintStatus.open,
        nullable=False,
    )
    raised_date: Mapped[Date] = mapped_column(Date, nullable=False)
    resolved_date: Mapped[Date | None] = mapped_column(Date, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
