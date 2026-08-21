import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_tenant_db
from app.core.permissions import CurrentUser, require_permission
from app.models.student import Gender, Student

router = APIRouter(prefix="/students", tags=["students-bulk"])

MAX_IMPORT_ROWS = 2000
_VALID_GENDERS = {g.value for g in Gender}


class BulkImportError(BaseModel):
    row: int
    message: str


class BulkImportResult(BaseModel):
    created: int
    skipped_duplicates: int
    errors: list[BulkImportError]


@router.post("/bulk-import", response_model=BulkImportResult)
async def bulk_import_students(
    file: UploadFile,
    current_user: CurrentUser = Depends(require_permission("students:profile:write")),
    db: AsyncSession = Depends(get_tenant_db),
) -> BulkImportResult:
    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_encoding", "message": "File must be UTF-8 encoded CSV"}},
        ) from exc

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if len(rows) > MAX_IMPORT_ROWS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "too_many_rows",
                    "message": f"CSV has {len(rows)} rows; maximum is {MAX_IMPORT_ROWS}",
                }
            },
        )

    # Pre-fetch existing admission numbers for this tenant so duplicate checks
    # (and duplicates introduced within the same file) don't require a query per row.
    existing_stmt = select(Student.admission_number).where(
        Student.tenant_id == current_user.tenant_id, Student.deleted_at.is_(None)
    )
    existing_numbers = {row for row in (await db.execute(existing_stmt)).scalars().all()}

    created = 0
    skipped_duplicates = 0
    errors: list[BulkImportError] = []

    for idx, row in enumerate(rows, start=1):
        admission_number = (row.get("admission_number") or "").strip()
        full_name = (row.get("full_name") or "").strip()

        if not admission_number or not full_name:
            errors.append(
                BulkImportError(row=idx, message="admission_number and full_name are required")
            )
            continue

        gender_raw = (row.get("gender") or "").strip()
        gender: str | None = None
        if gender_raw:
            if gender_raw not in _VALID_GENDERS:
                errors.append(
                    BulkImportError(
                        row=idx,
                        message=f"Invalid gender '{gender_raw}'; expected one of {sorted(_VALID_GENDERS)}",
                    )
                )
                continue
            gender = gender_raw

        dob_raw = (row.get("date_of_birth") or "").strip()
        dob: date | None = None
        if dob_raw:
            try:
                dob = date.fromisoformat(dob_raw)
            except ValueError:
                errors.append(
                    BulkImportError(
                        row=idx, message=f"Invalid date_of_birth '{dob_raw}'; expected ISO format YYYY-MM-DD"
                    )
                )
                continue

        if admission_number in existing_numbers:
            skipped_duplicates += 1
            continue

        student = Student(
            tenant_id=current_user.tenant_id,
            admission_number=admission_number,
            full_name=full_name,
            email=(row.get("email") or "").strip() or None,
            phone=(row.get("phone") or "").strip() or None,
            gender=gender,
            date_of_birth=dob,
        )
        db.add(student)
        existing_numbers.add(admission_number)
        created += 1

    await db.flush()
    await db.commit()

    return BulkImportResult(created=created, skipped_duplicates=skipped_duplicates, errors=errors)


@router.get("/export")
async def export_students(
    current_user: CurrentUser = Depends(require_permission("students:profile:read")),
    db: AsyncSession = Depends(get_tenant_db),
) -> Response:
    stmt = (
        select(Student)
        .where(Student.tenant_id == current_user.tenant_id, Student.deleted_at.is_(None))
        .order_by(Student.full_name)
    )
    students = (await db.execute(stmt)).scalars().all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["admission_number", "full_name", "email", "phone", "gender", "date_of_birth", "status"])
    for s in students:
        writer.writerow(
            [
                s.admission_number,
                s.full_name,
                s.email or "",
                s.phone or "",
                s.gender.value if isinstance(s.gender, Gender) else (s.gender or ""),
                s.date_of_birth.isoformat() if isinstance(s.date_of_birth, date) else (s.date_of_birth or ""),
                s.status.value if hasattr(s.status, "value") else s.status,
            ]
        )

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="students.csv"'},
    )
