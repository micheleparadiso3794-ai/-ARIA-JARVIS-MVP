import pytest
import os
from core.triage_engine import RuleBasedTriageEngine
from core.db_manager import DatabaseManager

def test_triage_classification():
    engine = RuleBasedTriageEngine("config_rules_vA.json")
    res = engine.classify("Guasto blocco inverter", "La pompa e l'inverter sono rotti e c'è fumo.")
    assert res["pred_category"] == "Manutenzione Impianti"
    assert res["pred_role"] == "Luca (Tecnico)"

def test_db_manager(tmp_path):
    db_file = tmp_path / "test_db.db"
    db = DatabaseManager(str(db_file))
    req_id = db.insert_request({
        "title": "Test Title",
        "description": "Test Desc",
        "channel": "Email"
    })
    assert req_id == 1
    reqs = db.get_all_requests()
    assert len(reqs) == 1