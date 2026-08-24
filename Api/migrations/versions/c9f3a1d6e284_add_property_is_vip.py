"""add properties.is_vip

A third promotion flag beside `is_featured` and `is_premium`, so the office can
run a VIP row on the home page independently of its picks. Separate column
rather than a reused one: a property can be both, and collapsing them would
mean the two home-page rows could never hold different listings.

Backfilled `false` and NOT NULL, matching the two flags it sits between — a
nullable promotion flag would make "not promoted" and "never decided" the same
value in every query that filters on it.

Revision ID: c9f3a1d6e284
Revises: b4d1e77a9c02
Create Date: 2026-08-25 09:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "c9f3a1d6e284"
down_revision: Union[str, None] = "b4d1e77a9c02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "properties",
        sa.Column("is_vip", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    # The default was only needed to fill the existing rows; the model supplies
    # it from here, the same way `is_featured` does.
    op.alter_column("properties", "is_vip", server_default=None)
    op.create_index("ix_properties_is_vip", "properties", ["is_vip"])


def downgrade() -> None:
    op.drop_index("ix_properties_is_vip", table_name="properties")
    op.drop_column("properties", "is_vip")
