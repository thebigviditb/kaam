"""Chat messages on accepted connections.

Revision ID: 0003_chat
Revises: 0002_onboarding
"""

import sqlalchemy as sa

from alembic import op

revision = "0003_chat"
down_revision = "0002_onboarding"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("connections") as b:
        b.add_column(sa.Column("customer_last_read_at", sa.DateTime(timezone=True), nullable=True))
        b.add_column(sa.Column("worker_last_read_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("connection_id", sa.String(36), sa.ForeignKey("connections.id"), nullable=False),
        sa.Column("sender_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_messages_connection_id", "messages", ["connection_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])


def downgrade() -> None:
    op.drop_table("messages")
    with op.batch_alter_table("connections") as b:
        b.drop_column("worker_last_read_at")
        b.drop_column("customer_last_read_at")
