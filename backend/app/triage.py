"""Motore di triage deterministico basato su keyword (porting fedele della demo Streamlit)."""

import json
import re
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

RULES_DIR = Path(__file__).parent / "rules"
VARIANTS: dict[str, str] = {"A": "config_rules_vA.json", "B": "config_rules_vB.json"}

UNCLASSIFIED = "Non classificato"
TRIAGER_ROLE = "Marta (Triager)"


@lru_cache
def load_rules(variant: str) -> dict[str, Any]:
    if variant not in VARIANTS:
        raise KeyError(variant)
    with open(RULES_DIR / VARIANTS[variant], encoding="utf-8") as f:
        return json.load(f)


def _pattern(keyword: str) -> re.Pattern[str]:
    return re.compile(r"\b" + re.escape(keyword.lower()) + r"\b")


class TriageEngine:
    def __init__(self, variant: str = "A"):
        self.variant = variant
        self.config = load_rules(variant)

    def classify(self, title: str, description: str) -> dict[str, Any]:
        start = time.perf_counter()
        text = f"{title} {description}".lower()

        scores: dict[str, int] = {}
        matches: list[dict[str, Any]] = []

        # 1. Punteggio per categoria: una occorrenza di keyword = un punto
        for cat, details in self.config["categories"].items():
            score = 0
            for kw in details["keywords"]:
                count = len(_pattern(kw).findall(text))
                if count:
                    score += count
                    matches.append({"keyword": kw, "count": count, "category": cat})
            if score:
                scores[cat] = score

        require_review = self.config.get("require_human_review", True)

        if not scores:
            return {
                "pred_category": UNCLASSIFIED,
                "pred_priority": "Media",
                "pred_role": TRIAGER_ROLE,
                "confidence": 0.0,
                "needs_review": True,
                "ambiguous": False,
                "reasoning": "Nessuna parola chiave riconosciuta nel testo.",
                "matches": [],
                "scores": {},
                "priority_keyword": None,
                "variant": self.variant,
                "elapsed_ms": (time.perf_counter() - start) * 1000,
            }

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_cat, top_score = ranked[0]
        ambiguous = len(ranked) > 1 and ranked[1][1] == top_score

        confidence = round(top_score / sum(scores.values()), 2)
        if ambiguous:
            confidence = min(confidence, 0.49)

        # 2. Priorità: default della categoria, alzata dalla keyword di urgenza più grave.
        # I booster sono ordinati dal più grave: vince il primo che compare nel testo.
        priority = self.config["categories"][top_cat]["default_priority"]
        priority_keyword = next(
            (
                (prio, kw)
                for prio, kws in self.config["priority_boosters"].items()
                for kw in kws
                if _pattern(kw).search(text)
            ),
            None,
        )
        if priority_keyword:
            priority, priority_keyword = priority_keyword

        below_threshold = confidence < self.config["confidence_threshold"]
        needs_review = require_review or below_threshold or ambiguous

        top_kws = [f"{m['keyword']} ({m['count']})" for m in matches if m["category"] == top_cat]
        reasoning = f"Categoria «{top_cat}» per le parole: {', '.join(top_kws)}."
        if priority_keyword:
            reasoning += f" Priorità alzata da «{priority_keyword}»."
        if ambiguous:
            reasoning += " Segnali contrastanti con un'altra categoria."

        return {
            "pred_category": top_cat,
            "pred_priority": priority,
            "pred_role": self.config["categories"][top_cat]["target_role"],
            "confidence": confidence,
            "needs_review": needs_review,
            "ambiguous": ambiguous,
            "reasoning": reasoning,
            "matches": matches,
            "scores": scores,
            "priority_keyword": priority_keyword,
            "variant": self.variant,
            "elapsed_ms": (time.perf_counter() - start) * 1000,
        }


def calculate_run_metrics(results: list[dict[str, Any]]) -> dict[str, float]:
    total = len(results)
    if total == 0:
        return {
            "total": 0,
            "accuracy_cat": 0.0,
            "accuracy_prio": 0.0,
            "accuracy_role": 0.0,
            "review_rate": 0.0,
            "avg_time_ms": 0.0,
            "accuracy_auto_only": 0.0,
        }

    def pct(n: int, d: int) -> float:
        return round(n / d * 100, 2) if d else 0.0

    auto = [r for r in results if not r["needs_review"]]
    return {
        "total": total,
        "accuracy_cat": pct(sum(r["target_cat"] == r["pred_cat"] for r in results), total),
        "accuracy_prio": pct(sum(r["target_prio"] == r["pred_prio"] for r in results), total),
        "accuracy_role": pct(sum(r["target_role"] == r["pred_role"] for r in results), total),
        "review_rate": pct(sum(bool(r["needs_review"]) for r in results), total),
        "avg_time_ms": round(sum(r["elapsed_ms"] for r in results) / total, 3),
        "accuracy_auto_only": pct(sum(r["target_cat"] == r["pred_cat"] for r in auto), len(auto)),
    }
