import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class PlanTier(str, enum.Enum):
    starter = "starter"
    growth = "growth"
    enterprise = "enterprise"


class IsolationMode(str, enum.Enum):
    shared = "shared"
    dedicated = "dedicated"


class TenantStatus(str, enum.Enum):
    trial = "trial"
    active = "active"
    suspended = "suspended"
    cancelled = "cancelled"


class Tenant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """The billing/account root. See docs/03-database-design.md §1 (multi-tenancy strategy)."""

    __tablename__ = "tenants"

    slug: Mapped[str] = mapped_column(String(63), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plan_tier: Mapped[PlanTier] = mapped_column(
        Enum(PlanTier, name="plan_tier"), default=PlanTier.starter, nullable=False
    )
    isolation_mode: Mapped[IsolationMode] = mapped_column(
        Enum(IsolationMode, name="isolation_mode"),
        default=IsolationMode.shared,
        nullable=False,
    )
    status: Mapped[TenantStatus] = mapped_column(
        Enum(TenantStatus, name="tenant_status"), default=TenantStatus.trial, nullable=False
    )
    custom_domain: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)

    institution: Mapped["Institution"] = relationship(back_populates="tenant", uselist=False)


class InstitutionType(str, enum.Enum):
    school = "school"
    college = "college"
    university = "university"
    coaching = "coaching"
    research_lab = "research_lab"


class Institution(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """Institution profile — docs/02-information-architecture.md Institution Setup Wizard."""

    __tablename__ = "institutions"

    tenant: Mapped["Tenant"] = relationship(back_populates="institution")

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    institution_type: Mapped[InstitutionType] = mapped_column(
        Enum(InstitutionType, name="institution_type"), nullable=False
    )
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    primary_color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)

    campuses: Mapped[list["Campus"]] = relationship(back_populates="institution")


class Campus(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "campuses"

    institution_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("institutions.id"), nullable=False, index=True
    )
    institution: Mapped["Institution"] = relationship(back_populates="campuses")

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_primary: Mapped[bool] = mapped_column(default=False, nullable=False)


class AcademicYear(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "academic_years"

    name: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. "2026-2027"
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)  # ISO date
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)
    is_current: Mapped[bool] = mapped_column(default=False, nullable=False)
