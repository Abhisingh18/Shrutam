"""rls policies for wave 2 module tables

Revision ID: 9423198580ac
Revises: cddd3045282c
Create Date: 2026-08-13 16:57:29.895434

Extends tenant isolation (see 8b5837db9226/0ccc4a4f8c53/a5ad6ac28c87) to the
tables added by the Library, Hostel, Transport, HR and Communication modules.
Analytics adds no new tables, so nothing to do for it here.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9423198580ac"
down_revision: Union[str, None] = "cddd3045282c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_TENANT_SCOPED_TABLES = [
    "books",
    "book_issues",
    "hostels",
    "rooms",
    "room_allocations",
    "vehicles",
    "routes",
    "transport_passes",
    "employees",
    "leave_requests",
    "announcements",
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
