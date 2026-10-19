from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Request(Base):
    """Richiesta operativa in ingresso, con proposta di triage e decisione umana."""

    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), index=True
    )
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
    organization: Mapped[Organization | None] = relationship(back_populates="requests")
    activities: Mapped[list[RequestActivity]] = relationship(
        back_populates="request", cascade="all, delete-orphan", order_by="RequestActivity.created_at"
    )


class Organization(Base):
    """Cliente o fornitore a cui collegare richieste e storico operativo."""

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    tax_id: Mapped[str | None] = mapped_column(String(32), unique=True, index=True)
    customer_code: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(40))
    contact_name: Mapped[str | None] = mapped_column(String(120))
    address: Mapped[str | None] = mapped_column(String(240))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    requests: Mapped[list[Request]] = relationship(back_populates="organization")


class RequestActivity(Base):
    """Nota operativa, esito o impegno associato a una richiesta."""

    __tablename__ = "request_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30), default="Nota")
    note: Mapped[str] = mapped_column(Text)
    actor: Mapped[str] = mapped_column(String(120), default="Operatore NSE")
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    request: Mapped[Request] = relationship(back_populates="activities")


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
