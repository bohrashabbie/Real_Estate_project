"""add banners + banner_translations

Home-page hero slides become admin-managed content instead of a hand-edited
array in the storefront bundle. Same translated-row shape as the taxonomies:
one `banners` row plus one `banner_translations` row per locale.

The image is translatable because the artwork carries its own baked-in Arabic
headline — banners.media_id is the fallback for every locale and a translation
row may override it.

Revision ID: b4d1e77a9c02
Revises: a7c2e9f14b30
Create Date: 2026-08-08 10:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b4d1e77a9c02"
down_revision: Union[str, None] = "a7c2e9f14b30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "banners",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("media_id", sa.BigInteger(), nullable=False),
        sa.Column("href", sa.String(length=500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("starts_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("ends_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["media_id"], ["media.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_banners_is_active", "banners", ["is_active"])
    op.create_index("ix_banners_sort_order", "banners", ["sort_order"])

    op.create_table(
        "banner_translations",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("banner_id", sa.BigInteger(), nullable=False),
        sa.Column("locale", sa.String(), nullable=False),
        sa.Column("alt_text", sa.String(length=300), nullable=False),
        sa.Column("media_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["banner_id"], ["banners.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["media_id"], ["media.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("banner_id", "locale", name="uq_banner_translations_banner_locale"),
    )


def downgrade() -> None:
    op.drop_table("banner_translations")
    op.drop_index("ix_banners_sort_order", table_name="banners")
    op.drop_index("ix_banners_is_active", table_name="banners")
    op.drop_table("banners")
