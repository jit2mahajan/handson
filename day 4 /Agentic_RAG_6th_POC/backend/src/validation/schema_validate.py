"""Validates an assembled response dict against data/schema/response_schema.json.

Every response this backend emits or logs MUST pass through
`validate_response()` first. This is a hard gate, not a formality: on failure
it raises `SchemaValidationError` with the underlying jsonschema error detail
so a malformed response can never silently reach a user or
`logs/responses.jsonl`.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import jsonschema
from jsonschema import Draft7Validator

# backend/src/validation/schema_validate.py -> repo root is four parents up.
_REPO_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = _REPO_ROOT / "data" / "schema" / "response_schema.json"


class SchemaValidationError(Exception):
    """Raised when a response dict does not validate against response_schema.json."""


@lru_cache(maxsize=1)
def _load_schema() -> dict:
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def load_schema() -> dict:
    return _load_schema()


def validate_response(response: dict) -> None:
    """Validate `response` against the draft-07 AgenticRAGResponse schema.

    Raises SchemaValidationError (with all validation error messages joined,
    not just the first) if it does not validate. Returns None on success.
    """
    schema = load_schema()
    validator = Draft7Validator(schema)
    errors = sorted(validator.iter_errors(response), key=lambda e: list(e.path))
    if errors:
        details = "; ".join(f"{list(e.path)}: {e.message}" for e in errors)
        raise SchemaValidationError(
            f"Response failed schema validation against {SCHEMA_PATH.name}: {details}"
        )


def is_valid(response: dict) -> bool:
    """Non-raising convenience check. Prefer validate_response() at call sites
    that must hard-fail; this is for callers that want a boolean first."""
    try:
        validate_response(response)
        return True
    except SchemaValidationError:
        return False
