import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, computed_field


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_type: str
    owner_id: uuid.UUID
    category: str
    file_name: str
    content_type: str
    size_bytes: int
    uploaded_by_user_id: uuid.UUID | None
    created_at: datetime

    @computed_field
    @property
    def download_url(self) -> str:
        return f"/api/v1/documents/{self.id}/download"


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class DocumentListResponse(BaseModel):
    data: list[DocumentRead]
    meta: PaginationMeta
