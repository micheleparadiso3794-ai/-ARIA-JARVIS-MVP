# Elenco comandi
default:
    @just --list

# Avvia tutto con Docker (http://localhost:8080)
up:
    docker compose up -d --build

# Ferma i container (i dati restano nel volume)
down:
    docker compose down

# Ferma e cancella anche il database
reset:
    docker compose down -v

logs:
    docker compose logs -f

# Sviluppo locale: solo Postgres in Docker
db:
    docker compose up -d db

# Backend in sviluppo con reload (richiede `just db`)
api:
    cd backend && uv run alembic upgrade head && uv run uvicorn app.main:app --reload

# Frontend in sviluppo (http://localhost:5173, /api inoltrato al backend)
web:
    cd frontend && npm run dev

test:
    cd backend && uv run pytest -q

lint:
    cd backend && uv run ruff check . && uv run ruff format --check .
    cd frontend && npm run typecheck && npm run lint
