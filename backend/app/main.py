from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import lab, misc, organizations, requests
from app.config import get_settings

app = FastAPI(
    title="ARIA/JARVIS API",
    description="Triage delle richieste operative NSE con revisione umana.",
    version="0.2.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (misc.router, organizations.router, requests.router, lab.router):
    app.include_router(router, prefix="/api")
