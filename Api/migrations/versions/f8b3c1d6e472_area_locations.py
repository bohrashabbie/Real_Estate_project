"""areas carry a centre point and a radius

So both maps -- the admin property form and the storefront's Search map --
can fly to an area and shade it when the office or a visitor picks it, on
request. Looked up from OpenStreetMap (`app.services.geocode_service`) and
stored, rather than looked up on every page view: the lookup service allows
one request a second, and an area does not move.

All three nullable: an area OSM does not know, or one not looked up yet,
simply has no circle.

Revision ID: f8b3c1d6e472
Revises: e4f7a2c9d351
Create Date: 2026-10-06 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f8b3c1d6e472"
down_revision: Union[str, None] = "e4f7a2c9d351"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("areas", sa.Column("latitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("areas", sa.Column("longitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("areas", sa.Column("radius_m", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("areas", "radius_m")
    op.drop_column("areas", "longitude")
    op.drop_column("areas", "latitude")
