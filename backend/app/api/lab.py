"""Laboratorio di prova: dataset sintetico, esecuzioni del motore, confronto A/B, regole."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dataset import SYNTHETIC_DATASET
from app.db import get_db
from app.models import TestRun
from app.schemas import TestRunCreate, TestRunOut, TestRunSummary, TriageInput, TriageResult
from app.triage import VARIANTS, TriageEngine, calculate_run_metrics, load_rules

router = APIRouter(tags=["lab"])


@router.post("/triage/preview", response_model=TriageResult)
def triage_preview(data: TriageInput):
    """Triage senza salvataggio, usato per l'anteprima mentre l'utente scrive."""
    return TriageEngine(data.variant).classify(data.title, data.description)


@router.get("/dataset")
def get_dataset() -> list[dict[str, Any]]:
    return SYNTHETIC_DATASET


@router.get("/rules")
def list_rules() -> dict[str, dict[str, Any]]:
    return {v: load_rules(v) for v in VARIANTS}


@router.get("/test-runs", response_model=list[TestRunSummary])
def list_runs(db: Session = Depends(get_db)):
    return db.scalars(select(TestRun).order_by(TestRun.id.desc())).all()


@router.get("/test-runs/compare", response_model=dict[str, TestRunSummary | None])
def compare_runs(db: Session = Depends(get_db)):
    """Ultima esecuzione per ciascuna variante."""
    return {
        v: db.scalars(
            select(TestRun).where(TestRun.variant == v).order_by(TestRun.id.desc()).limit(1)
        ).first()
        for v in VARIANTS
    }


@router.get("/test-runs/{run_id}", response_model=TestRunOut)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.get(TestRun, run_id)
    if run is None:
        raise HTTPException(404, f"Esecuzione {run_id} non trovata")
    return run


@router.post("/test-runs", response_model=TestRunOut, status_code=201)
def create_run(data: TestRunCreate, db: Session = Depends(get_db)):
    engine = TriageEngine(data.variant)
    results = []
    for item in SYNTHETIC_DATASET:
        res = engine.classify(item["title"], item["description"])
        results.append(
            {
                "id": item["id"],
                "title": item["title"],
                "target_cat": item["target_cat"],
                "pred_cat": res["pred_category"],
                "target_prio": item["target_prio"],
                "pred_prio": res["pred_priority"],
                "target_role": item["target_role"],
                "pred_role": res["pred_role"],
                "confidence": res["confidence"],
                "needs_review": res["needs_review"],
                "elapsed_ms": round(res["elapsed_ms"], 4),
            }
        )
    m = calculate_run_metrics(results)
    run = TestRun(
        variant=data.variant,
        total_samples=m["total"],
        accuracy_cat=m["accuracy_cat"],
        accuracy_prio=m["accuracy_prio"],
        accuracy_role=m["accuracy_role"],
        review_rate=m["review_rate"],
        avg_time_ms=m["avg_time_ms"],
        accuracy_auto_only=m["accuracy_auto_only"],
        results=results,
    )
    db.add(run)
    db.commit()
    return run
