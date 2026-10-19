"""Aggiunge anagrafiche e storico operativo."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("tax_id", sa.String(32), unique=True),
        sa.Column("customer_code", sa.String(50), unique=True),
        sa.Column("email", sa.String(254)),
        sa.Column("phone", sa.String(40)),
        sa.Column("contact_name", sa.String(120)),
        sa.Column("address", sa.String(240)),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_organizations_kind", "organizations", ["kind"])
    op.create_index("ix_organizations_name", "organizations", ["name"])
    op.create_index("ix_organizations_tax_id", "organizations", ["tax_id"])
    op.create_index("ix_organizations_customer_code", "organizations", ["customer_code"])
    op.add_column("requests", sa.Column("organization_id", sa.Integer))
    op.create_index("ix_requests_organization_id", "requests", ["organization_id"])
    op.create_foreign_key(
        "fk_requests_organization_id_organizations",
        "requests",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_table(
        "request_activities",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("request_id", sa.Integer, sa.ForeignKey("requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("note", sa.Text, nullable=False),
        sa.Column("actor", sa.String(120), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_request_activities_request_id", "request_activities", ["request_id"])


def downgrade() -> None:
    op.drop_index("ix_request_activities_request_id", "request_activities")
    op.drop_table("request_activities")
    op.drop_constraint("fk_requests_organization_id_organizations", "requests", type_="foreignkey")
    op.drop_index("ix_requests_organization_id", "requests")
    op.drop_column("requests", "organization_id")
    op.drop_index("ix_organizations_customer_code", "organizations")
    op.drop_index("ix_organizations_tax_id", "organizations")
    op.drop_index("ix_organizations_name", "organizations")
    op.drop_index("ix_organizations_kind", "organizations")
    op.drop_table("organizations")
