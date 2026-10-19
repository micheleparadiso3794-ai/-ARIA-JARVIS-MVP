from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Variant = Literal["A", "B"]
Priority = Literal["Bassa", "Media", "Alta", "Critica"]
Status = Literal["Da revisionare", "Assegnato", "In lavorazione", "Completato"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class KeywordMatch(BaseModel):
    keyword: str
    count: int
    category: str


class TriageInput(BaseModel):
    title: str = ""
    description: str = ""
    variant: Variant = "A"


class TriageResult(BaseModel):
    pred_category: str
    pred_priority: str
    pred_role: str
    confidence: float
    needs_review: bool
    ambiguous: bool
    reasoning: str
    matches: list[KeywordMatch]
    scores: dict[str, int]
    priority_keyword: str | None
    variant: str
    elapsed_ms: float


class RequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    channel: str = "Email"
    user_category: str | None = None
    user_urgency: str | None = None
    notes: str | None = None
    variant: Variant | None = None
    organization_id: int | None = None


class ActivityCreate(BaseModel):
    kind: Literal["Nota", "Intervento", "Esito", "Impegno"] = "Nota"
    note: str = Field(min_length=3, max_length=4000)
    actor: str = Field(default="Operatore NSE", min_length=1, max_length=120)
    due_at: datetime | None = None


class ActivityOut(ORM):
    id: int
    request_id: int
    kind: str
    note: str
    actor: str
    due_at: datetime | None
    created_at: datetime


class OrganizationCreate(BaseModel):
    kind: Literal["Cliente", "Fornitore"]
    name: str = Field(min_length=2, max_length=160)
    tax_id: str | None = Field(default=None, max_length=32)
    customer_code: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=254)
    phone: str | None = Field(default=None, max_length=40)
    contact_name: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=240)
    notes: str | None = None


class OrganizationOut(ORM):
    id: int
    kind: str
    name: str
    tax_id: str | None
    customer_code: str | None
    email: str | None
    phone: str | None
    contact_name: str | None
    address: str | None
    notes: str | None
    created_at: datetime


class OrganizationSummary(BaseModel):
    id: int
    kind: str
    name: str


class RequestOut(ORM):
    id: int
    organization_id: int | None
    organization: OrganizationSummary | None
    title: str
    description: str
    channel: str
    user_category: str | None
    user_urgency: str | None
    notes: str | None
    created_at: datetime
    rule_variant: str
    pred_category: str
    pred_priority: str
    pred_role: str
    confidence: float
    needs_review: bool
    reasoning: str
    matches: list[KeywordMatch]
    status: str
    final_category: str | None
    final_priority: str | None
    final_role: str | None
    correction_reason: str | None
    reviewed_at: datetime | None
    activities: list[ActivityOut]


class OrganizationHistory(OrganizationOut):
    requests: list[RequestOut]


class ReviewIn(BaseModel):
    final_category: str
    final_priority: Priority
    final_role: str
    reason: str = Field(min_length=3)


class StatusIn(BaseModel):
    status: Status


class SeedOut(BaseModel):
    created: int


class TestRunCreate(BaseModel):
    variant: Variant


class TestRunSummary(ORM):
    id: int
    run_date: datetime
    variant: str
    total_samples: int
    accuracy_cat: float
    accuracy_prio: float
    accuracy_role: float
    review_rate: float
    avg_time_ms: float
    accuracy_auto_only: float


class TestRunOut(TestRunSummary):
    results: list[dict[str, Any]]


class FeedbackIn(BaseModel):
    session_id: str = Field(min_length=1, max_length=80)
    worked_well: str = ""
    unclear_aspects: str = ""
    errors_found: str = ""
    suggested_improvements: str = ""
    priority: Priority = "Media"


class FeedbackOut(ORM, FeedbackIn):
    id: int
    created_at: datetime


class Stats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    by_priority: dict[str, int]
    pending_review: int
    test_runs: int


class Meta(BaseModel):
    categories: list[str]
    priorities: list[str]
    roles: list[str]
    channels: list[str]
    statuses: list[str]
    variants: dict[str, str]
    default_variant: str
