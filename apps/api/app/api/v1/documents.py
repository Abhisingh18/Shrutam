import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.documents import Document, DocumentCategory, DocumentOwnerType
from app.schemas.documents import DocumentListResponse, DocumentRead, PaginationMeta

router = APIRouter(prefix="/documents", tags=["documents"])

# apps/api/uploads/ — local-disk dev-mode backing store. No cloud object storage is
# configured yet; swap this out for S3/GCS-backed storage behind the same interface
# when one is wired up.
UPLOAD_ROOT = Path(__file__).resolve().parents[3] / "uploads"

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB


def _bad_request(code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={"error": {"code": code, "message": message}},
    )


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    owner_type: str = Form(...),
    owner_id: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_permission("documents:file:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> DocumentRead:
    if owner_type not in {member.value for member in DocumentOwnerType}:
        raise _bad_request("invalid_owner_type", "owner_type must be one of student, faculty")
    if category not in {member.value for member in DocumentCategory}:
        raise _bad_request(
            "invalid_category", "category must be one of photo, id_proof, certificate, other"
        )
    try:
        owner_uuid = uuid.UUID(owner_id)
    except ValueError as exc:
        raise _bad_request("invalid_owner_id", "owner_id must be a valid UUID") from exc

    # file.size is populated by Starlette from the multipart part when available;
    # fall back to reading the body and checking its length otherwise.
    if file.size is not None and file.size > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"error": {"code": "file_too_large", "message": "File exceeds 10MB limit"}},
        )
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={"error": {"code": "file_too_large", "message": "File exceeds 10MB limit"}},
        )

    original_name = file.filename or "upload"
    stored_name = f"{uuid.uuid4()}_{original_name}"
    relative_path = Path(str(current_user.tenant_id)) / owner_type / owner_id / stored_name
    absolute_path = UPLOAD_ROOT / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(contents)

    document = Document(
        tenant_id=current_user.tenant_id,
        owner_type=owner_type,
        owner_id=owner_uuid,
        category=category,
        file_name=original_name,
        storage_path=str(relative_path).replace("\\", "/"),
        content_type=file.content_type or "application/octet-stream",
        size_bytes=len(contents),
        uploaded_by_user_id=current_user.user_id,
    )
    db.add(document)
    # Flush (not commit) so RETURNING populates server defaults while the RLS
    # session GUC set by get_tenant_db is still in scope for this transaction —
    # see app/api/v1/students.py for the same pattern.
    await db.flush()
    response = DocumentRead.model_validate(document)
    await db.commit()
    return response


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    owner_type: str = Query(...),
    owner_id: uuid.UUID = Query(...),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("documents:file:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> DocumentListResponse:
    if owner_type not in {member.value for member in DocumentOwnerType}:
        raise _bad_request("invalid_owner_type", "owner_type must be one of student, faculty")

    base_filters = (
        Document.tenant_id == current_user.tenant_id,
        Document.owner_type == owner_type,
        Document.owner_id == owner_id,
        Document.deleted_at.is_(None),
    )
    count_stmt = select(func.count()).select_from(Document).where(*base_filters)
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Document)
        .where(*base_filters)
        .order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    documents = (await db.execute(stmt)).scalars().all()

    return DocumentListResponse(
        data=[DocumentRead.model_validate(d) for d in documents],
        meta=PaginationMeta(page=page, page_size=page_size, total=total),
    )


async def _get_document_or_404(
    document_id: uuid.UUID, tenant_id: uuid.UUID, db: AsyncSession
) -> Document:
    stmt = select(Document).where(
        Document.id == document_id,
        Document.tenant_id == tenant_id,
        Document.deleted_at.is_(None),
    )
    document = (await db.execute(stmt)).scalar_one_or_none()
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "not_found", "message": "Document not found"}},
        )
    return document


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("documents:file:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> FileResponse:
    document = await _get_document_or_404(document_id, current_user.tenant_id, db)
    absolute_path = UPLOAD_ROOT / document.storage_path
    if not absolute_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "file_missing", "message": "File not found on disk"}},
        )
    return FileResponse(
        path=absolute_path,
        media_type=document.content_type,
        filename=document.file_name,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("documents:file:delete")),
    db: AsyncSession = Depends(get_tenant_db),
) -> None:
    document = await _get_document_or_404(document_id, current_user.tenant_id, db)
    document.deleted_at = datetime.now(timezone.utc)
    absolute_path = UPLOAD_ROOT / document.storage_path
    try:
        absolute_path.unlink(missing_ok=True)
    except OSError:
        pass
    await db.commit()
