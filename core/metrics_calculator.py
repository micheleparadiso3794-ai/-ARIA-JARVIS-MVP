class MetricsCalculator:
    @staticmethod
    def calculate_run_metrics(results):
        """
        results: Lista di dict con chiavi:
        - target_cat, pred_cat
        - target_prio, pred_prio
        - target_role, pred_role
        - needs_review, elapsed_ms
        """
        total = len(results)
        if total == 0:
            return {
                "total": 0, "accuracy_cat": 0, "accuracy_prio": 0,
                "accuracy_role": 0, "review_rate": 0, "avg_time_ms": 0,
                "correct_auto": 0, "auto_count": 0
            }

        correct_cat = sum(1 for r in results if r["target_cat"] == r["pred_cat"])
        correct_prio = sum(1 for r in results if r["target_prio"] == r["pred_prio"])
        correct_role = sum(1 for r in results if r["target_role"] == r["pred_role"])
        reviews = sum(1 for r in results if r["needs_review"])
        total_time = sum(r["elapsed_ms"] for r in results)

        # Performance escludendo i casi inviati a revisione
        auto_cases = [r for r in results if not r["needs_review"]]
        correct_auto = sum(1 for r in auto_cases if r["target_cat"] == r["pred_cat"]) if auto_cases else 0

        return {
            "total": total,
            "accuracy_cat": round((correct_cat / total) * 100, 2),
            "accuracy_prio": round((correct_prio / total) * 100, 2),
            "accuracy_role": round((correct_role / total) * 100, 2),
            "review_rate": round((reviews / total) * 100, 2),
            "avg_time_ms": round(total_time / total, 2),
            "auto_count": len(auto_cases),
            "accuracy_auto_only": round((correct_auto / len(auto_cases)) * 100, 2) if auto_cases else 0.0
        }