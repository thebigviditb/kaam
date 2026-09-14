"""Referral codes and who-invited-whom.

Revision ID: 0005_referrals
Revises: 0004_cities_reports
"""

import secrets

import sqlalchemy as sa

from alembic import op

revision = "0005_referrals"
down_revision = "0004_cities_reports"
branch_labels = None
depends_on = None

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def upgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.add_column(sa.Column("referral_code", sa.String(12), nullable=True))
        b.add_column(
            sa.Column("referred_by_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True)
        )
    # Backfill existing users with unique codes.
    conn = op.get_bind()
    ids = [r[0] for r in conn.execute(sa.text("select id from users")).fetchall()]
    used: set[str] = set()
    for uid in ids:
        code = "".join(secrets.choice(ALPHABET) for _ in range(7))
        while code in used:
            code = "".join(secrets.choice(ALPHABET) for _ in range(7))
        used.add(code)
        conn.execute(
            sa.text("update users set referral_code = :c where id = :i"), {"c": code, "i": uid}
        )
    with op.batch_alter_table("users") as b:
        b.alter_column("referral_code", nullable=False)
        b.create_index("ix_users_referral_code", ["referral_code"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("users") as b:
        b.drop_index("ix_users_referral_code")
        b.drop_column("referred_by_id")
        b.drop_column("referral_code")
