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

    activity = client.post(
        f"/api/requests/{req['id']}/activities",
        json={"kind": "Esito", "note": "Guarnizione sostituita e impianto verificato.", "actor": "Luca"},
    )
    assert activity.status_code == 201
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


def test_organization_history_and_outcome_lifecycle(client):
    party = client.post(
        "/api/organizations",
        json={
            "kind": "Cliente",
            "name": "Azienda Demo S.r.l.",
            "tax_id": "it12345678901",
            "customer_code": "cli-01",
            "email": "help@example.test",
            "contact_name": "Ada Rossi",
        },
    )
    assert party.status_code == 201
    assert party.json()["tax_id"] == "IT12345678901"

    duplicate = client.post(
        "/api/organizations",
        json={"kind": "Fornitore", "name": "Duplicata S.r.l.", "tax_id": "IT12345678901"},
    )
    assert duplicate.status_code == 409

    req = client.post(
        "/api/requests",
        json={
            "title": "Pompa con perdita",
            "description": "Perdita sulla pompa principale.",
            "organization_id": party.json()["id"],
        },
    ).json()
    assert req["organization"]["name"] == "Azienda Demo S.r.l."
    assert any(item["kind"] == "Stato" for item in req["activities"])

    client.post(
        f"/api/requests/{req['id']}/review",
        json={
            "final_category": "Manutenzione Impianti",
            "final_priority": "Alta",
            "final_role": "Luca",
            "reason": "Confermata",
        },
    )
    blocked = client.patch(f"/api/requests/{req['id']}/status", json={"status": "Completato"})
    assert blocked.status_code == 409

    client.post(
        f"/api/requests/{req['id']}/activities",
        json={"kind": "Esito", "note": "Raccordo sostituito e prova di tenuta completata."},
    )
    completed = client.patch(f"/api/requests/{req['id']}/status", json={"status": "Completato"})
    assert completed.status_code == 200

    history = client.get(f"/api/organizations/{party.json()['id']}/history").json()
    assert len(history["requests"]) == 1
    assert history["requests"][0]["activities"][-1]["kind"] == "Stato"


def test_demo_organizations_seed(client):
    first = client.post("/api/organizations/seed").json()
    assert first == {"organizations": 6, "requests": 12}
    second = client.post("/api/organizations/seed").json()
    assert second == {"organizations": 6, "requests": 0}
    directory = client.get("/api/organizations", params={"search": "Alfa"}).json()
    assert len(directory) == 1 and directory[0]["kind"] == "Cliente"
    assert len(client.get(f"/api/organizations/{directory[0]['id']}/history").json()["requests"]) == 3
