from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import Feedback, Request, TestRun
from app.schemas import FeedbackIn, FeedbackOut, Meta, Stats
from app.triage import TRIAGER_ROLE, VARIANTS, load_rules

router = APIRouter(tags=["misc"])

PRIORITIES = ["Bassa", "Media", "Alta", "Critica"]
STATUSES = ["Da revisionare", "Assegnato", "In lavorazione", "Completato"]
CHANNELS = ["Email", "Modulo web", "Chat", "Telefono"]


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/meta", response_model=Meta)
def meta():
    rules = load_rules("A")["categories"]
    return Meta(
        categories=list(rules),
        priorities=PRIORITIES,
        roles=[c["target_role"] for c in rules.values()] + [TRIAGER_ROLE],
        channels=CHANNELS,
        statuses=STATUSES,
        variants={v: load_rules(v).get("label", v) for v in VARIANTS},
        default_variant=get_settings().default_rule_variant,
    )


@router.get("/stats", response_model=Stats)
def stats(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Request.status, Request.final_category, Request.final_priority, Request.needs_review)
    ).all()
    return Stats(
        total=len(rows),
        by_status={**dict.fromkeys(STATUSES, 0), **Counter(r.status for r in rows)},
        by_category=dict(Counter(r.final_category for r in rows if r.final_category)),
        by_priority={**dict.fromkeys(PRIORITIES, 0), **Counter(r.final_priority for r in rows)},
        pending_review=sum(r.needs_review for r in rows),
        test_runs=db.scalar(select(func.count(TestRun.id))) or 0,
    )


@router.get("/feedback", response_model=list[FeedbackOut])
def list_feedback(db: Session = Depends(get_db)):
    return db.scalars(select(Feedback).order_by(Feedback.id.desc())).all()


@router.post("/feedback", response_model=FeedbackOut, status_code=201)
def create_feedback(data: FeedbackIn, db: Session = Depends(get_db)):
    fb = Feedback(**data.model_dump())
    db.add(fb)
    db.commit()
    return fb
