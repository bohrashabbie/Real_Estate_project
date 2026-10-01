"""soft delete for inquiries and property requests

The office asked for a delete option on every admin list. Inquiries and
property requests are the two that had none -- and they are leads, so
"delete" hides them (`is_active=false`) rather than erasing them, the same
as every other entity here: a lead removed by mistake is still recoverable
and its audit trail stays intact. Backfilled true and NOT NULL, matching
`properties.is_active`.

Revision ID: e4f7a2c9d351
Revises: d5e8b2c4a917
Create Date: 2026-10-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e4f7a2c9d351"
down_revision: Union[str, None] = "d5e8b2c4a917"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("inquiries", "property_requests")


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
        op.alter_column(table, "is_active", server_default=None)
        op.create_index(f"ix_{table}_is_active", table, ["is_active"])


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f"ix_{table}_is_active", table_name=table)
        op.drop_column(table, "is_active")
