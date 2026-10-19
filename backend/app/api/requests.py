from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.dataset import SYNTHETIC_DATASET
from app.db import get_db
from app.models import Organization, Request, RequestActivity
from app.schemas import ActivityCreate, ActivityOut, RequestCreate, RequestOut, ReviewIn, SeedOut, StatusIn
from app.triage import TriageEngine

router = APIRouter(prefix="/requests", tags=["requests"])


def _build(data: RequestCreate) -> Request:
    variant = data.variant or get_settings().default_rule_variant
    res = TriageEngine(variant).classify(data.title, data.description)
    return Request(
        organization_id=data.organization_id,
        title=data.title,
        description=data.description,
        channel=data.channel,
        user_category=data.user_category or None,
        user_urgency=data.user_urgency or None,
        notes=data.notes or None,
        rule_variant=variant,
        pred_category=res["pred_category"],
        pred_priority=res["pred_priority"],
        pred_role=res["pred_role"],
        confidence=res["confidence"],
        needs_review=res["needs_review"],
        reasoning=res["reasoning"],
        matches=res["matches"],
        status="Da revisionare" if res["needs_review"] else "Assegnato",
        final_category=res["pred_category"],
        final_priority=res["pred_priority"],
        final_role=res["pred_role"],
    )


def _get(db: Session, request_id: int) -> Request:
    req = db.get(Request, request_id)
    if req is None:
        raise HTTPException(404, f"Richiesta {request_id} non trovata")
    return req


@router.get("", response_model=list[RequestOut])
def list_requests(
    status: str | None = None,
    needs_review: bool | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Request).order_by(Request.id.desc())
    if status:
        stmt = stmt.where(Request.status == status)
    if needs_review is not None:
        stmt = stmt.where(Request.needs_review == needs_review)
    return db.scalars(stmt).all()


@router.post("", response_model=RequestOut, status_code=201)
def create_request(data: RequestCreate, db: Session = Depends(get_db)):
    if data.organization_id is not None and db.get(Organization, data.organization_id) is None:
        raise HTTPException(404, f"Anagrafica {data.organization_id} non trovata")
    req = _build(data)
    db.add(req)
    db.commit()
    db.refresh(req)
    db.add(RequestActivity(request_id=req.id, kind="Stato", note="Richiesta ricevuta e registrata."))
    db.commit()
    return req


@router.post("/seed", response_model=SeedOut, status_code=201)
def seed_requests(db: Session = Depends(get_db)):
    """Carica i 30 casi sintetici nella coda, per provare il flusso senza digitare."""
    for item in SYNTHETIC_DATASET:
        db.add(
            _build(
                RequestCreate(
                    title=item["title"],
                    description=item["description"],
                    channel=item["channel"],
                )
            )
        )
    db.commit()
    return SeedOut(created=len(SYNTHETIC_DATASET))


@router.get("/{request_id}", response_model=RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    return _get(db, request_id)


@router.post("/{request_id}/review", response_model=RequestOut)
def review_request(request_id: int, data: ReviewIn, db: Session = Depends(get_db)):
    req = _get(db, request_id)
    req.final_category = data.final_category
    req.final_priority = data.final_priority
    req.final_role = data.final_role
    req.correction_reason = data.reason
    req.needs_review = False
    req.status = "In lavorazione"
    req.reviewed_at = datetime.now(UTC)
    db.add(
        RequestActivity(
            request=req,
            kind="Revisione",
            note=(
                f"{data.reason.strip()} Categoria: {data.final_category}; "
                f"priorità: {data.final_priority}; assegnata a {data.final_role}."
            ),
        )
    )
    db.commit()
    return req


@router.patch("/{request_id}/status", response_model=RequestOut)
def set_status(request_id: int, data: StatusIn, db: Session = Depends(get_db)):
    req = _get(db, request_id)
    if req.needs_review and data.status != "Da revisionare":
        raise HTTPException(409, "La richiesta va prima revisionata da un operatore")
    if data.status == "Completato" and not db.scalar(
        select(RequestActivity.id).where(
            RequestActivity.request_id == request_id, RequestActivity.kind == "Esito"
        )
    ):
        raise HTTPException(409, "Registra un esito prima di completare la richiesta")
    previous = req.status
    req.status = data.status
    if previous != data.status:
        db.add(
            RequestActivity(request=req, kind="Stato", note=f"Stato aggiornato: {previous} → {data.status}.")
        )
    db.commit()
    return req


@router.post("/{request_id}/activities", response_model=ActivityOut, status_code=201)
def add_activity(request_id: int, data: ActivityCreate, db: Session = Depends(get_db)):
    _get(db, request_id)
    activity = RequestActivity(request_id=request_id, **data.model_dump())
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/{request_id}", status_code=204)
def delete_request(request_id: int, db: Session = Depends(get_db)):
    db.delete(_get(db, request_id))
    db.commit()
