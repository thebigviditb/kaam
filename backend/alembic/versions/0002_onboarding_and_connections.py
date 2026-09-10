"""Onboarding model: customer needs live on the profile; jobs become connections.

Revision ID: 0002_onboarding
Revises: 684dc6c4eb4c
"""

import sqlalchemy as sa

from alembic import op

revision = "0002_onboarding"
down_revision = "684dc6c4eb4c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("applications")
    op.drop_table("jobs")

    with op.batch_alter_table("worker_profiles") as b:
        b.drop_index("ix_worker_profiles_city")
        b.drop_column("city")
        b.drop_column("availability")
        b.add_column(sa.Column("days", sa.JSON(), nullable=False, server_default="[]"))
        b.add_column(sa.Column("times", sa.JSON(), nullable=False, server_default="[]"))

    with op.batch_alter_table("customer_profiles") as b:
        b.add_column(sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"))
        b.add_column(sa.Column("other_tag_text", sa.String(255), nullable=True))
        b.add_column(sa.Column("description", sa.Text(), nullable=False, server_default=""))
        b.add_column(sa.Column("pay_amount", sa.Numeric(10, 2), nullable=True))
        b.add_column(sa.Column("pay_type", sa.String(16), nullable=False, server_default="hourly"))
        b.add_column(
            sa.Column("start_timing", sa.String(32), nullable=False, server_default="flexible")
        )
        b.add_column(sa.Column("days", sa.JSON(), nullable=False, server_default="[]"))
        b.add_column(sa.Column("times", sa.JSON(), nullable=False, server_default="[]"))
        b.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_index("ix_customer_profiles_city", "customer_profiles", ["city"])

    op.create_table(
        "connections",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("customer_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("worker_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("initiated_by", sa.String(16), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("customer_id", "worker_id", name="uq_connection_pair"),
    )
    op.create_index("ix_connections_customer_id", "connections", ["customer_id"])
    op.create_index("ix_connections_worker_id", "connections", ["worker_id"])


def downgrade() -> None:
    raise NotImplementedError("no downgrade; data model changed shape")
