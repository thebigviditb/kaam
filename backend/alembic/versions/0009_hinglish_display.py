"""Per-user Hinglish display preference.

Revision ID: 0009_hinglish
Revises: 0008_deletion
"""

import sqlalchemy as sa

from alembic import op

revision = "0009_hinglish"
down_revision = "0008_deletion"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("hinglish_display", sa.String(16), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.drop_column("hinglish_display")
