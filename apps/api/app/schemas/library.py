import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class BookBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    isbn: str | None = None
    total_copies: int = Field(ge=0)
    category: str | None = None


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    isbn: str | None = None
    total_copies: int | None = Field(default=None, ge=0)
    available_copies: int | None = Field(default=None, ge=0)
    category: str | None = None


class BookRead(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    available_copies: int


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class BookListResponse(BaseModel):
    data: list[BookRead]
    meta: PaginationMeta


class BookIssueCreate(BaseModel):
    book_id: uuid.UUID
    student_id: uuid.UUID
    due_date: date


class BookIssueRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    book_id: uuid.UUID
    student_id: uuid.UUID
    issued_date: date
    due_date: date
    returned_date: date | None = None
    status: str


class BookIssueListResponse(BaseModel):
    data: list[BookIssueRead]
    meta: PaginationMeta
