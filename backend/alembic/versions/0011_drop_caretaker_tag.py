"""Remove the caretaker tag entirely.

Revision ID: 0011_drop_caretaker
Revises: 0010_caretaker
"""

import json

import sqlalchemy as sa

from alembic import op

revision = "0011_drop_caretaker"
down_revision = "0010_caretaker"
branch_labels = None
depends_on = None

DROP = {"caretaker", "childcare", "elder_care"}


def upgrade() -> None:
    conn = op.get_bind()
    for table in ("worker_profiles", "customer_profiles"):
        rows = conn.execute(sa.text(f"select user_id, tags from {table}")).fetchall()
        for user_id, tags in rows:
            if isinstance(tags, str):
                tags = json.loads(tags)
            new = [t for t in (tags or []) if t not in DROP]
            if new != (tags or []):
                conn.execute(
                    sa.text(f"update {table} set tags = :t where user_id = :u"),
                    {"t": json.dumps(new), "u": user_id},
                )


def downgrade() -> None:
    pass
