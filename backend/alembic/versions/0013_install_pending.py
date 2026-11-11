"""users.install_pending (the "add Kaam to your Home Screen" step is still to be shown) and
users.preview_login_iat (staging preview accounts: the newest sign-in seen).

Revision ID: 0013_install_pending
Revises: 0012_push
"""

import sqlalchemy as sa

from alembic import op

revision = "0013_install_pending"
down_revision = "0012_push"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.add_column(
            sa.Column("install_pending", sa.Boolean(), nullable=False, server_default=sa.false())
        )
        b.add_column(sa.Column("preview_login_iat", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.drop_column("preview_login_iat")
        b.drop_column("install_pending")
