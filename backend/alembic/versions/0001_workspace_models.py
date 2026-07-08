"""Initial workspace models scaffold.

Revision ID: 0001_workspace_models
Revises:
Create Date: 2026-07-02
"""
# revision identifiers, used by Alembic.
revision = "0001_workspace_models"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Workspace databases are created dynamically per dataset at runtime.
    # This placeholder revision keeps Alembic wired into the project for
    # future migrations without forcing a single shared SQLite file today.
    pass


def downgrade() -> None:
    pass
