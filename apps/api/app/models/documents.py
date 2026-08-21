import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class DocumentOwnerType(str, enum.Enum):
    student = "student"
    faculty = "faculty"


class DocumentCategory(str, enum.Enum):
    photo = "photo"
    id_proof = "id_proof"
    certificate = "certificate"
    other = "other"


class Document(UUIDPrimaryKeyMixin, TimestampMixin, TenantScopedMixin, Base):
    """
    Polymorphic file attachment for a student or faculty record. `owner_id` has no
    FK constraint since it points at either `students` or `faculty` depending on
    `owner_type` — validated at the API layer instead (see app/api/v1/documents.py).
    """

    __tablename__ = "documents"

    owner_type: Mapped[DocumentOwnerType] = mapped_column(
        Enum(DocumentOwnerType, name="document_owner_type"), nullable=False
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    category: Mapped[DocumentCategory] = mapped_column(
        Enum(DocumentCategory, name="document_category"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Relative path under the local-disk uploads root, e.g.
    # "{tenant_id}/{owner_type}/{owner_id}/{uuid}_{filename}" — see
    # app/api/v1/documents.py for the base directory this is joined against.
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
