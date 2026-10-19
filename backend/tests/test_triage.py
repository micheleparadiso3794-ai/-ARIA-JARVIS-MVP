from app.triage import UNCLASSIFIED, TriageEngine, calculate_run_metrics


def test_classifies_maintenance():
    res = TriageEngine("A").classify("Guasto blocco inverter", "La pompa e l'inverter sono rotti e c'è fumo.")
    assert res["pred_category"] == "Manutenzione Impianti"
    assert res["pred_role"] == "Luca (Tecnico)"
    assert {m["keyword"] for m in res["matches"]} >= {"guasto", "inverter", "pompa", "fumo"}


def test_most_severe_booster_wins():
    # "blocco totale" (Critica) e "bloccato" (Alta): deve vincere la più grave
    res = TriageEngine("A").classify("Inverter bloccato", "Impianto in blocco totale")
    assert res["pred_priority"] == "Critica"
    assert res["priority_keyword"] == "blocco totale"


def test_unclassified_goes_to_review():
    res = TriageEngine("A").classify("Ciao", "Richiamatemi")
    assert res["pred_category"] == UNCLASSIFIED
    assert res["needs_review"] is True
    assert res["confidence"] == 0.0


def test_ambiguous_caps_confidence():
    res = TriageEngine("A").classify("Fattura caldaia", "")
    assert res["ambiguous"] is True
    assert res["confidence"] <= 0.49


def test_metrics_empty():
    assert calculate_run_metrics([])["total"] == 0
