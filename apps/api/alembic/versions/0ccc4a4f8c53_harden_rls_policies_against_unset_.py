"""harden rls policies against unset tenant guc

Revision ID: 0ccc4a4f8c53
Revises: 8b5837db9226
Create Date: 2026-07-31 15:20:37.326425

Postgres custom GUCs set via `set_config(name, value, true)` (transaction-local,
equivalent to SET LOCAL) revert to an empty string — not NULL — once the
placeholder has been touched and the transaction commits. A bare
`current_setting(..., true)::uuid` then raises `invalid input syntax for type
uuid: ""` instead of cleanly denying the row. Wrapping in NULLIF makes an unset
tenant context evaluate to `tenant_id = NULL` (i.e. "deny", not "crash") —
the correct fail-closed behavior for a security policy.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0ccc4a4f8c53"
down_revision: Union[str, None] = "8b5837db9226"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TENANT_SCOPED_TABLES = [
    "institutions",
    "campuses",
    "academic_years",
    "users",
    "user_roles",
    "sessions",
    "audit_logs",
    "admissions",
    "students",
    "guardians",
]

TENANT_GUC_EXPR = "NULLIF(current_setting('app.current_tenant_id', true), '')::uuid"


def upgrade() -> None:
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (tenant_id = {TENANT_GUC_EXPR})
            WITH CHECK (tenant_id = {TENANT_GUC_EXPR})
            """
        )


def downgrade() -> None:
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
            """
        )
