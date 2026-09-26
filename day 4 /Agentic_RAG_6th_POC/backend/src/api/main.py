"""FastAPI app: GET /health, POST /query, POST /settings/provider-key.

Run from the repo root with:
    uvicorn "backend.src.api.main:app" --reload
(quote the module path only because this repo's own path contains a space --
the module path itself has none).
"""
from __future__ import annotations

import hmac
import json
import os
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

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

# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
#
# Every state-changing route (POST /query, POST /settings/provider-key) is
# gated behind a single shared API key, read from the AIDLC_API_KEY env var.
# For this POC, an unset env var falls back to a documented dev default
# ("dev-local-key") so the app stays demoable with zero setup -- but any
# real/non-local deployment MUST set AIDLC_API_KEY to something else, since
# the default is public (checked into this file and backend/README.md).
#
# Contract (also documented in backend/README.md "Auth" section -- keep
# both in sync): callers send the key in the `X-API-Key` request header.
# A missing/incorrect header gets a 401 with a clear JSON error body; it is
# never silently downgraded to a different status code.
AIDLC_API_KEY_ENV_VAR = "AIDLC_API_KEY"
AIDLC_API_KEY_DEFAULT = "dev-local-key"
API_KEY_HEADER_NAME = "X-API-Key"

_api_key_header = APIKeyHeader(name=API_KEY_HEADER_NAME, auto_error=False)


def require_api_key(api_key: str | None = Depends(_api_key_header)) -> str:
    expected = os.environ.get(AIDLC_API_KEY_ENV_VAR, AIDLC_API_KEY_DEFAULT)
    # Guard the empty/missing-key case first: hmac.compare_digest requires
    # two non-empty same-type (bytes) arguments, and a falsy api_key must
    # never reach it. The actual comparison is constant-time so response
    # timing can't be used to brute-force the key one byte at a time.
    if not api_key or not hmac.compare_digest(api_key.encode(), expected.encode()):
        raise HTTPException(
            status_code=401,
            detail=(
                f"Missing or invalid {API_KEY_HEADER_NAME} header. Set the "
                f"{API_KEY_HEADER_NAME} request header to the value configured "
                f"via the {AIDLC_API_KEY_ENV_VAR} environment variable."
            ),
        )
    return api_key

# Best-effort: if the OTLP collector configured via OTEL_EXPORTER_OTLP_ENDPOINT
# is unreachable or misconfigured, init_observability() logs a warning and
# returns -- it never raises, so app startup and every route below behave
# identically with or without a collector running.
init_observability()

app = FastAPI(title="AIDLC Agentic RAG Backend", version="0.1.0")


# --------------------------------------------------------------------------
# Request body size cap (P1-1)
# --------------------------------------------------------------------------
#
# `Field(max_length=2000)` on QueryRequest/ProviderKeyRequest only caps a
# *validated* field's length -- Pydantic can't reject anything until
# Starlette has already fully read the raw request body into memory and
# FastAPI has parsed it as JSON. A caller who sends a Content-Length of,
# say, 500 MB would have that entire body buffered in memory before any
# 422 has a chance to fire, which is a memory-exhaustion DoS independent of
# the field-level length checks.
#
# This is a raw ASGI middleware (not BaseHTTPMiddleware, which itself has
# to buffer/re-stream the body to call the inner app) so it can inspect the
# declared Content-Length header and reject oversized requests with a 413
# before a single byte of the body is read by anything downstream --
# Pydantic, FastAPI's JSON parsing, and Starlette's body-buffering are all
# still untouched at the point this check runs.
#
# 16 KiB is generous headroom over the 2000-character (<= ~8 KB for
# multi-byte UTF-8, well under 16 KB) JSON fields this API actually accepts;
# it only guards the declared `Content-Length` header, so a request that
# omits it and instead streams an unbounded chunked body is a distinct
# (slow-body) DoS vector not addressed here.
MAX_BODY_BYTES = 16 * 1024


class MaxBodySizeMiddleware:
    """Reject any HTTP request whose declared Content-Length exceeds a cap.

    Runs before the body is read/buffered by anything else in the stack --
    it only looks at the `content-length` request header on the ASGI scope.
    """

    def __init__(self, app, max_body_bytes: int = MAX_BODY_BYTES) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        raw_content_length = None
        for name, value in scope.get("headers") or []:
            if name == b"content-length":
                raw_content_length = value
                break

        if raw_content_length is not None:
            try:
                declared_length = int(raw_content_length)
            except ValueError:
                declared_length = None

            if declared_length is not None and declared_length > self.max_body_bytes:
                response = JSONResponse(
                    status_code=413,
                    content={
                        "detail": (
                            f"Request body too large: Content-Length "
                            f"{declared_length} bytes exceeds the "
                            f"{self.max_body_bytes}-byte limit."
                        )
                    },
                )
                await response(scope, receive, send)
                return

        await self.app(scope, receive, send)


# Registered before CORSMiddleware below so it ends up as the outermost
# layer (Starlette treats the earliest-added user middleware as outermost/
# closest to the client) -- the body-size check runs first, ahead of even
# CORS handling, on every request.
app.add_middleware(MaxBodySizeMiddleware)

# The frontend is served from a different origin/port than this API, so the
# browser needs an explicit CORS allow before it will let a cross-origin
# POST with a JSON body through preflight. Scoped via AIDLC_CORS_ORIGINS
# (comma-separated list of allowed origins) rather than a wildcard, since
# allow_origins=["*"] would let any site issue authenticated-looking
# requests against this API. Defaults to the local frontend dev origin.
_cors_origins_env = os.environ.get("AIDLC_CORS_ORIGINS")
if _cors_origins_env:
    _cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
else:
    _cors_origins = ["http://localhost:8080"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=False,
    # Narrowed to the actual set of methods/headers this API uses (GET
    # /health, POST /query, POST /settings/provider-key with a JSON body and
    # the X-API-Key auth header) rather than a wildcard.
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


# --------------------------------------------------------------------------
# Rate limiting (POC-only)
# --------------------------------------------------------------------------
#
# Minimal hand-rolled in-memory sliding-window limiter keyed by the caller's
# API key (falling back to client IP if no key was presented, e.g. a 401
# will still be rate-limited so an attacker can't brute-force the key
# unbounded). This is intentionally simple: a per-process dict of deques.
#
# NOT DISTRIBUTED-DEPLOYMENT-SAFE: state lives only in this process's memory,
# so it does not work correctly behind multiple app instances/workers or
# across restarts (each gets its own independent counters). That's an
# accepted limitation for this single-process POC; a real deployment would
# need a shared store (e.g. Redis) instead.
RATE_LIMIT_MAX_REQUESTS = 30
RATE_LIMIT_WINDOW_SECONDS = 60.0

_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)


def _rate_limit_key(request: Request) -> str:
    api_key = request.headers.get(API_KEY_HEADER_NAME)
    if api_key:
        return f"key:{api_key}"
    client = request.client
    return f"ip:{client.host if client else 'unknown'}"


def enforce_rate_limit(request: Request) -> None:
    key = _rate_limit_key(request)
    now = time.monotonic()
    bucket = _rate_limit_buckets[key]

    # Drop timestamps that have aged out of the sliding window.
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    while bucket and bucket[0] < cutoff:
        bucket.popleft()

    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Rate limit exceeded: max {RATE_LIMIT_MAX_REQUESTS} requests per "
                f"{RATE_LIMIT_WINDOW_SECONDS:.0f}s per caller. Try again later."
            ),
        )

    bucket.append(now)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)


class ProviderKeyRequest(BaseModel):
    provider: str = Field(min_length=1, max_length=2000)
    api_key: str = Field(min_length=1, max_length=2000)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/query")
def query(
    body: QueryRequest,
    # Rate limit is checked before the API key so that repeated wrong-key
    # attempts are throttled too (not just successful/authenticated calls) --
    # otherwise an attacker could hammer this route with bad keys forever
    # without ever tripping the limiter.
    _rate_limit: None = Depends(enforce_rate_limit),
    _api_key: str = Depends(require_api_key),
) -> dict:
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
                # unhandled exception. The underlying jsonschema error string can
                # embed actual (possibly sensitive) response content, so it is
                # logged server-side only -- never echoed into the client-facing
                # HTTP detail, which stays a fixed, generic message.
                _logger.error(
                    "POST /query: assembled response failed schema validation: %s", exc
                )
                raise HTTPException(
                    status_code=500,
                    detail="Assembled response failed validation; see server logs.",
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
def set_provider_key(
    body: ProviderKeyRequest,
    # See /query above: rate limit is checked before the API key so repeated
    # wrong-key attempts get throttled too.
    _rate_limit: None = Depends(enforce_rate_limit),
    _api_key: str = Depends(require_api_key),
) -> dict:
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
    # The runtime dir may be created with a permissive umask; explicitly lock
    # it down to owner-only access (not just the key file inside it), so the
    # directory listing/contents aren't group/world-readable either.
    os.chmod(RUNTIME_DIR, 0o700)
    with open(PROVIDER_KEY_PATH, "w", encoding="utf-8") as f:
        f.write(json.dumps({"provider": body.provider}) + "\n")
        f.write(body.api_key)
    # Explicitly lock the key file down to owner-read/write only so it isn't
    # world-readable.
    os.chmod(PROVIDER_KEY_PATH, 0o600)

    # Audit trail (server-side log only, never logs/responses.jsonl): record
    # that a provider key rotation happened, by whom (well, that some caller
    # with a valid X-API-Key did it) and when -- but never the key value
    # itself, not even truncated, in this log line. This lets an operator
    # distinguish legitimate rotation from unexpected/unauthorized changes
    # after the fact; it does not by itself prevent unauthorized rotation by
    # anyone holding the shared API key (see backend/README.md "Auth model
    # limitations").
    _logger.info(
        "POST /settings/provider-key: provider key rotated provider=%s at=%s",
        body.provider,
        datetime.now(timezone.utc).isoformat(),
    )

    return {
        "provider": body.provider,
        "stored": True,
        "key_suffix": body.api_key[-4:] if len(body.api_key) >= 4 else "****",
    }
