"""Tests for the FastAPI app in backend/src/api/main.py.

Covers:
- GET /health remains unauthenticated.
- POST /query and POST /settings/provider-key both require the X-API-Key
  header (matching the AIDLC_API_KEY env var / "dev-local-key" default) and
  reject with 401 otherwise.
- The provider-key file is written with 0o600 permissions.

`run_query` is monkeypatched so these tests never perform real retrieval /
outbound HTTP -- they exercise only the API/auth layer. `LOG_PATH`,
`RUNTIME_DIR`, and `PROVIDER_KEY_PATH` are all redirected into a pytest
tmp_path so tests never touch the real (gitignored) logs/responses.jsonl or
backend/.runtime/provider_key files.
"""
from __future__ import annotations

import json
import os
import stat

import pytest
from fastapi.testclient import TestClient

from backend.src.api import main as main_mod

AIDLC_API_KEY_ENV_VAR = main_mod.AIDLC_API_KEY_ENV_VAR
AIDLC_API_KEY_DEFAULT = main_mod.AIDLC_API_KEY_DEFAULT
API_KEY_HEADER_NAME = main_mod.API_KEY_HEADER_NAME


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Use the documented default key for these tests (env var unset).
    monkeypatch.delenv(AIDLC_API_KEY_ENV_VAR, raising=False)

    # Redirect all filesystem side effects into tmp_path.
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

    return TestClient(main_mod.app)


def test_health_requires_no_auth(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_query_without_api_key_header_is_401(client):
    resp = client.post("/query", json={"query": "what is BRCA1?"})
    assert resp.status_code == 401
    body = resp.json()
    assert API_KEY_HEADER_NAME in body["detail"]


def test_query_with_wrong_api_key_header_is_401(client):
    resp = client.post(
        "/query",
        json={"query": "what is BRCA1?"},
        headers={API_KEY_HEADER_NAME: "totally-wrong-key"},
    )
    assert resp.status_code == 401


def test_query_with_correct_default_api_key_succeeds(client):
    resp = client.post(
        "/query",
        json={"query": "what is BRCA1?"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 200
    assert resp.json()["answer_status"] == "insufficient_evidence"


def test_query_respects_overridden_env_var(client, monkeypatch):
    monkeypatch.setenv(AIDLC_API_KEY_ENV_VAR, "a-real-secret")

    # The old default no longer works once the env var is set.
    resp = client.post(
        "/query",
        json={"query": "x"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 401

    resp = client.post(
        "/query",
        json={"query": "x"},
        headers={API_KEY_HEADER_NAME: "a-real-secret"},
    )
    assert resp.status_code == 200


def test_provider_key_without_api_key_header_is_401(client):
    resp = client.post(
        "/settings/provider-key", json={"provider": "openrouter", "api_key": "sk-abcd1234"}
    )
    assert resp.status_code == 401


def test_provider_key_with_correct_key_succeeds_and_never_echoes_full_key(client):
    resp = client.post(
        "/settings/provider-key",
        json={"provider": "openrouter", "api_key": "sk-abcd1234"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["stored"] is True
    assert body["key_suffix"] == "1234"
    assert "sk-abcd1234" not in json.dumps(body)


def test_provider_key_file_is_written_with_0600_permissions(client):
    resp = client.post(
        "/settings/provider-key",
        json={"provider": "openrouter", "api_key": "sk-abcd1234"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 200

    key_path = main_mod.PROVIDER_KEY_PATH
    assert key_path.exists()
    mode = stat.S_IMODE(os.stat(key_path).st_mode)
    assert mode == 0o600


def test_runtime_dir_itself_is_locked_to_0700_not_just_the_file(client):
    # P2-4: the containing directory must be owner-only too, not just the
    # provider_key file inside it -- otherwise any other local account can
    # `ls` the directory and learn a key is currently stored (existence/
    # size/mtime metadata) even without read access to its contents. The
    # chmod on RUNTIME_DIR (main.py) must run unconditionally on every call,
    # not only the first time the directory is created, so this stays
    # correct even for a directory that pre-existed with a looser mode.
    resp = client.post(
        "/settings/provider-key",
        json={"provider": "openrouter", "api_key": "sk-abcd1234"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 200

    runtime_dir = main_mod.RUNTIME_DIR
    assert runtime_dir.is_dir()
    mode = stat.S_IMODE(os.stat(runtime_dir).st_mode)
    assert mode == 0o700


def test_runtime_dir_is_relocked_to_0700_even_if_it_preexisted_with_a_looser_mode(client):
    # Regression guard for the specific failure mode the security review
    # caught: a directory created *before* the chmod fix landed (so it sits
    # on disk at the permissive default, e.g. 0o775) must still be corrected
    # the next time this endpoint runs, not just on first creation. If the
    # chmod call were ever moved inside an `if not runtime_dir.exists()`
    # branch, this test would catch the regression.
    runtime_dir = main_mod.RUNTIME_DIR
    runtime_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(runtime_dir, 0o775)
    assert stat.S_IMODE(os.stat(runtime_dir).st_mode) == 0o775

    resp = client.post(
        "/settings/provider-key",
        json={"provider": "openrouter", "api_key": "sk-abcd1234"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 200

    mode = stat.S_IMODE(os.stat(runtime_dir).st_mode)
    assert mode == 0o700


def test_provider_key_never_written_to_response_log(client):
    resp = client.post(
        "/settings/provider-key",
        json={"provider": "openrouter", "api_key": "sk-super-secret-value"},
        headers={API_KEY_HEADER_NAME: AIDLC_API_KEY_DEFAULT},
    )
    assert resp.status_code == 200
    # /settings/provider-key never writes to LOG_PATH at all.
    assert not main_mod.LOG_PATH.exists()
