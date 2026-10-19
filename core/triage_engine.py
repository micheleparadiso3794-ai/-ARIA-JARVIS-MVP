import json
import re
import time

class RuleBasedTriageEngine:
    def __init__(self, config_path="config_rules_vA.json"):
        self.config_path = config_path
        self.load_config()

    def load_config(self):
        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

    def classify(self, title, description):
        start_time = time.time()
        text = f"{title} {description}".lower()
        
        category_scores = {}
        matched_keywords = {}

        # 1. Calcolo Punteggio Categorie
        for cat, details in self.config["categories"].items():
            score = 0
            matches = []
            for kw in details["keywords"]:
                # Match esatto con parola o frase
                pattern = r'\b' + re.escape(kw.lower()) + r'\b'
                found = re.findall(pattern, text)
                if found:
                    count = len(found)
                    score += count
                    matches.append(f"{kw} ({count})")
            if score > 0:
                category_scores[cat] = score
                matched_keywords[cat] = matches

        # Gestione casi ambigui o senza match
        if not category_scores:
            elapsed_ms = (time.time() - start_time) * 1000
            return {
                "pred_category": "Non Classificato",
                "pred_priority": "Media",
                "pred_role": "Marta (Triager / Human Review)",
                "confidence": 0.0,
                "needs_review": True,
                "reasoning": "Nessuna regola o parola chiave identificata nel testo.",
                "elapsed_ms": elapsed_ms
            }

        # Ordinamento categorie per punteggio
        sorted_cats = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
        top_cat, top_score = sorted_cats[0]
        
        # Check ambiguità (es. due categorie a pari merito)
        is_ambiguous = False
        if len(sorted_cats) > 1 and sorted_cats[1][1] == top_score:
            is_ambiguous = True

        # Calcolo confidenza grezza
        total_score = sum(category_scores.values())
        confidence = round(top_score / total_score, 2) if total_score > 0 else 0.0
        if is_ambiguous:
            confidence = min(confidence, 0.49)

        # 2. Calcolo Priorità
        pred_priority = self.config["categories"][top_cat]["default_priority"]
        priority_reason = ""
        for prio, kws in self.config["priority_boosters"].items():
            for kw in kws:
                if re.search(r'\b' + re.escape(kw.lower()) + r'\b', text):
                    pred_priority = prio
                    priority_reason = f" [Boosted da keyword: '{kw}']"
                    break

        pred_role = self.config["categories"][top_cat]["target_role"]
        needs_review = True
        #needs_review = (confidence < self.config["confidence_threshold"]) or is_ambiguous          per validare le richieste in automatico

        reasoning = (f"Match categoria '{top_cat}' con keyword: {', '.join(matched_keywords[top_cat])}."
                     f"{priority_reason}")
        if is_ambiguous:
            reasoning += " ATTENZIONE: Rilevati segnali contraddittori con altre categorie."

        elapsed_ms = (time.time() - start_time) * 1000

        return {
            "pred_category": top_cat,
            "pred_priority": pred_priority,
            "pred_role": pred_role,
            "confidence": confidence,
            "needs_review": needs_review,
            "reasoning": reasoning,
            "elapsed_ms": elapsed_ms
        }