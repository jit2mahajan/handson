import hmac
import os
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Sibling modules (candidate_service, db, models, ...) live in backend/src/,
# resolved via PYTHONPATH=/app/backend/src set in the Dockerfile.
import candidate_service
import chatbot
import db
import groq_client
import ingestion
import load_test
import seed_patients
from models import (
    ChatRequest,
    DispositionUpdate,
    FinalizeRequest,
    GroqKeyUpdate,
    IngestBundle,
    LoadTestRequest,
)
from observability.otel import (
    chat_duration_histogram,
    chat_requests_counter,
    finalize_counter,
    init_observability,
    screen_duration_histogram,
    screen_escalations_counter,
    screen_requests_counter,
    tracer,
)

API_KEY = os.environ.get("AIDLC_API_KEY", "dev-local-key")
CORS_ORIGINS = os.environ.get("AIDLC_CORS_ORIGINS", "http://localhost:8080").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_observability()
    await db.get_pool()
    seeded_count = await seed_patients.seed_if_empty()
    print(f"[startup] seeded {seeded_count} synthetic patients", flush=True)
    yield
    await db.close_pool()


app = FastAPI(title="Qualified Health — Candidate API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def require_api_key(x_api_key: str = Header(default="")) -> None:
    if not hmac.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ingest/{source}", dependencies=[Depends(require_api_key)])
async def ingest_source(source: str, bundle: IngestBundle):
    patient_key = await ingestion.ingest(source, bundle)
    return {"patient_key": patient_key}


@app.post("/screen/{intervention_id}", dependencies=[Depends(require_api_key)])
async def screen(intervention_id: str):
    with tracer.start_as_current_span("screen") as span:
        span.set_attribute("qh.intervention_id", intervention_id)
        screen_requests_counter.add(1, {"intervention_id": intervention_id})
        start = time.monotonic()
        try:
            results = await candidate_service.screen_intervention(intervention_id)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        finally:
            screen_duration_histogram.record(
                (time.monotonic() - start) * 1000, {"intervention_id": intervention_id}
            )
        escalations = sum(1 for r in results if r["escalation"]["required"])
        if escalations:
            screen_escalations_counter.add(escalations, {"intervention_id": intervention_id})
        return {"screened": len(results), "candidates": results}


@app.get("/candidates", dependencies=[Depends(require_api_key)])
async def list_candidates(intervention_id: str | None = Query(default=None)):
    return await db.get_candidates(intervention_id)


@app.patch("/candidates/{patient_key}", dependencies=[Depends(require_api_key)])
async def patch_candidate(patient_key: str, body: DispositionUpdate):
    try:
        updated = await candidate_service.update_disposition(
            patient_key, body.intervention_id, body.status
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"patient_key": patient_key, "intervention_id": body.intervention_id, "status": body.status}


@app.post("/candidates/{patient_key}/finalize", dependencies=[Depends(require_api_key)])
async def finalize_candidate(patient_key: str, body: FinalizeRequest):
    with tracer.start_as_current_span("finalize") as span:
        span.set_attribute("qh.intervention_id", body.intervention_id)
        span.set_attribute("qh.status", body.status)
        try:
            updated = await candidate_service.finalize_candidate(
                patient_key, body.intervention_id, body.status, body.confirmed_by
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if not updated:
            raise HTTPException(status_code=404, detail="Candidate not found")
        finalize_counter.add(1, {"status": body.status})
        return {"patient_key": patient_key, "intervention_id": body.intervention_id, "status": body.status}


@app.post("/chat", dependencies=[Depends(require_api_key)])
async def chat(body: ChatRequest):
    with tracer.start_as_current_span("chat") as span:
        if body.intervention_id:
            span.set_attribute("qh.intervention_id", body.intervention_id)
        chat_requests_counter.add(1)
        start = time.monotonic()
        try:
            return await chatbot.answer(body.message, body.intervention_id)
        finally:
            chat_duration_histogram.record((time.monotonic() - start) * 1000)


@app.post("/config/groq-key", dependencies=[Depends(require_api_key)])
async def set_groq_key(body: GroqKeyUpdate):
    groq_client.set_api_key(body.api_key, body.model)
    return {"configured": True}


@app.post("/loadtest/chat", dependencies=[Depends(require_api_key)])
async def loadtest_chat(body: LoadTestRequest):
    concurrency = min(body.concurrency, 50)
    requests_per_worker = min(body.requests_per_worker, 20)
    return await load_test.run(concurrency, requests_per_worker, body.intervention_id, API_KEY)
