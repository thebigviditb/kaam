"""Message language + cached translations.

Revision ID: 0007_translations
Revises: 0006_feedback
"""

import sqlalchemy as sa

from alembic import op

revision = "0007_translations"
down_revision = "0006_feedback"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("messages") as b:
        b.add_column(sa.Column("lang", sa.String(8), nullable=True))
        b.add_column(sa.Column("translations", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("messages") as b:
        b.drop_column("translations")
        b.drop_column("lang")
