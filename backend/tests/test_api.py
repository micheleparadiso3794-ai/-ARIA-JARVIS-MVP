def test_request_lifecycle(client):
    r = client.post(
        "/api/requests",
        json={
            "title": "Guasto caldaia",
            "description": "Pericolo, odore di gas",
            "channel": "Telefono",
        },
    )
    assert r.status_code == 201
    req = r.json()
    assert req["pred_priority"] == "Critica"
    assert req["status"] == "Da revisionare"

    # Non si può mettere in lavorazione prima della revisione umana
    r = client.patch(f"/api/requests/{req['id']}/status", json={"status": "Completato"})
    assert r.status_code == 409

    r = client.post(
        f"/api/requests/{req['id']}/review",
        json={
            "final_category": "Manutenzione Impianti",
            "final_priority": "Critica",
            "final_role": "Luca (Tecnico)",
            "reason": "Confermato",
        },
    )
    assert r.status_code == 200
    assert r.json()["status"] == "In lavorazione"

    r = client.patch(f"/api/requests/{req['id']}/status", json={"status": "Completato"})
    assert r.json()["status"] == "Completato"

    stats = client.get("/api/stats").json()
    assert stats["total"] == 1
    assert stats["by_status"]["Completato"] == 1
    assert stats["pending_review"] == 0


def test_seed_and_filter(client):
    assert client.post("/api/requests/seed").json()["created"] == 30
    pending = client.get("/api/requests", params={"needs_review": True}).json()
    assert len(pending) == 30


def test_test_run_and_compare(client):
    for v in ("A", "B"):
        r = client.post("/api/test-runs", json={"variant": v})
        assert r.status_code == 201
        assert len(r.json()["results"]) == 30
    cmp = client.get("/api/test-runs/compare").json()
    assert cmp["A"]["variant"] == "A" and cmp["B"]["variant"] == "B"


def test_preview_and_meta(client):
    r = client.post("/api/triage/preview", json={"title": "VPN", "description": "server", "variant": "B"})
    assert r.json()["pred_category"] == "Supporto IT & Coordinamento"
    meta = client.get("/api/meta").json()
    assert "Critica" in meta["priorities"]
    assert set(client.get("/api/rules").json()) == {"A", "B"}


def test_feedback(client):
    r = client.post("/api/feedback", json={"session_id": "Tester", "worked_well": "Chiaro"})
    assert r.status_code == 201
    assert len(client.get("/api/feedback").json()) == 1
