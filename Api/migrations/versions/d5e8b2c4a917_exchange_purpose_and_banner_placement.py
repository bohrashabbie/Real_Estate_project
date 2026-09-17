"""add the "exchange" purpose and banners.placement

Two additions the office asked for together:

* **Exchange listings** (للبدل) -- a third purpose beside rent and sale, with
  its own nav page and home-page row. Added to the existing Postgres ENUM
  rather than a new column: a property is offered for exactly one purpose,
  and every filter already reads `purpose`. `ADD VALUE` cannot run inside a
  transaction block on older servers and a new value cannot be used in the
  transaction that adds it, so it runs in an autocommit block.

* **Banner placement** -- the home page's two static "Kuwait Real Estate"
  photos become an advert band the office manages from the Banners screen.
  Same table as the hero slides (image, alt text, link, order, window);
  `placement` says which band a row belongs to. Existing rows are hero
  slides, so they are backfilled "hero".

Downgrade drops the column only. Postgres cannot remove a value from an ENUM
without recreating the type, and any row using "exchange" would have nowhere
to go -- the value is left in place.

Revision ID: d5e8b2c4a917
Revises: c9f3a1d6e284
Create Date: 2026-09-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d5e8b2c4a917"
down_revision: Union[str, None] = "c9f3a1d6e284"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE property_purpose ADD VALUE IF NOT EXISTS 'exchange'")

    op.add_column(
        "banners",
        sa.Column("placement", sa.String(length=20), nullable=False, server_default="hero"),
    )
    # The default only backfilled existing rows; the model supplies it now.
    op.alter_column("banners", "placement", server_default=None)
    op.create_index("ix_banners_placement", "banners", ["placement"])


def downgrade() -> None:
    op.drop_index("ix_banners_placement", table_name="banners")
    op.drop_column("banners", "placement")
