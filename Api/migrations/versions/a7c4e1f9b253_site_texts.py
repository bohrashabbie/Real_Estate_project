"""site_texts: the office's own wording for the public website

Every string on the storefront ships with a default in its language files
(storefront/messages/{ar,en}.json). This table holds only the ones the
office has changed from the admin's Website Content page -- one row per
(key, locale), the key being the string's path in those files ("hero.title").
Deleting a row puts the default back.

Also adds the content.view / content.manage permissions and grants them the
way banners are granted: owner and manager manage, agent and viewer view.

Revision ID: a7c4e1f9b253
Revises: f8b3c1d6e472
Create Date: 2026-10-22 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a7c4e1f9b253"
down_revision: Union[str, None] = "f8b3c1d6e472"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERMISSIONS = [
    ("content.view", "content", "View the website's page text", False),
    ("content.manage", "content", "Change the website's page text", False),
]
GRANTS = {
    "owner": ["content.view", "content.manage"],
    "manager": ["content.view", "content.manage"],
    "agent": ["content.view"],
    "viewer": ["content.view"],
}


def upgrade() -> None:
    op.create_table(
        "site_texts",
        sa.Column("key", sa.String(200), nullable=False),
        sa.Column("locale", sa.String(5), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_by_user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("key", "locale"),
    )

    bind = op.get_bind()
    for key, group, description, dangerous in PERMISSIONS:
        bind.execute(
            sa.text(
                'INSERT INTO permissions (key, "group", description, is_dangerous) '
                "VALUES (:key, :group, :description, :dangerous) ON CONFLICT (key) DO NOTHING"
            ),
            {"key": key, "group": group, "description": description, "dangerous": dangerous},
        )
    for role, keys in GRANTS.items():
        for key in keys:
            bind.execute(
                sa.text(
                    "INSERT INTO role_permissions (role_id, permission_id, granted_at) "
                    "SELECT r.id, p.id, now() FROM roles r, permissions p "
                    "WHERE r.code = :role AND p.key = :key "
                    "ON CONFLICT DO NOTHING"
                ),
                {"role": role, "key": key},
            )


def downgrade() -> None:
    op.execute(
        "DELETE FROM role_permissions WHERE permission_id IN "
        "(SELECT id FROM permissions WHERE key IN ('content.view', 'content.manage'))"
    )
    op.execute("DELETE FROM permissions WHERE key IN ('content.view', 'content.manage')")
    op.drop_table("site_texts")
