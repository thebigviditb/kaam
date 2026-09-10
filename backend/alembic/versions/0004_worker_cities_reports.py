"""Worker home city + work cities; reports table.

Revision ID: 0004_cities_reports
Revises: 0003_chat
"""

import sqlalchemy as sa

from alembic import op

revision = "0004_cities_reports"
down_revision = "0003_chat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("worker_profiles") as b:
        b.add_column(sa.Column("city", sa.String(64), nullable=False, server_default=""))
        b.add_column(sa.Column("work_cities", sa.JSON(), nullable=False, server_default="[]"))
    op.create_table(
        "reports",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reported_user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("connection_id", sa.String(36), sa.ForeignKey("connections.id"), nullable=True),
        sa.Column("reason", sa.String(32), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_reports_reporter_id", "reports", ["reporter_id"])
    op.create_index("ix_reports_reported_user_id", "reports", ["reported_user_id"])


def downgrade() -> None:
    op.drop_table("reports")
    with op.batch_alter_table("worker_profiles") as b:
        b.drop_column("work_cities")
        b.drop_column("city")
