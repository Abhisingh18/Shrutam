"""rls policy for hostel complaints

Revision ID: 168fa0eddc8d
Revises: 0033367a8462
Create Date: 2026-08-22 04:10:15.000000

Extends tenant isolation (see 8b5837db9226/0ccc4a4f8c53/a5ad6ac28c87/
9423198580ac/01c702282dda) to the hostel_complaints table.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "168fa0eddc8d"
down_revision: Union[str, None] = "0033367a8462"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE = "hostel_complaints"
TENANT_GUC_EXPR = "NULLIF(current_setting('app.current_tenant_id', true), '')::uuid"


def upgrade() -> None:
    op.execute(f"ALTER TABLE {TABLE} ENABLE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {TABLE} FORCE ROW LEVEL SECURITY")
    op.execute(
        f"""
        CREATE POLICY tenant_isolation ON {TABLE}
        USING (tenant_id = {TENANT_GUC_EXPR})
        WITH CHECK (tenant_id = {TENANT_GUC_EXPR})
        """
    )
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {TABLE} TO sutram_app")


def downgrade() -> None:
    op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {TABLE}")
    op.execute(f"ALTER TABLE {TABLE} NO FORCE ROW LEVEL SECURITY")
    op.execute(f"ALTER TABLE {TABLE} DISABLE ROW LEVEL SECURITY")
