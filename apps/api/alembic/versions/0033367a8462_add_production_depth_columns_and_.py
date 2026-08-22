"""add production-depth columns and hostel complaints

Revision ID: 0033367a8462
Revises: 01c702282dda
Create Date: 2026-08-22 04:10:00.000000

Adds the schema needed for: Section class-teacher assignment, Library fines
(fine_per_day on Book, fine_amount/fine_paid on BookIssue), Fee late-fee rate
(late_fee_per_day on FeeStructure), and the new Hostel complaints table.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0033367a8462'
down_revision: Union[str, None] = '01c702282dda'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sections', sa.Column('class_teacher_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_sections_class_teacher_id_faculty', 'sections', 'faculty', ['class_teacher_id'], ['id']
    )

    op.add_column(
        'books',
        sa.Column('fine_per_day', sa.Numeric(precision=8, scale=2), server_default='5', nullable=False),
    )
    op.alter_column('books', 'fine_per_day', server_default=None)

    op.add_column('book_issues', sa.Column('fine_amount', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column(
        'book_issues',
        sa.Column('fine_paid', sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.alter_column('book_issues', 'fine_paid', server_default=None)

    op.add_column(
        'fee_structures',
        sa.Column('late_fee_per_day', sa.Numeric(precision=8, scale=2), server_default='0', nullable=False),
    )
    op.alter_column('fee_structures', 'late_fee_per_day', server_default=None)

    op.create_table(
        'hostel_complaints',
        sa.Column('room_id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column(
            'category',
            sa.Enum(
                'electrical', 'plumbing', 'furniture', 'cleanliness', 'internet', 'other',
                name='hostel_complaint_category',
            ),
            nullable=False,
        ),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column(
            'status',
            sa.Enum('open', 'in_progress', 'resolved', name='hostel_complaint_status'),
            nullable=False,
        ),
        sa.Column('raised_date', sa.Date(), nullable=False),
        sa.Column('resolved_date', sa.Date(), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id']),
        sa.ForeignKeyConstraint(['student_id'], ['students.id']),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_hostel_complaints_room_id'), 'hostel_complaints', ['room_id'], unique=False)
    op.create_index(op.f('ix_hostel_complaints_student_id'), 'hostel_complaints', ['student_id'], unique=False)
    op.create_index(op.f('ix_hostel_complaints_tenant_id'), 'hostel_complaints', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_hostel_complaints_tenant_id'), table_name='hostel_complaints')
    op.drop_index(op.f('ix_hostel_complaints_student_id'), table_name='hostel_complaints')
    op.drop_index(op.f('ix_hostel_complaints_room_id'), table_name='hostel_complaints')
    op.drop_table('hostel_complaints')
    sa.Enum(name='hostel_complaint_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='hostel_complaint_category').drop(op.get_bind(), checkfirst=True)

    op.drop_column('fee_structures', 'late_fee_per_day')
    op.drop_column('book_issues', 'fine_paid')
    op.drop_column('book_issues', 'fine_amount')
    op.drop_column('books', 'fine_per_day')

    op.drop_constraint('fk_sections_class_teacher_id_faculty', 'sections', type_='foreignkey')
    op.drop_column('sections', 'class_teacher_id')
