import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnnouncementBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=4000)
    audience: str = Field(
        default="all", pattern="^(all|students|faculty|parents|staff)$"
    )


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementRead(AnnouncementBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_by_user_id: uuid.UUID | None = None
    published_at: datetime | None = None
    created_at: datetime


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class AnnouncementListResponse(BaseModel):
    data: list[AnnouncementRead]
    meta: PaginationMeta
