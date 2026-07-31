import enum
import uuid

from sqlalchemy import Date, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class AdmissionStatus(str, enum.Enum):
    submitted = "submitted"
    under_review = "under_review"
    accepted = "accepted"
    rejected = "rejected"
    converted = "converted"  # became a Student record — docs/06-ux-flows.md Admission Flow


class Admission(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "admissions"

    applicant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    applicant_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    applicant_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True
    )
    status: Mapped[AdmissionStatus] = mapped_column(
        Enum(AdmissionStatus, name="admission_status"),
        default=AdmissionStatus.submitted,
        nullable=False,
    )

    student: Mapped["Student"] = relationship(back_populates="admission", uselist=False)


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"


class StudentStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    graduated = "graduated"
    transferred = "transferred"
    expelled = "expelled"


class Student(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("tenant_id", "admission_number", name="uq_students_tenant_admission_no"),
    )

    admission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admissions.id"), nullable=True
    )
    admission: Mapped["Admission"] = relationship(back_populates="student")

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    campus_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campuses.id"), nullable=True
    )

    admission_number: Mapped[str] = mapped_column(String(32), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[str | None] = mapped_column(Date, nullable=True)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender, name="gender"), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[StudentStatus] = mapped_column(
        Enum(StudentStatus, name="student_status"), default=StudentStatus.active, nullable=False
    )

    guardians: Mapped[list["StudentGuardian"]] = relationship(back_populates="student")


class Guardian(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    __tablename__ = "guardians"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )


class GuardianRelation(str, enum.Enum):
    father = "father"
    mother = "mother"
    guardian = "guardian"
    other = "other"


class StudentGuardian(Base):
    __tablename__ = "student_guardians"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), primary_key=True
    )
    guardian_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("guardians.id"), primary_key=True
    )
    relation: Mapped[GuardianRelation] = mapped_column(
        Enum(GuardianRelation, name="guardian_relation"), nullable=False
    )
    is_primary_contact: Mapped[bool] = mapped_column(default=False, nullable=False)

    student: Mapped["Student"] = relationship(back_populates="guardians")
    guardian: Mapped["Guardian"] = relationship()
