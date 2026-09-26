"""Unit tests for backend/src/orchestrator/orchestrator.py.

Focuses on `_apply_escalation`, the pure decision function that implements
the escalation-rules.md table -- including the "missing domain" logic fixed
in the 2026-09-19 review (a requested domain that yields zero claims, blocked
or genuinely empty, must never be silently dropped from an "answered"
response).

Also includes one end-to-end `run_query()` test with all outbound HTTP
mocked, to confirm the pipeline wires classify -> retrieve -> ground ->
escalate -> validate together correctly without hitting the network.
"""
from __future__ import annotations

from unittest.mock import patch

import pytest

from backend.src.orchestrator import orchestrator as orch
from backend.src.utils.allowlist import AllowlistError

TARGET = orch.TARGET
CHEMICAL = orch.CHEMICAL
CLINICAL = orch.CLINICAL
COMPETITIVE = orch.COMPETITIVE


def _claim(domain: str, confidence: str = "high") -> dict:
    return {
        "statement": "stub",
        "confidence": confidence,
        "evidence_domain": domain,
        "citations": [
            {
                "source_domain": domain,
                "url": "https://example.org/x",
                "retrieved_at": "2026-09-26T00:00:00Z",
            }
        ],
    }


# --------------------------------------------------------------------------
# answered
# --------------------------------------------------------------------------
def test_answered_when_every_requested_domain_has_a_claim():
    domains = [TARGET]
    claims = [_claim(TARGET, "high")]
    status, required, reason = orch._apply_escalation(domains, claims, {TARGET: []}, {TARGET: [{}]})
    assert status == "answered"
    assert required is False
    assert reason is None


def test_answered_for_multi_domain_query_when_both_domains_have_claims():
    domains = [TARGET, CHEMICAL]
    claims = [_claim(TARGET, "high"), _claim(CHEMICAL, "medium")]
    status, required, reason = orch._apply_escalation(
        domains, claims, {TARGET: [], CHEMICAL: []}, {TARGET: [{}], CHEMICAL: [{}]}
    )
    assert status == "answered"
    assert required is False


# --------------------------------------------------------------------------
# insufficient_evidence
# --------------------------------------------------------------------------
def test_insufficient_evidence_when_no_domain_classified_at_all():
    status, required, reason = orch._apply_escalation([], [], {}, {})
    assert status == "insufficient_evidence"
    assert required is False
    assert "no keyword match" in reason or "no retrieval was attempted" in reason


def test_insufficient_evidence_when_non_clinical_domain_missing_but_others_answered():
    # CHEMICAL genuinely returned nothing (not blocked); TARGET succeeded.
    # This is the general "missing domain" case fixed in the 2026-09-19
    # review -- must downgrade rather than reporting a silent full "answered".
    domains = [TARGET, CHEMICAL]
    claims = [_claim(TARGET, "high")]
    status, required, reason = orch._apply_escalation(
        domains, claims, {TARGET: [], CHEMICAL: []}, {TARGET: [{}], CHEMICAL: []}
    )
    assert status == "insufficient_evidence"
    assert required is False
    assert CHEMICAL in reason


def test_insufficient_evidence_when_non_clinical_domain_blocked_by_allowlist():
    domains = [TARGET, COMPETITIVE]
    claims = [_claim(TARGET, "high")]
    status, required, reason = orch._apply_escalation(
        domains,
        claims,
        {TARGET: [], COMPETITIVE: ["Host 'api.fda.gov' is not listed"]},
        {TARGET: [{}], COMPETITIVE: []},
    )
    assert status == "insufficient_evidence"
    assert required is False
    assert "blocked by the allowlist" in reason


def test_insufficient_evidence_when_nothing_classified_but_domains_nonempty_all_missing():
    # No claims at all, and the (single) requested domain is non-clinical.
    domains = [COMPETITIVE]
    claims = []
    status, required, reason = orch._apply_escalation(
        domains, claims, {COMPETITIVE: []}, {COMPETITIVE: []}
    )
    assert status == "insufficient_evidence"
    assert required is False


# --------------------------------------------------------------------------
# escalated
# --------------------------------------------------------------------------
def test_escalated_when_clinical_domain_missing_and_blocked():
    domains = [CLINICAL]
    claims = []
    status, required, reason = orch._apply_escalation(
        domains, claims, {CLINICAL: ["Host 'api.fda.gov' is not listed"]}, {CLINICAL: []}
    )
    assert status == "escalated"
    assert required is True
    assert "blocked" in reason


def test_escalated_when_clinical_domain_missing_and_genuinely_empty():
    domains = [CLINICAL]
    claims = []
    status, required, reason = orch._apply_escalation(
        domains, claims, {CLINICAL: []}, {CLINICAL: []}
    )
    assert status == "escalated"
    assert required is True
    assert "clinical" in reason.lower()


def test_escalated_when_clinical_missing_even_if_other_domain_answered():
    # CHEMICAL succeeded, CLINICAL requested but produced nothing -- must
    # escalate, not silently report the CHEMICAL half as a full "answered".
    domains = [CHEMICAL, CLINICAL]
    claims = [_claim(CHEMICAL, "high")]
    status, required, reason = orch._apply_escalation(
        domains, claims, {CHEMICAL: [], CLINICAL: []}, {CHEMICAL: [{}], CLINICAL: []}
    )
    assert status == "escalated"
    assert required is True


def test_escalated_when_clinical_claim_is_low_confidence():
    domains = [CLINICAL]
    claims = [_claim(CLINICAL, "low")]
    status, required, reason = orch._apply_escalation(
        domains, claims, {CLINICAL: []}, {CLINICAL: [{}]}
    )
    assert status == "escalated"
    assert required is True
    assert "single allowlisted" in reason


def test_answered_when_clinical_claim_is_medium_confidence():
    # Medium/high clinical confidence should NOT trigger the low-confidence
    # escalation rule.
    domains = [CLINICAL]
    claims = [_claim(CLINICAL, "medium")]
    status, required, reason = orch._apply_escalation(
        domains, claims, {CLINICAL: []}, {CLINICAL: [{}]}
    )
    assert status == "answered"
    assert required is False


# --------------------------------------------------------------------------
# End-to-end run_query() with outbound HTTP mocked
# --------------------------------------------------------------------------
def test_run_query_end_to_end_answered_with_mocked_pubmed(monkeypatch):
    """A TARGET-domain query where PubMed returns high-corroboration results
    from >=3 distinct allowlisted hosts should come back "answered"."""

    def fake_pubmed_search(term):
        return [
            {
                "title": "BRCA1 study",
                "summary": "Nature (2020).",
                "url": "https://www.ncbi.nlm.nih.gov/pubmed/1",
                "source_domain": TARGET,
                "retrieved_at": "2026-09-26T00:00:00Z",
            },
            {
                "title": "BRCA1 entry",
                "summary": "UniProt record.",
                "url": "https://www.uniprot.org/uniprot/1",
                "source_domain": TARGET,
                "retrieved_at": "2026-09-26T00:00:00Z",
            },
            {
                "title": "BRCA1 gene page",
                "summary": "GeneCards record.",
                "url": "https://www.genecards.org/gene/1",
                "source_domain": TARGET,
                "retrieved_at": "2026-09-26T00:00:00Z",
            },
        ]

    def fake_opentargets_search(term):
        return []

    monkeypatch.setitem(
        orch.DOMAIN_CLIENTS, TARGET, [fake_pubmed_search, fake_opentargets_search]
    )

    response = orch.run_query("What is the biological function of the BRCA1 gene?")
    assert response["answer_status"] == "answered"
    assert response["overall_confidence"] == "high"
    assert response["escalation"]["required"] is False
    assert len(response["claims"]) == 1
    assert response["claims"][0]["evidence_domain"] == TARGET


def test_run_query_blocked_source_raises_no_exception_and_escalates(monkeypatch):
    """A clinical-domain query whose only client raises AllowlistError must
    escalate, not crash and not fall back to an unapproved host."""

    def blocked_client(term):
        raise AllowlistError("Host 'api.fda.gov' is not listed under domain 'clinical_safety_intelligence'")

    monkeypatch.setitem(orch.DOMAIN_CLIENTS, CLINICAL, [blocked_client])

    response = orch.run_query("What adverse events / side effect data exist for a drug trial?")
    assert response["answer_status"] == "escalated"
    assert response["escalation"]["required"] is True
    assert "blocked" in response["escalation"]["reason"]
