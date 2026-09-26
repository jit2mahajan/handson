"""Tests for the V3 security hardening pass on backend/src/api/main.py.

Covers (per reports/spec/2026-09-26-v3-security-review.draft.md and the
2026-09-26-v3-security-review.md finalization follow-up):
- P1-2: the in-memory rate limiter trips after N requests and returns 429.
- P1-1 / P2-6: `max_length` on `query` / `provider` / `api_key` rejects
  oversized input with a 422 (Pydantic validation), not an unbounded body.
- P1-1 (finalization follow-up): `MaxBodySizeMiddleware` rejects a request
  whose declared `Content-Length` exceeds the cap with a 413, before the
  body is ever read/buffered or Pydantic validation runs -- this is the
  part `Field(max_length=...)` alone cannot cover, since that only caps a
  field's length *after* the whole body has already been buffered.
- P2-1: the constant-time API key comparison still accepts the correct key
  and still rejects wrong keys (behavior-preserving; `hmac.compare_digest`
  swap must not change the auth outcome, only its timing characteristics).

`run_query` is monkeypatched so these tests never perform real retrieval.
`LOG_PATH` / `RUNTIME_DIR` / `PROVIDER_KEY_PATH` are redirected into a pytest
tmp_path. The module-level rate-limit bucket dict is cleared before each
test so tests don't leak state into one another (it's a per-process global,
by design -- see the POC-limitation comment in main.py).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.src.api import main as main_mod

API_KEY_HEADER_NAME = main_mod.API_KEY_HEADER_NAME
AIDLC_API_KEY_ENV_VAR = main_mod.AIDLC_API_KEY_ENV_VAR
AIDLC_API_KEY_DEFAULT = main_mod.AIDLC_API_KEY_DEFAULT


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.delenv(AIDLC_API_KEY_ENV_VAR, raising=False)

    monkeypatch.setattr(main_mod, "LOG_PATH", tmp_path / "responses.jsonl")
    monkeypatch.setattr(main_mod, "RUNTIME_DIR", tmp_path / "runtime")
    monkeypatch.setattr(main_mod, "PROVIDER_KEY_PATH", tmp_path / "runtime" / "provider_key")

    def fake_run_query(query: str) -> dict:
        return {
            "query": query,
            "answer_status": "insufficient_evidence",
            "claims": [],
            "overall_confidence": "low",
            "escalation": {"required": False, "reason": "no domain matched (test stub)"},
        }

    monkeypatch.setattr(main_mod, "run_query", fake_run_query)

    # Rate limiter state is a module-level global -- reset it, and use a
    # small limit so tests don't need to fire 30+ requests to trip it.
    main_mod._rate_limit_buckets.clear()
    monkeypatch.setattr(main_mod, "RATE_LIMIT_MAX_REQUESTS", 3)
    monkeypatch.setattr(main_mod, "RATE_LIMIT_WINDOW_SECONDS", 60.0)

    return TestClient(main_mod.app)


# --------------------------------------------------------------------------
# P1-2: rate limiting
# --------------------------------------------------------------------------


def test_query_rate_limit_trips_after_max_requests(client):
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}

    for _ in range(main_mod.RATE_LIMIT_MAX_REQUESTS):
        resp = client.post("/query", json={"query": "what is BRCA1?"}, headers=headers)
        assert resp.status_code == 200

    resp = client.post("/query", json={"query": "what is BRCA1?"}, headers=headers)
    assert resp.status_code == 429
    assert "rate limit" in resp.json()["detail"].lower()


def test_provider_key_rate_limit_trips_after_max_requests(client):
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    body = {"provider": "openrouter", "api_key": "sk-abcd1234"}

    for _ in range(main_mod.RATE_LIMIT_MAX_REQUESTS):
        resp = client.post("/settings/provider-key", json=body, headers=headers)
        assert resp.status_code == 200

    resp = client.post("/settings/provider-key", json=body, headers=headers)
    assert resp.status_code == 429


def test_rate_limit_is_tracked_even_with_wrong_api_key(client):
    # Wrong-key attempts must also count against the limiter, otherwise an
    # attacker could brute-force the key with unlimited unauthenticated
    # attempts. The rate limit check runs before the API key check.
    headers = {API_KEY_HEADER_NAME: "totally-wrong-key"}

    for _ in range(main_mod.RATE_LIMIT_MAX_REQUESTS):
        resp = client.post("/query", json={"query": "x"}, headers=headers)
        assert resp.status_code == 401

    resp = client.post("/query", json={"query": "x"}, headers=headers)
    assert resp.status_code == 429


def test_rate_limit_buckets_are_independent_per_api_key(client):
    # A different caller (different key) has its own bucket and is not
    # penalized by another caller's requests.
    key_a = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    key_b = {API_KEY_HEADER_NAME: "some-other-caller-key"}

    for _ in range(main_mod.RATE_LIMIT_MAX_REQUESTS):
        resp = client.post("/query", json={"query": "x"}, headers=key_a)
        assert resp.status_code == 200

    # key_a is now exhausted...
    resp = client.post("/query", json={"query": "x"}, headers=key_a)
    assert resp.status_code == 429

    # ...but key_b (wrong key, so 401, not 429) is unaffected by key_a's usage.
    resp = client.post("/query", json={"query": "x"}, headers=key_b)
    assert resp.status_code == 401


# --------------------------------------------------------------------------
# P1-1 / P2-6: max_length on query / provider / api_key
# --------------------------------------------------------------------------


def test_query_over_max_length_is_422(client):
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    oversized = "a" * 2001
    resp = client.post("/query", json={"query": oversized}, headers=headers)
    assert resp.status_code == 422


def test_query_at_max_length_is_accepted(client):
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    at_limit = "a" * 2000
    resp = client.post("/query", json={"query": at_limit}, headers=headers)
    assert resp.status_code == 200


def test_query_empty_string_is_422_via_min_length(client):
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    resp = client.post("/query", json={"query": ""}, headers=headers)
    assert resp.status_code == 422


def test_provider_key_provider_over_max_length_is_422(client):
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    resp = client.post(
        "/settings/provider-key",
        json={"provider": "a" * 2001, "api_key": "sk-abcd1234"},
        headers=headers,
    )
    assert resp.status_code == 422


def test_provider_key_api_key_over_max_length_is_422(client):
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    resp = client.post(
        "/settings/provider-key",
        json={"provider": "openrouter", "api_key": "a" * 2001},
        headers=headers,
    )
    assert resp.status_code == 422


# --------------------------------------------------------------------------
# P1-1 (finalization follow-up): MaxBodySizeMiddleware rejects oversized
# raw request bodies via Content-Length, before Pydantic/JSON parsing runs.
# --------------------------------------------------------------------------


def test_query_with_oversized_raw_body_is_413_not_422(client):
    # A raw body whose declared Content-Length exceeds the cap must be
    # rejected by the middleware (413) -- it must never reach Pydantic's
    # field-level max_length check (which would instead surface as a 422),
    # because reaching Pydantic at all means the oversized body was already
    # fully buffered into memory, which is exactly the DoS this middleware
    # exists to prevent.
    oversized_body = b'{"query": "' + (b"a" * (main_mod.MAX_BODY_BYTES + 1)) + b'"}'
    resp = client.post(
        "/query",
        content=oversized_body,
        headers={
            "Content-Type": "application/json",
            API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT,
        },
    )
    assert resp.status_code == 413
    assert "too large" in resp.json()["detail"].lower()


def test_provider_key_with_oversized_raw_body_is_413(client):
    oversized_body = (
        b'{"provider": "openrouter", "api_key": "'
        + (b"a" * (main_mod.MAX_BODY_BYTES + 1))
        + b'"}'
    )
    resp = client.post(
        "/settings/provider-key",
        content=oversized_body,
        headers={
            "Content-Type": "application/json",
            API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT,
        },
    )
    assert resp.status_code == 413


def test_oversized_body_is_rejected_even_without_an_api_key(client):
    # The body-size check must run ahead of auth too, mirroring the rate
    # limiter's "unauthenticated attempts still count" property -- otherwise
    # an attacker without a valid key could still drive the memory-buffering
    # DoS by omitting X-API-Key entirely.
    oversized_body = b"x" * (main_mod.MAX_BODY_BYTES + 1)
    resp = client.post(
        "/query",
        content=oversized_body,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 413


def test_body_at_or_under_cap_is_not_rejected_by_size_middleware(client):
    # A body within the cap sails through the middleware untouched and is
    # handled normally by the route (200, not 413/422).
    headers = {API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT}
    resp = client.post("/query", json={"query": "what is BRCA1?"}, headers=headers)
    assert resp.status_code == 200


# --------------------------------------------------------------------------
# P2-1: constant-time comparison preserves auth behavior
# --------------------------------------------------------------------------


def test_constant_time_comparison_still_accepts_correct_key(client):
    resp = client.post(
        "/query",
        json={"query": "what is BRCA1?"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 200


def test_constant_time_comparison_still_rejects_wrong_key(client):
    resp = client.post(
        "/query",
        json={"query": "what is BRCA1?"},
        headers={API_KEY_HEADER_NAME: "wrong-key"},
    )
    assert resp.status_code == 401


def test_constant_time_comparison_rejects_empty_key(client):
    # Guards the empty-key path that must short-circuit before
    # hmac.compare_digest (which requires non-empty same-type args).
    resp = client.post(
        "/query",
        json={"query": "what is BRCA1?"},
        headers={API_KEY_HEADER_NAME: ""},
    )
    assert resp.status_code == 401


def test_constant_time_comparison_rejects_key_that_is_prefix_of_correct_key(client):
    # A naive/short-circuiting comparison and a constant-time one should
    # both reject this -- asserting the observable behavior is unchanged.
    prefix = AIDLC_API_KEY_DEFAULT[:-1]
    resp = client.post(
        "/query",
        json={"query": "what is BRCA1?"},
        headers={API_KEY_HEADER_NAME: prefix},
    )
    assert resp.status_code == 401
