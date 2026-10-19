"""Schema iniziale: richieste, esecuzioni di test, feedback

Revision ID: 0001
Revises:
Create Date: 2026-10-19
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TS = sa.DateTime(timezone=True)


def upgrade() -> None:
    op.create_table(
        "requests",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("channel", sa.String(40), nullable=False),
        sa.Column("user_category", sa.String(80)),
        sa.Column("user_urgency", sa.String(20)),
        sa.Column("notes", sa.Text),
        sa.Column("created_at", TS, nullable=False),
        sa.Column("rule_variant", sa.String(4), nullable=False),
        sa.Column("pred_category", sa.String(80), nullable=False),
        sa.Column("pred_priority", sa.String(20), nullable=False),
        sa.Column("pred_role", sa.String(80), nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("needs_review", sa.Boolean, nullable=False),
        sa.Column("reasoning", sa.Text, nullable=False),
        sa.Column("matches", sa.JSON, nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("final_category", sa.String(80)),
        sa.Column("final_priority", sa.String(20)),
        sa.Column("final_role", sa.String(80)),
        sa.Column("correction_reason", sa.Text),
        sa.Column("reviewed_at", TS),
    )
    op.create_index("ix_requests_status", "requests", ["status"])
    op.create_index("ix_requests_needs_review", "requests", ["needs_review"])

    op.create_table(
        "test_runs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("run_date", TS, nullable=False),
        sa.Column("variant", sa.String(4), nullable=False),
        sa.Column("total_samples", sa.Integer, nullable=False),
        sa.Column("accuracy_cat", sa.Float, nullable=False),
        sa.Column("accuracy_prio", sa.Float, nullable=False),
        sa.Column("accuracy_role", sa.Float, nullable=False),
        sa.Column("review_rate", sa.Float, nullable=False),
        sa.Column("avg_time_ms", sa.Float, nullable=False),
        sa.Column("accuracy_auto_only", sa.Float, nullable=False),
        sa.Column("results", sa.JSON, nullable=False),
    )
    op.create_index("ix_test_runs_variant", "test_runs", ["variant"])

    op.create_table(
        "user_feedback",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("created_at", TS, nullable=False),
        sa.Column("session_id", sa.String(80), nullable=False),
        sa.Column("worked_well", sa.Text, nullable=False),
        sa.Column("unclear_aspects", sa.Text, nullable=False),
        sa.Column("errors_found", sa.Text, nullable=False),
        sa.Column("suggested_improvements", sa.Text, nullable=False),
        sa.Column("priority", sa.String(20), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_feedback")
    op.drop_index("ix_test_runs_variant", "test_runs")
    op.drop_table("test_runs")
    op.drop_index("ix_requests_needs_review", "requests")
    op.drop_index("ix_requests_status", "requests")
    op.drop_table("requests")
