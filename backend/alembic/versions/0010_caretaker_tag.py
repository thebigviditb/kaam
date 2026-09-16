"""Merge childcare + elder_care tags into caretaker.

Revision ID: 0010_caretaker
Revises: 0009_hinglish
"""

import json

import sqlalchemy as sa

from alembic import op

revision = "0010_caretaker"
down_revision = "0009_hinglish"
branch_labels = None
depends_on = None

OLD = {"childcare", "elder_care"}


def _remap(tags):
    out = []
    for t in tags or []:
        t = "caretaker" if t in OLD else t
        if t not in out:
            out.append(t)
    return out


def upgrade() -> None:
    conn = op.get_bind()
    for table in ("worker_profiles", "customer_profiles"):
        rows = conn.execute(sa.text(f"select user_id, tags from {table}")).fetchall()
        for user_id, tags in rows:
            if isinstance(tags, str):
                tags = json.loads(tags)
            new = _remap(tags)
            if new != (tags or []):
                conn.execute(
                    sa.text(f"update {table} set tags = :t where user_id = :u"),
                    {"t": json.dumps(new), "u": user_id},
                )


def downgrade() -> None:
    pass  # not reversible without knowing which caretakers were childcare vs elder care
