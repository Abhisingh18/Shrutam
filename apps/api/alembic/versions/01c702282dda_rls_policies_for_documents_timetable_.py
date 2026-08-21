"""rls policies for documents timetable notifications

Revision ID: 01c702282dda
Revises: e31807f8d027
Create Date: 2026-08-22 02:27:43.793750

Extends tenant isolation (see 8b5837db9226/0ccc4a4f8c53/a5ad6ac28c87/
9423198580ac) to the tables added by the Documents, Timetable and
Notifications modules.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "01c702282dda"
down_revision: Union[str, None] = "e31807f8d027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_TENANT_SCOPED_TABLES = [
    "documents",
    "timetable_slots",
    "notifications",
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
