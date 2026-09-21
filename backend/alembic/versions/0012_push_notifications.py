"""Web push subscriptions, last_seen, SMS throttle columns.

Revision ID: 0012_push
Revises: 0011_drop_caretaker
"""

import sqlalchemy as sa

from alembic import op

revision = "0012_push"
down_revision = "0011_drop_caretaker"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))
    with op.batch_alter_table("connections") as b:
        b.add_column(sa.Column("customer_last_sms_at", sa.DateTime(timezone=True), nullable=True))
        b.add_column(sa.Column("worker_last_sms_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False, unique=True),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])


def downgrade() -> None:
    op.drop_table("push_subscriptions")
    with op.batch_alter_table("connections") as b:
        b.drop_column("worker_last_sms_at")
        b.drop_column("customer_last_sms_at")
    with op.batch_alter_table("users") as b:
        b.drop_column("last_seen_at")
