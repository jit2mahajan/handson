"""Unit tests for backend/src/grounding/grounding.py.

Pure data-transformation tests -- no HTTP, no allowlist file access. Inputs
are hand-built "normalized retrieval result" dicts, exactly the shape
backend/src/retrieval/*.py clients produce.
"""
from __future__ import annotations

from backend.src.grounding.grounding import build_claims, rollup_confidence

TARGET = "target_identification_validation"
CLINICAL = "clinical_safety_intelligence"


def _result(url: str, title: str = "Title", summary: str = "Summary") -> dict:
    return {
        "title": title,
        "summary": summary,
        "url": url,
        "source_domain": TARGET,
        "retrieved_at": "2026-09-26T00:00:00Z",
    }


def test_build_claims_no_results_produces_no_claim():
    claims = build_claims("q", {TARGET: []})
    assert claims == []


def test_build_claims_emits_one_claim_per_nonempty_domain():
    results_by_domain = {
        TARGET: [_result("https://www.ncbi.nlm.nih.gov/pubmed/1")],
        CLINICAL: [],
    }
    claims = build_claims("q", results_by_domain)
    assert len(claims) == 1
    assert claims[0]["evidence_domain"] == TARGET
    assert len(claims[0]["citations"]) == 1
    assert claims[0]["citations"][0]["url"] == "https://www.ncbi.nlm.nih.gov/pubmed/1"


def test_build_claims_dedupes_citations_by_url():
    results_by_domain = {
        TARGET: [
            _result("https://www.ncbi.nlm.nih.gov/pubmed/1"),
            _result("https://www.ncbi.nlm.nih.gov/pubmed/1"),  # exact dupe URL
            _result("https://www.ncbi.nlm.nih.gov/pubmed/2"),
        ],
    }
    claims = build_claims("q", results_by_domain)
    assert len(claims) == 1
    urls = [c["url"] for c in claims[0]["citations"]]
    assert urls == [
        "https://www.ncbi.nlm.nih.gov/pubmed/1",
        "https://www.ncbi.nlm.nih.gov/pubmed/2",
    ]


def test_confidence_is_low_for_a_single_host_even_with_multiple_urls():
    # Two different URLs, same hostname -> 1 distinct source -> "low".
    results_by_domain = {
        TARGET: [
            _result("https://www.ncbi.nlm.nih.gov/pubmed/1"),
            _result("https://www.ncbi.nlm.nih.gov/pubmed/2"),
        ],
    }
    claims = build_claims("q", results_by_domain)
    assert claims[0]["confidence"] == "low"


def test_confidence_is_medium_for_two_distinct_hosts():
    results_by_domain = {
        TARGET: [
            _result("https://www.ncbi.nlm.nih.gov/pubmed/1"),
            _result("https://www.uniprot.org/uniprot/1"),
        ],
    }
    claims = build_claims("q", results_by_domain)
    assert claims[0]["confidence"] == "medium"


def test_confidence_is_high_for_three_or_more_distinct_hosts():
    results_by_domain = {
        TARGET: [
            _result("https://www.ncbi.nlm.nih.gov/pubmed/1"),
            _result("https://www.uniprot.org/uniprot/1"),
            _result("https://www.genecards.org/gene/1"),
        ],
    }
    claims = build_claims("q", results_by_domain)
    assert claims[0]["confidence"] == "high"


def test_build_claims_statement_never_fabricates_beyond_retrieved_text():
    results_by_domain = {
        TARGET: [_result("https://www.ncbi.nlm.nih.gov/pubmed/1", title="BRCA1 study", summary="Nature (2020).")],
    }
    claims = build_claims("some query", results_by_domain)
    statement = claims[0]["statement"]
    assert "BRCA1 study" in statement
    assert "Nature (2020)." in statement


def test_rollup_confidence_no_claims_is_low():
    assert rollup_confidence([]) == "low"


def test_rollup_confidence_is_weakest_link():
    claims = [
        {"confidence": "high"},
        {"confidence": "low"},
        {"confidence": "medium"},
    ]
    assert rollup_confidence(claims) == "low"


def test_rollup_confidence_all_high_is_high():
    claims = [{"confidence": "high"}, {"confidence": "high"}]
    assert rollup_confidence(claims) == "high"
