"""Turns raw retrieval results into schema-shaped claims[] with citations.

Never fabricates: a claim's statement is built only from titles/summaries
that were actually returned by an allowlisted retrieval client for that
domain. If a domain produced zero retrievable results, no claim is emitted
for it at all (a claim with an empty citations array would fail schema
validation anyway -- see data/schema/response_schema.json citations.minItems).

Confidence heuristic (intentionally simple for this POC, documented so it can
be swapped for something better later):

    - distinct allowlisted sources (hosts) >= 3  -> "high"
    - distinct allowlisted sources (hosts) == 2  -> "medium"
    - distinct allowlisted sources (hosts) == 1  -> "low"

This is a corroboration-count proxy: more *independent* allowlisted sources
agreeing something is retrievable/relevant is treated as more trustworthy
than a single source. "Independent" is measured by distinct hostname, not
distinct citation URL -- a citation's `source_domain` field carries the
evidence-domain tag (e.g. "clinical_safety_intelligence"), which is
constant across every citation folded into the same claim, so it cannot by
itself distinguish one host from another. Counting distinct URLs instead of
distinct hosts previously let e.g. three PubMed articles (all
www.ncbi.nlm.nih.gov) count as "high" corroboration, contradicting the
"independent sources" framing above and potentially suppressing escalation
for genuinely single-source, weak evidence. This heuristic intentionally
does NOT weigh clinical significance, study phase, sample size, or
statistical strength of the underlying finding -- those would require an
LLM (or domain expert) reading the actual content, which is out of scope for
this heuristic, POC-stage grounding step.
"""
from __future__ import annotations

from typing import Dict, List
from urllib.parse import urlparse

CONFIDENCE_BY_CORROBORATION = {1: "low", 2: "medium"}
DEFAULT_HIGH_CONFIDENCE_THRESHOLD = 3


def _confidence_from_corroboration(source_count: int) -> str:
    if source_count >= DEFAULT_HIGH_CONFIDENCE_THRESHOLD:
        return "high"
    return CONFIDENCE_BY_CORROBORATION.get(source_count, "low")


def _hostname(url: str) -> str:
    """Best-effort hostname extraction for corroboration counting.

    Falls back to the raw url string if it can't be parsed, so a malformed
    url still counts as *some* distinct source rather than crashing.
    """
    try:
        return urlparse(url).hostname or url
    except Exception:
        return url


def _distinct_source_count(citations: List[dict]) -> int:
    """Count distinct allowlisted hosts among `citations`.

    This is the actual "independent sources" signal -- see module docstring.
    """
    return len({_hostname(c["url"]) for c in citations})


def _dedupe_citations(results: List[dict]) -> List[dict]:
    """Collapse results to one citation per distinct URL, preserving order."""
    seen = set()
    citations = []
    for r in results:
        url = r.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        citations.append(
            {
                "source_domain": r["source_domain"],
                "url": url,
                "retrieved_at": r["retrieved_at"],
            }
        )
    return citations


def _build_statement(query: str, domain: str, results: List[dict]) -> str:
    """Compose a factual statement strictly from retrieved titles/summaries.

    This deliberately reports "what was found", not an inferred scientific
    conclusion -- synthesizing an actual scientific claim from these snippets
    is the natural next upgrade once an LLM sits in this step (see
    backend/src/prompts/grounding_prompt_v1.md), but that would risk
    paraphrasing beyond what was actually retrieved for a heuristic POC.
    """
    fragments = []
    for r in results[:3]:
        title = (r.get("title") or "").strip()
        summary = (r.get("summary") or "").strip()
        piece = title if not summary else f"{title} -- {summary}"
        if piece:
            fragments.append(piece)
    joined = " | ".join(fragments) if fragments else "relevant allowlisted evidence was located"
    return f"For domain '{domain}', allowlisted retrieval found: {joined}"


def build_claims(query: str, results_by_domain: Dict[str, List[dict]]) -> List[dict]:
    """Build the claims[] array for one query from per-domain retrieval results.

    `results_by_domain` maps evidence_domain -> list of normalized retrieval
    result dicts (title/summary/url/source_domain/retrieved_at), as produced
    by backend/src/retrieval/*.py. Domains with no results produce no claim.
    """
    claims = []
    for domain, results in results_by_domain.items():
        if not results:
            continue
        citations = _dedupe_citations(results)
        if not citations:
            continue
        claims.append(
            {
                "statement": _build_statement(query, domain, results),
                "confidence": _confidence_from_corroboration(_distinct_source_count(citations)),
                "evidence_domain": domain,
                "citations": citations,
            }
        )
    return claims


CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}


def rollup_confidence(claims: List[dict]) -> str:
    """Overall response confidence = the weakest (minimum) claim confidence.

    A response is only as strong as its least-supported claim; documented
    weakest-link heuristic, matching the "never overstate" fail-gracefully
    commitment. Returns "low" if there are no claims at all.
    """
    if not claims:
        return "low"
    return min(claims, key=lambda c: CONFIDENCE_RANK[c["confidence"]])["confidence"]
