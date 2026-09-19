"""FastAPI app: GET /health, POST /query, POST /settings/provider-key.

Run from the repo root with:
    uvicorn "backend.src.api.main:app" --reload
(quote the module path only because this repo's own path contains a space --
the module path itself has none).
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.src.observability.otel import (
    answer_status_counter,
    get_logger,
    init_observability,
    query_duration_histogram,
    query_requests_counter,
    tracer,
)
from backend.src.orchestrator.orchestrator import run_query
from backend.src.validation.schema_validate import SchemaValidationError

# backend/src/api/main.py -> repo root is three parents up.
_REPO_ROOT = Path(__file__).resolve().parents[3]
LOG_PATH = _REPO_ROOT / "logs" / "responses.jsonl"
RUNTIME_DIR = _REPO_ROOT / "backend" / ".runtime"
PROVIDER_KEY_PATH = RUNTIME_DIR / "provider_key"

_logger = get_logger("aidlc.api")

# Best-effort: if the OTLP collector configured via OTEL_EXPORTER_OTLP_ENDPOINT
# is unreachable or misconfigured, init_observability() logs a warning and
# returns -- it never raises, so app startup and every route below behave
# identically with or without a collector running.
init_observability()

app = FastAPI(title="AIDLC Agentic RAG Backend", version="0.1.0")

# The frontend is served from a different origin/port than this API, so the
# browser needs an explicit CORS allow before it will let a cross-origin
# POST with a JSON body through preflight. allow_origins=["*"] is permissive
# but fine for this POC; a real deployment should scope this down to the
# frontend's actual origin(s) instead of a wildcard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    query: str


class ProviderKeyRequest(BaseModel):
    provider: str
    api_key: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/query")
def query(body: QueryRequest) -> dict:
    # Root span for the whole /query call -- classify/retrieve/ground/
    # assemble-validate spans created inside run_query() (see
    # orchestrator.py) nest under this one automatically via OTel's
    # thread-local current-span context, no explicit context passing needed.
    with tracer.start_as_current_span("POST /query") as span:
        start = time.perf_counter()
        span.set_attribute("aidlc.query.length", len(body.query or ""))
        outcome = "error"
        try:
            if not body.query or not body.query.strip():
                raise HTTPException(status_code=422, detail="query must be a non-empty string")

            # run_query() validates internally and raises SchemaValidationError
            # before returning anything -- that raise is the one real validation
            # gate, so it must be caught right here at the API boundary. Previously
            # this call sat outside the try/except (which instead wrapped a second,
            # redundant validate_response(response) call that could never run on an
            # invalid response, since run_query() would already have raised) --
            # an invalid assembled response became an unhandled exception / generic
            # 500 instead of the intended structured error response.
            try:
                response = run_query(body.query)
            except SchemaValidationError as exc:
                # A response that fails schema validation must never be logged or
                # returned -- surface this as a clear server error instead of an
                # unhandled exception.
                raise HTTPException(
                    status_code=500, detail=f"Assembled response failed schema validation: {exc}"
                )

            outcome = response.get("answer_status", "unknown")
            span.set_attribute("aidlc.answer_status", outcome)
            answer_status_counter.add(1, {"answer_status": outcome})

            LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(LOG_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(response) + "\n")

            return response
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            query_duration_histogram.record(duration_ms, {"outcome": outcome})
            query_requests_counter.add(1, {"outcome": outcome})
            _logger.info(
                "POST /query outcome=%s duration_ms=%.1f", outcome, duration_ms
            )


@app.post("/settings/provider-key")
def set_provider_key(body: ProviderKeyRequest) -> dict:
    if not body.provider or not body.provider.strip():
        raise HTTPException(status_code=422, detail="provider must be a non-empty string")
    if not body.api_key or not body.api_key.strip():
        raise HTTPException(status_code=422, detail="api_key must be a non-empty string")

    # Store ONLY at backend/.runtime/provider_key. Never write the raw key
    # anywhere else -- not logs/responses.jsonl, not stdout, not the HTTP
    # response body. On success we return only the trailing 4 characters so
    # the caller can confirm which key is active without the value ever
    # being echoed back in full.
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    with open(PROVIDER_KEY_PATH, "w", encoding="utf-8") as f:
        f.write(json.dumps({"provider": body.provider}) + "\n")
        f.write(body.api_key)

    return {
        "provider": body.provider,
        "stored": True,
        "key_suffix": body.api_key[-4:] if len(body.api_key) >= 4 else "****",
    }
