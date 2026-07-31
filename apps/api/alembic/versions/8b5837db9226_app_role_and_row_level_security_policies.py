"""app role and row-level security policies

Revision ID: 8b5837db9226
Revises: 31b59b15a8e5
Create Date: 2026-07-31 15:07:45.248610

Implements docs/03-database-design.md §1 (multi-tenancy strategy) and
docs/04-rbac-security.md §4 (tenant isolation model): a non-owner `sutram_app`
role that the API connects as, plus `FORCE ROW LEVEL SECURITY` policies on
every tenant-scoped table keyed off the `app.current_tenant_id` session GUC
that app/core/db.py sets per-request. Table owners/superusers always bypass
RLS, which is exactly why the app must NOT connect as the owning role.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "8b5837db9226"
down_revision: Union[str, None] = "31b59b15a8e5"
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

# Platform-wide catalogs — no tenant_id, read-only for the app role.
PLATFORM_TABLES = ["roles", "permissions", "role_permissions"]


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'sutram_app') THEN
                CREATE ROLE sutram_app LOGIN PASSWORD 'sutram_app_dev_password';
            END IF;
        END
        $$;
        """
    )
    op.execute("GRANT USAGE ON SCHEMA public TO sutram_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sutram_app")
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sutram_app")
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sutram_app"
    )

    for table in TENANT_SCOPED_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
            WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
            """
        )

    # student_guardians has no tenant_id of its own (pure join table); tenant
    # isolation is inherited transitively via the FK'd students/guardians rows,
    # which are themselves RLS-protected — see docs/03-database-design.md §6.

    for table in PLATFORM_TABLES:
        op.execute(f"REVOKE INSERT, UPDATE, DELETE ON {table} FROM sutram_app")


def downgrade() -> None:
    for table in TENANT_SCOPED_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM sutram_app")
    op.execute("REVOKE USAGE ON SCHEMA public FROM sutram_app")
    op.execute("DROP ROLE IF EXISTS sutram_app")
