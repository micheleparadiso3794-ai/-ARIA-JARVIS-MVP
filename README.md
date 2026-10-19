# ARIA / JARVIS — MVP triage richieste operative (Fase 5 ITS 4.0)

> Le richieste non si perdono. Diventano lavoro.

Prototipo per **NSE** che trasforma le richieste in arrivo (guasti, fatture, offerte, problemi IT) in lavoro assegnato:

1. **Ingresso**: la richiesta viene scritta o caricata dai casi di prova.
2. **Triage deterministico**: un motore a regole propone reparto, urgenza e responsabile, evidenziando le parole chiave che ha riconosciuto.
3. **Revisione umana**: una persona conferma o corregge la proposta, con motivazione. Solo dopo la richiesta passa al responsabile.
4. **Prove sul motore**: le due varianti di regole (A e B) vengono misurate su 30 casi sintetici e confrontate.

Tutti i dati sono sintetici. Le misure sul dataset sono una verifica preliminare, non un risultato in produzione.

## Avvio

Serve solo Docker.

```bash
docker compose up -d --build
```

Apri <http://localhost:8080>. Al primo avvio la coda è vuota: scrivi una richiesta o premi «Carica 30 richieste di prova».

| Servizio  | Cosa fa                                                   | Indirizzo                           |
| --------- | --------------------------------------------------------- | ----------------------------------- |
| `web`     | Caddy: serve il frontend e inoltra `/api` al backend      | <http://localhost:8080>             |
| `backend` | FastAPI; applica le migrazioni Alembic all'avvio          | <http://localhost:8080/api/docs>    |
| `db`      | PostgreSQL 17, dati nel volume `pgdata`                   | `127.0.0.1:55432` (solo in locale)  |

Porte e credenziali si cambiano copiando `.env.example` in `.env`.

```bash
docker compose down      # ferma, i dati restano
docker compose down -v   # ferma e cancella il database
```

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, componenti in stile shadcn/ui su Base UI, TanStack Router (routing a file) e TanStack Query, Axios, Lucide, Sonner. Font Google Sans.
- **Backend**: Python 3.12, FastAPI, Uvicorn, Pydantic, pydantic-settings.
- **Database**: PostgreSQL, SQLAlchemy 2, psycopg 3, Alembic.
- **Strumenti**: uv, npm, pytest + HTTPX, Ruff, TypeScript, Oxlint, Docker Compose, just.

## Struttura

```
backend/
  app/
    main.py            app FastAPI e router
    triage.py          motore a regole e metriche
    dataset.py         30 casi sintetici con risposta attesa
    rules/             config_rules_vA.json, config_rules_vB.json
    api/               requests (coda e revisione), lab (prove, regole), misc (meta, stats, feedback)
    models.py          tabelle SQLAlchemy
  alembic/             migrazioni
  tests/               pytest (motore e API)
frontend/
  src/routes/          una pagina per file: panoramica, nuova, coda, revisione, prove, regole, feedback
  src/components/      componenti UI e di dominio
  src/lib/api.ts       tipi, query e mutation
  Caddyfile            server statico e proxy /api
docker-compose.yml
justfile
```

## Sviluppo locale

Con [just](https://github.com/casey/just), uv e Node installati:

```bash
just db     # solo Postgres in Docker
just api    # backend con reload su :8000
just web    # frontend con hot reload su :5173
just test   # pytest
just lint   # ruff, tsc, oxlint
```

## Regole del motore

- Ogni parola chiave trovata nel testo vale un punto per il suo reparto. Vince il reparto con più punti.
- La sicurezza è la quota di punti del reparto vincente; se due reparti sono alla pari è limitata al 49% e la richiesta è segnata come ambigua.
- Le parole di urgenza alzano la priorità. Se compaiono parole di più livelli vale la più grave.
- Con `require_human_review: true` (predefinito in entrambe le varianti) ogni richiesta passa dalla revisione umana. Con `false` vanno in revisione solo i casi sotto soglia, ambigui o non classificati.
