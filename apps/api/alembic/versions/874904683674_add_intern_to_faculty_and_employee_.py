"""add intern to faculty and employee employment type enums

Revision ID: 874904683674
Revises: 9423198580ac
Create Date: 2026-08-18 02:07:23.520439

Research labs (and to a lesser extent universities/colleges) commonly staff
interns alongside full-time/part-time/contract people — both the Faculty
module (researchers) and the HR module (general staff) needed this option.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "874904683674"
down_revision: Union[str, None] = "9423198580ac"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE faculty_employment_type ADD VALUE IF NOT EXISTS 'intern'")
    op.execute("ALTER TYPE employee_employment_type ADD VALUE IF NOT EXISTS 'intern'")


def downgrade() -> None:
    # PostgreSQL has no DROP VALUE for enum types — removing 'intern' would
    # require recreating the type and repointing every dependent column,
    # which isn't safe to do blindly in a downgrade. Left as a no-op.
    pass
