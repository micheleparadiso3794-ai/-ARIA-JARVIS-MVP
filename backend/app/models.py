from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Request(Base):
    """Richiesta operativa in ingresso, con proposta di triage e decisione umana."""

    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(String(40), default="Email")
    user_category: Mapped[str | None] = mapped_column(String(80))
    user_urgency: Mapped[str | None] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    rule_variant: Mapped[str] = mapped_column(String(4), default="A")
    pred_category: Mapped[str] = mapped_column(String(80))
    pred_priority: Mapped[str] = mapped_column(String(20))
    pred_role: Mapped[str] = mapped_column(String(80))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    reasoning: Mapped[str] = mapped_column(Text, default="")
    matches: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    status: Mapped[str] = mapped_column(String(30), default="Da revisionare", index=True)
    final_category: Mapped[str | None] = mapped_column(String(80))
    final_priority: Mapped[str | None] = mapped_column(String(20))
    final_role: Mapped[str | None] = mapped_column(String(80))
    correction_reason: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TestRun(Base):
    """Esecuzione del motore di regole sul dataset sintetico."""

    __tablename__ = "test_runs"
    __test__ = False  # non è una classe di test pytest

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    variant: Mapped[str] = mapped_column(String(4), index=True)
    total_samples: Mapped[int] = mapped_column(Integer)
    accuracy_cat: Mapped[float] = mapped_column(Float)
    accuracy_prio: Mapped[float] = mapped_column(Float)
    accuracy_role: Mapped[float] = mapped_column(Float)
    review_rate: Mapped[float] = mapped_column(Float)
    avg_time_ms: Mapped[float] = mapped_column(Float)
    accuracy_auto_only: Mapped[float] = mapped_column(Float, default=0.0)
    results: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)


class Feedback(Base):
    """Feedback raccolto durante le sessioni di prova."""

    __tablename__ = "user_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    session_id: Mapped[str] = mapped_column(String(80))
    worked_well: Mapped[str] = mapped_column(Text, default="")
    unclear_aspects: Mapped[str] = mapped_column(Text, default="")
    errors_found: Mapped[str] = mapped_column(Text, default="")
    suggested_improvements: Mapped[str] = mapped_column(Text, default="")
    priority: Mapped[str] = mapped_column(String(20), default="Media")
