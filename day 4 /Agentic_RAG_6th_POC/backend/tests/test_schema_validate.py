"""Unit tests for backend/src/validation/schema_validate.py.

Confirms a response that fails schema validation against
data/schema/response_schema.json is correctly rejected (raises
SchemaValidationError / is_valid() returns False), and that a well-formed
response passes. No HTTP, no filesystem writes beyond the schema file this
module already reads.
"""
from __future__ import annotations

import pytest

from backend.src.validation.schema_validate import (
    SchemaValidationError,
    is_valid,
    validate_response,
)


def _valid_response() -> dict:
    return {
        "query": "What is the function of BRCA1?",
        "answer_status": "answered",
        "claims": [
            {
                "statement": "BRCA1 is a tumor suppressor gene.",
                "confidence": "high",
                "evidence_domain": "target_identification_validation",
                "citations": [
                    {
                        "source_domain": "target_identification_validation",
                        "url": "https://www.ncbi.nlm.nih.gov/pubmed/1",
                        "retrieved_at": "2026-09-26T00:00:00Z",
                    }
                ],
            }
        ],
        "overall_confidence": "high",
        "escalation": {"required": False, "reason": None},
    }


def test_valid_response_passes():
    # Must not raise.
    validate_response(_valid_response())
    assert is_valid(_valid_response()) is True


def test_missing_required_top_level_field_is_rejected():
    response = _valid_response()
    del response["escalation"]
    with pytest.raises(SchemaValidationError):
        validate_response(response)
    assert is_valid(response) is False


def test_invalid_answer_status_enum_value_is_rejected():
    response = _valid_response()
    response["answer_status"] = "definitely_answered"  # not in the enum
    with pytest.raises(SchemaValidationError):
        validate_response(response)


def test_claim_with_zero_citations_is_rejected():
    # citations.minItems == 1 is the mechanical enforcement of "ground every
    # claim" -- a claim with an empty citations array must fail validation.
    response = _valid_response()
    response["claims"][0]["citations"] = []
    with pytest.raises(SchemaValidationError):
        validate_response(response)


def test_claim_missing_evidence_domain_is_rejected():
    response = _valid_response()
    del response["claims"][0]["evidence_domain"]
    with pytest.raises(SchemaValidationError):
        validate_response(response)


def test_empty_claims_array_is_still_valid():
    # An insufficient_evidence response with no claims at all is a valid
    # shape (claims has no top-level minItems constraint).
    response = _valid_response()
    response["answer_status"] = "insufficient_evidence"
    response["claims"] = []
    response["overall_confidence"] = "low"
    validate_response(response)


def test_error_message_includes_underlying_jsonschema_detail():
    response = _valid_response()
    del response["query"]
    with pytest.raises(SchemaValidationError) as exc_info:
        validate_response(response)
    assert "query" in str(exc_info.value)
