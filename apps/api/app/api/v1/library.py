import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.library import Book, BookIssue, BookIssueStatus
from app.schemas.library import (
    BookCreate,
    BookIssueCreate,
    BookIssueListResponse,
    BookIssueRead,
    BookListResponse,
    BookRead,
    BookUpdate,
    PaginationMeta,
)

router = APIRouter(prefix="/library", tags=["library"])


# --- Book issues (declared ahead of /{book_id} so "issues" isn't swallowed as a book id) ---


@router.get("/issues", response_model=BookIssueListResponse)
async def list_book_issues(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    book_id: uuid.UUID | None = Query(default=None),
    student_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    current_user: CurrentUser = Depends(require_permission("library:issue:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BookIssueListResponse:
    stmt = select(BookIssue).where(
        BookIssue.tenant_id == current_user.tenant_id, BookIssue.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(BookIssue).where(
        BookIssue.tenant_id == current_user.tenant_id, BookIssue.deleted_at.is_(None)
    )
    if book_id is not None:
        stmt = stmt.where(BookIssue.book_id == book_id)
        count_stmt = count_stmt.where(BookIssue.book_id == book_id)
    if student_id is not None:
        stmt = stmt.where(BookIssue.student_id == student_id)
        count_stmt = count_stmt.where(BookIssue.student_id == student_id)
    if status_filter:
        stmt = stmt.where(BookIssue.status == status_filter)
        count_stmt = count_stmt.where(BookIssue.status == status_filter)

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = (
        stmt.order_by(BookIssue.issued_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    issues = (await db.execute(stmt)).scalars().all()

    return BookIssueListResponse(
        data=[BookIssueRead.model_validate(i) for i in issues],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


async def _get_book_or_404(book_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession) -> Book:
    stmt = select(Book).where(
        Book.id == book_id, Book.tenant_id == tenant_id, Book.deleted_at.is_(None)
    )
    book = (await db.execute(stmt)).scalar_one_or_none()
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Book not found"}},
        )
    return book


async def _get_book_issue_or_404(
    issue_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> BookIssue:
    stmt = select(BookIssue).where(
        BookIssue.id == issue_id,
        BookIssue.tenant_id == tenant_id,
        BookIssue.deleted_at.is_(None),
    )
    issue = (await db.execute(stmt)).scalar_one_or_none()
    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Book issue not found"}},
        )
    return issue


@router.post("/issues", response_model=BookIssueRead, status_code=status.HTTP_201_CREATED)
async def create_book_issue(
    body: BookIssueCreate,
    current_user: CurrentUser = Depends(require_permission("library:issue:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BookIssueRead:
    book = await _get_book_or_404(body.book_id, current_user.tenant_id, db)
    if book.available_copies <= 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "no_copies_available", "message": "No copies available to issue"}},
        )

    issue = BookIssue(
        tenant_id=current_user.tenant_id,
        book_id=body.book_id,
        student_id=body.student_id,
        issued_date=date.today(),
        due_date=body.due_date,
        status=BookIssueStatus.issued,
    )
    book.available_copies -= 1
    db.add(issue)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for *this* transaction —
    # see app/api/v1/students.py create_student for the full rationale.
    await db.flush()
    response = BookIssueRead.model_validate(issue)
    await db.commit()
    return response


@router.post("/issues/{issue_id}/return", response_model=BookIssueRead)
async def return_book_issue(
    issue_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("library:issue:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BookIssueRead:
    issue = await _get_book_issue_or_404(issue_id, current_user.tenant_id, db)
    book = await _get_book_or_404(issue.book_id, current_user.tenant_id, db)

    issue.returned_date = date.today()
    issue.status = BookIssueStatus.returned
    book.available_copies += 1

    await db.flush()
    response = BookIssueRead.model_validate(issue)
    await db.commit()
    return response


# --- Book CRUD ---


@router.get("", response_model=BookListResponse)
async def list_books(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    current_user: CurrentUser = Depends(require_permission("library:book:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BookListResponse:
    stmt = select(Book).where(
        Book.tenant_id == current_user.tenant_id, Book.deleted_at.is_(None)
    )
    count_stmt = select(func.count()).select_from(Book).where(
        Book.tenant_id == current_user.tenant_id, Book.deleted_at.is_(None)
    )
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(Book.title.ilike(pattern))
        count_stmt = count_stmt.where(Book.title.ilike(pattern))

    total = (await db.execute(count_stmt)).scalar_one()
    stmt = stmt.order_by(Book.title).offset((page - 1) * page_size).limit(page_size)
    books = (await db.execute(stmt)).scalars().all()

    return BookListResponse(
        data=[BookRead.model_validate(b) for b in books],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


@router.post("", response_model=BookRead, status_code=status.HTTP_201_CREATED)
async def create_book(
    body: BookCreate,
    current_user: CurrentUser = Depends(require_permission("library:book:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BookRead:
    book = Book(
        tenant_id=current_user.tenant_id,
        **body.model_dump(),
        available_copies=body.total_copies,
    )
    db.add(book)
    await db.flush()
    response = BookRead.model_validate(book)
    await db.commit()
    return response


@router.get("/{book_id}", response_model=BookRead)
async def get_book(
    book_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("library:book:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BookRead:
    book = await _get_book_or_404(book_id, current_user.tenant_id, db)
    return BookRead.model_validate(book)


@router.patch("/{book_id}", response_model=BookRead)
async def update_book(
    book_id: uuid.UUID,
    body: BookUpdate,
    current_user: CurrentUser = Depends(require_permission("library:book:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BookRead:
    book = await _get_book_or_404(book_id, current_user.tenant_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(book, field, value)
    await db.flush()
    response = BookRead.model_validate(book)
    await db.commit()
    return response


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("library:book:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    book = await _get_book_or_404(book_id, current_user.tenant_id, db)
    book.deleted_at = datetime.now(timezone.utc)
    await db.commit()
