"""Scheduled account deletion.

Revision ID: 0008_deletion
Revises: 0007_translations
"""

import sqlalchemy as sa

from alembic import op

revision = "0008_deletion"
down_revision = "0007_translations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("deletion_requested_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.drop_column("deletion_requested_at")
