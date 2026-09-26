from typing import List, Optional

from pydantic import BaseModel, Field


class Demographics(BaseModel):
    first_name: str
    last_name: str
    dob: str  # YYYY-MM-DD


class Condition(BaseModel):
    code: str
    diagnosed_on: Optional[str] = None


class Lab(BaseModel):
    name: str
    value: float
    unit: Optional[str] = None
    date: Optional[str] = None


class IngestBundle(BaseModel):
    source_patient_id: str
    demographics: Demographics
    conditions: List[Condition] = []
    meds: List[str] = []
    labs: List[Lab] = []
    notes: List[str] = []


class DispositionUpdate(BaseModel):
    intervention_id: str
    status: str  # "flagged" | "pending_review"


class FinalizeRequest(BaseModel):
    intervention_id: str
    status: str  # "approved" | "rejected"
    confirmed_by: str


class ChatRequest(BaseModel):
    message: str
    intervention_id: Optional[str] = None


class GroqKeyUpdate(BaseModel):
    api_key: str
    model: Optional[str] = None


class LoadTestRequest(BaseModel):
    concurrency: int = Field(default=10, ge=1)
    requests_per_worker: int = Field(default=5, ge=1)
    intervention_id: Optional[str] = None
