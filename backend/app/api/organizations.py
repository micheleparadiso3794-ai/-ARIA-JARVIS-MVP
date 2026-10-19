"""Anagrafiche clienti e fornitori con storico delle richieste collegate."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.requests import _build
from app.db import get_db
from app.models import Organization, Request, RequestActivity
from app.schemas import OrganizationCreate, OrganizationHistory, OrganizationOut, RequestCreate

router = APIRouter(prefix="/organizations", tags=["organizations"])


def _clean(value: str | None) -> str | None:
    return value.strip() or None if value is not None else None


def _duplicate(db: Session, values: OrganizationCreate, exclude_id: int | None = None) -> Organization | None:
    terms = []
    if values.tax_id:
        terms.append(Organization.tax_id == values.tax_id.strip().upper())
    if values.customer_code:
        terms.append(Organization.customer_code == values.customer_code.strip().upper())
    if not terms:
        return None
    stmt = select(Organization).where(or_(*terms))
    if exclude_id is not None:
        stmt = stmt.where(Organization.id != exclude_id)
    return db.scalar(stmt)


def _values(data: OrganizationCreate) -> dict:
    return {
        "kind": data.kind,
        "name": data.name.strip(),
        "tax_id": data.tax_id.strip().upper() if data.tax_id and data.tax_id.strip() else None,
        "customer_code": data.customer_code.strip().upper()
        if data.customer_code and data.customer_code.strip()
        else None,
        "email": _clean(data.email),
        "phone": _clean(data.phone),
        "contact_name": _clean(data.contact_name),
        "address": _clean(data.address),
        "notes": _clean(data.notes),
    }


@router.get("", response_model=list[OrganizationOut])
def list_organizations(
    search: str | None = None,
    kind: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Organization).order_by(Organization.name).limit(250)
    if kind in ("Cliente", "Fornitore"):
        stmt = stmt.where(Organization.kind == kind)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Organization.name.ilike(term),
                Organization.tax_id.ilike(term),
                Organization.customer_code.ilike(term),
                Organization.email.ilike(term),
                Organization.contact_name.ilike(term),
            )
        )
    return db.scalars(stmt).all()


@router.post("", response_model=OrganizationOut, status_code=201)
def create_organization(data: OrganizationCreate, db: Session = Depends(get_db)):
    duplicate = _duplicate(db, data)
    if duplicate:
        raise HTTPException(
            409, f"Identificativo già associato a {duplicate.name} (anagrafica n. {duplicate.id})"
        )
    organization = Organization(**_values(data))
    db.add(organization)
    db.commit()
    db.refresh(organization)
    return organization


@router.put("/{organization_id}", response_model=OrganizationOut)
def update_organization(organization_id: int, data: OrganizationCreate, db: Session = Depends(get_db)):
    organization = db.get(Organization, organization_id)
    if organization is None:
        raise HTTPException(404, f"Anagrafica {organization_id} non trovata")
    duplicate = _duplicate(db, data, exclude_id=organization_id)
    if duplicate:
        raise HTTPException(
            409, f"Identificativo già associato a {duplicate.name} (anagrafica n. {duplicate.id})"
        )
    for key, value in _values(data).items():
        setattr(organization, key, value)
    db.commit()
    db.refresh(organization)
    return organization


@router.post("/seed", response_model=dict[str, int])
def seed_demo_organizations(db: Session = Depends(get_db)):
    """Aggiunge anagrafiche e storico fittizi una sola volta; nessun dato reale."""
    demos = [
        (
            "Cliente",
            "Alfa Energia S.r.l.",
            "IT00000000001",
            "CLI-DEMO-001",
            "ufficio@alfa.demo.test",
            "+39 010 555 0101",
            "Elena Rossi",
            "Genova",
            "Impianto sede portuale; contatto preferito email.",
        ),
        (
            "Cliente",
            "Boreale Logistica S.p.A.",
            "IT00000000002",
            "CLI-DEMO-002",
            "tecnico@boreale.demo.test",
            "+39 02 555 0202",
            "Marco Bianchi",
            "Milano",
            "Due magazzini: Nord e Sud. Specificare sempre la sede.",
        ),
        (
            "Cliente",
            "Cascina Verde Soc. Coop.",
            "IT00000000003",
            "CLI-DEMO-003",
            "manutenzione@cascina.demo.test",
            "+39 051 555 0303",
            "Sara Conti",
            "Bologna",
            "Referente disponibile al mattino.",
        ),
        (
            "Fornitore",
            "Delta Ricambi S.r.l.",
            "IT00000000004",
            "FOR-DEMO-001",
            "ordini@delta.demo.test",
            "+39 011 555 0404",
            "Paolo Neri",
            "Torino",
            "Fornisce ricambi pompe e inverter; lead time standard 48 ore.",
        ),
        (
            "Fornitore",
            "Epsilon Servizi IT S.r.l.",
            "IT00000000005",
            "FOR-DEMO-002",
            "supporto@epsilon.demo.test",
            "+39 06 555 0505",
            "Luca Galli",
            "Roma",
            "Assistenza applicativa e credenziali; usare il portale per incidenti P1.",
        ),
        (
            "Fornitore",
            "Futura Trasporti S.c.a.r.l.",
            "IT00000000006",
            "FOR-DEMO-003",
            "ops@futura.demo.test",
            "+39 045 555 0606",
            "Anna Verdi",
            "Verona",
            "Ritiro ricambi e consegne urgenti.",
        ),
    ]
    organizations: dict[str, Organization] = {}
    for values in demos:
        org = db.scalar(select(Organization).where(Organization.tax_id == values[2]))
        if org is None:
            kind, name, tax_id, code, email, phone, contact, city, notes = values
            org = Organization(
                kind=kind,
                name=name,
                tax_id=tax_id,
                customer_code=code,
                email=email,
                phone=phone,
                contact_name=contact,
                address=city,
                notes=notes,
            )
            db.add(org)
            db.flush()
        organizations[values[3]] = org

    demo_ids = [organization.id for organization in organizations.values()]
    existing_demo_requests = db.scalars(select(Request).where(Request.organization_id.in_(demo_ids))).all()
    if existing_demo_requests:
        # Repair the timeline if an earlier demo seed created its initial note with the current time.
        for req in existing_demo_requests:
            for activity in req.activities:
                if activity.actor == "Dati demo" and activity.note == "Richiesta sintetica di esempio.":
                    activity.created_at = req.created_at + timedelta(minutes=5)
        db.commit()
        return {"organizations": len(organizations), "requests": 0}

    samples = [
        (
            "CLI-DEMO-001",
            "Allarme pressione impianto sede portuale",
            "Si ripresenta il calo di pressione sulla pompa principale.",
            "Completato",
            "Intervento completato: sostituita guarnizione pompa; monitoraggio per una settimana.",
        ),
        (
            "CLI-DEMO-001",
            "Fattura manutenzione marzo",
            "Chiediamo copia della fattura e dettaglio delle ore.",
            "Completato",
            "Inviato riepilogo ore e copia fattura al contatto amministrativo.",
        ),
        (
            "CLI-DEMO-001",
            "Nuovo allarme inverter",
            "L'inverter segnala anomalia dopo il riavvio.",
            "In lavorazione",
            "Richiesto log allarmi al tecnico cliente; in attesa di risposta.",
        ),
        (
            "CLI-DEMO-002",
            "Accesso rete magazzino Nord",
            "VPN non funziona per gli operatori del magazzino.",
            "Completato",
            "Ripristinato profilo VPN; verificato accesso con il referente.",
        ),
        (
            "CLI-DEMO-002",
            "Preventivo impianto magazzino Sud",
            "Serve un preventivo per il nuovo impianto.",
            "Completato",
            "Preventivo inviato; cliente valuta l'offerta.",
        ),
        (
            "CLI-DEMO-002",
            "Pompa ferma al magazzino Nord",
            "La pompa è in blocco, impianto fermo.",
            "Da revisionare",
            "Verificare sede Nord e coordinare accesso con Marco.",
        ),
        (
            "CLI-DEMO-003",
            "Perdita circuito serra 2",
            "Perdita d'acqua vicino alla pompa; nessun danno alle colture.",
            "Completato",
            "Serraggio raccordo e prova tenuta; nessuna perdita dopo 30 minuti.",
        ),
        (
            "CLI-DEMO-003",
            "Richiesta informazioni tariffa",
            "Chiarimento sulla tariffa applicata al servizio.",
            "Completato",
            "Spiegato il dettaglio tariffario e inviato documento aggiornato.",
        ),
        (
            "FOR-DEMO-001",
            "Consegna ricambio pompa",
            "Il ricambio della pompa ordinata non è arrivato.",
            "Completato",
            "Fornitore conferma consegna il giorno seguente; tracking condiviso.",
        ),
        (
            "FOR-DEMO-001",
            "Fattura ordine ricambi 882",
            "La fattura riporta un codice articolo errato.",
            "In lavorazione",
            "Richiesta nota credito e riemissione corretta.",
        ),
        (
            "FOR-DEMO-002",
            "Credenziali portale assistenza",
            "L'utenza di supporto è bloccata dopo il cambio password.",
            "Completato",
            "Account sbloccato e accesso verificato con il referente.",
        ),
        (
            "FOR-DEMO-003",
            "Ritiro urgente materiale",
            "Serve organizzare il ritiro di ricambi entro oggi.",
            "Completato",
            "Ritiro pianificato alle 15:00; conferma inviata via email.",
        ),
    ]
    now = datetime.now(UTC)
    for index, (code, title, description, status, outcome) in enumerate(samples):
        req = _build(
            RequestCreate(
                title=title, description=description, channel="Email", organization_id=organizations[code].id
            )
        )
        req.created_at = now - timedelta(days=5 + index * 3)
        req.status = status
        req.needs_review = status == "Da revisionare"
        req.reviewed_at = req.created_at + timedelta(hours=2) if status != "Da revisionare" else None
        db.add(req)
        db.flush()
        db.add(
            RequestActivity(
                request_id=req.id,
                kind="Nota",
                actor="Dati demo",
                note="Richiesta sintetica di esempio.",
                created_at=req.created_at + timedelta(minutes=5),
            )
        )
        if status != "Da revisionare":
            db.add(
                RequestActivity(
                    request_id=req.id,
                    kind="Esito",
                    actor="Dati demo",
                    note=outcome,
                    created_at=req.created_at + timedelta(hours=5),
                )
            )
        if index in (0, 5, 8, 11):
            db.add(
                RequestActivity(
                    request_id=req.id,
                    kind="Impegno",
                    actor="Dati demo",
                    note="Ricontattare il referente e aggiornare la richiesta.",
                    due_at=now + timedelta(days=2),
                    created_at=req.created_at + timedelta(hours=1),
                )
            )
    db.commit()
    return {"organizations": len(organizations), "requests": len(samples)}


@router.get("/{organization_id}/history", response_model=OrganizationHistory)
def organization_history(organization_id: int, db: Session = Depends(get_db)):
    organization = db.scalar(
        select(Organization)
        .options(selectinload(Organization.requests).selectinload(Request.activities))
        .where(Organization.id == organization_id)
    )
    if organization is None:
        raise HTTPException(404, f"Anagrafica {organization_id} non trovata")
    organization.requests.sort(key=lambda req: req.created_at, reverse=True)
    return organization
