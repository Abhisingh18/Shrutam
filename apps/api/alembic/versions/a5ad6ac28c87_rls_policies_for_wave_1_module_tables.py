"""rls policies for wave 1 module tables

Revision ID: a5ad6ac28c87
Revises: 89878682b498
Create Date: 2026-08-13 15:33:52.858765

Extends the tenant-isolation pattern from 8b5837db9226/0ccc4a4f8c53 (FORCE ROW
LEVEL SECURITY + NULLIF-guarded tenant GUC check) to every tenant-scoped table
added by the Academics, Faculty, Attendance, Examinations and Finance modules.
Without this, these tables would be readable/writable by `sutram_app` across
tenants — RLS is the non-bypassable backstop behind the app-layer tenant_id
filtering already present in each router (docs/03-database-design.md §1).
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a5ad6ac28c87"
down_revision: Union[str, None] = "89878682b498"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_TENANT_SCOPED_TABLES = [
    "departments",
    "programs",
    "subjects",
    "semesters",
    "sections",
    "faculty",
    "attendance_records",
    "exams",
    "exam_marks",
    "fee_structures",
    "invoices",
    "payments",
]

TENANT_GUC_EXPR = "NULLIF(current_setting('app.current_tenant_id', true), '')::uuid"


def upgrade() -> None:
    for table in NEW_TENANT_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (tenant_id = {TENANT_GUC_EXPR})
            WITH CHECK (tenant_id = {TENANT_GUC_EXPR})
            """
        )
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO sutram_app")


def downgrade() -> None:
    for table in NEW_TENANT_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
