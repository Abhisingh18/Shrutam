"""Transport module models — Vehicles, Routes, and Transport Passes.

Scope for this wave is limited to vehicles + routes + passes (a student assigned
to a route). GPS tracking and driver attendance are out of scope and left for
future work.
"""

import enum
import uuid

from sqlalchemy import Date, Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Vehicle(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "registration_number", name="uq_vehicles_tenant_registration_number"
        ),
    )

    registration_number: Mapped[str] = mapped_column(String(32), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(32), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    driver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    driver_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Route(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "routes"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=True
    )
    # Comma-separated stop names is sufficient for this wave — not a separate table.
    stops: Mapped[str | None] = mapped_column(String, nullable=True)


class TransportPassStatus(str, enum.Enum):
    active = "active"
    expired = "expired"
    cancelled = "cancelled"


class TransportPass(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "transport_passes"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("routes.id"), nullable=False, index=True
    )
    valid_from: Mapped[Date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[Date | None] = mapped_column(Date, nullable=True)
    status: Mapped[TransportPassStatus] = mapped_column(
        Enum(TransportPassStatus, name="transport_pass_status"),
        default=TransportPassStatus.active,
        nullable=False,
    )
