"""The agentic pipeline: classify -> route -> retrieve -> ground -> assemble ->
validate -> escalate.

Per `.claude/skills/pharma-rag-principles/references/domain-routing.md`,
domain routing happens *before* retrieval and only the matched domain(s) are
queried -- the four domains are not fixed code paths that all fire on every
question.
"""
from __future__ import annotations

import datetime as _dt
import re
from typing import Dict, List, Tuple

from backend.src.grounding.grounding import build_claims, rollup_confidence
from backend.src.observability.otel import (
    allowlist_denied_counter,
    get_logger,
    retrieval_attempts_counter,
    tracer,
)
from backend.src.retrieval import clinicaltrials, openfda, opentargets, pubchem, pubmed
from backend.src.utils.allowlist import AllowlistError
from backend.src.validation.schema_validate import validate_response

_logger = get_logger("aidlc.orchestrator")

TARGET = "target_identification_validation"
CHEMICAL = "chemical_compound_intelligence"
CLINICAL = "clinical_safety_intelligence"
COMPETITIVE = "competitive_regulatory_intelligence"

ALL_DOMAINS = [TARGET, CHEMICAL, CLINICAL, COMPETITIVE]

# --------------------------------------------------------------------------
# 1. Domain classification
# --------------------------------------------------------------------------
#
# Heuristic keyword classifier, deliberately simple for this POC. A question
# is routed to every domain for which at least one keyword substring
# matches (case-insensitive) -- a question can legitimately span more than
# one domain (see domain-routing.md example: "safety record and chemical
# structure of compound X" spans clinical_safety_intelligence and
# chemical_compound_intelligence).
#
# NATURAL UPGRADE PATH: replace this substring match with an LLM call using
# backend/src/prompts/domain_classifier_prompt_v1.md, which already documents
# the intended input/output contract for that future version. Keep this
# heuristic as a cheap, zero-latency, zero-cost fallback even after an
# LLM classifier exists (e.g. for provider-outage resilience).
DOMAIN_KEYWORDS = {
    TARGET: [
        "gene", "target", "protein", "biomarker", "expression", "mutation",
        "pathway", "receptor", "knockout", "target identification",
        "target validation", "genecards", "uniprot", "disease association",
        "drug target", "open targets",
    ],
    CHEMICAL: [
        "compound", "molecule", "structure", "formula", "bioactivity",
        "smiles", "ic50", "binding affinity", "chemical", "small molecule",
        "solubility", "molecular weight", "pubchem", "scaffold",
    ],
    CLINICAL: [
        "clinical trial", "phase i", "phase ii", "phase iii", "adverse event",
        "toxicity", "safety", "side effect", "dose", "dosing", "efficacy",
        "trial", "patient", "contraindication", "cardiotoxicity",
        "black box", "adverse reaction",
    ],
    COMPETITIVE: [
        "patent", "approval status", "competitor", "market", "regulatory",
        "sec filing", "exclusivity", "generic", "biosimilar",
        "intellectual property", "pipeline", "approved indication",
        "regulatory filing",
    ],
}


def classify(query: str) -> List[str]:
    """Return the list of evidence domains this query should be routed to.

    May be empty if no domain's keywords match -- that is a valid outcome
    (it means "no retrieval was attempted", which downstream becomes
    insufficient_evidence, not an error).
    """
    with tracer.start_as_current_span("domain_classification") as span:
        q = query.lower()
        matched = [
            domain
            for domain in ALL_DOMAINS
            if any(keyword in q for keyword in DOMAIN_KEYWORDS[domain])
        ]
        span.set_attribute("aidlc.domains.matched", matched)
        return matched


# --------------------------------------------------------------------------
# 2. Routing table: domain -> retrieval client callables
# --------------------------------------------------------------------------
#
# clinicaltrials + openfda.search_safety both serve clinical_safety_intelligence;
# openfda.search_approvals serves competitive_regulatory_intelligence (FDA
# approval status is one of that domain's listed evidence types in
# domain-routing.md / allowlist.md). pubmed + opentargets both serve
# target_identification_validation. pubchem is the sole
# chemical_compound_intelligence client for this POC.
DOMAIN_CLIENTS = {
    TARGET: [pubmed.search, opentargets.search],
    CHEMICAL: [pubchem.search],
    CLINICAL: [clinicaltrials.search, openfda.search_safety],
    COMPETITIVE: [openfda.search_approvals],
}


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# --------------------------------------------------------------------------
# 1b. Search-term extraction
# --------------------------------------------------------------------------
#
# The public APIs here (PubMed esearch, ClinicalTrials.gov query.term,
# PubChem name lookup) are keyword/entity search endpoints, not natural-
# language question-answering endpoints -- passing a full English question
# verbatim ("What is the biological function of the BRCA1 gene...?") returns
# zero results from all of them (verified against the live APIs while
# building this). Stripping common question/filler words down to the
# content words is enough to get real hits from PubMed and ClinicalTrials.gov,
# which do their own free-text query expansion server-side.
#
# NATURAL UPGRADE PATH: an LLM-based entity/keyword extraction step (e.g. as
# part of the same LLM upgrade noted for classify()) would do better than
# this fixed stopword list, especially for multi-word compound/gene names.
_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "what", "which", "who",
    "how", "why", "does", "do", "did", "of", "and", "or", "its", "it", "to",
    "in", "on", "for", "with", "about", "currently", "typically", "have",
    "has", "many", "their", "there", "this", "that", "between", "correlation",
}


def _extract_search_term(query: str) -> str:
    """Strip common English filler/question words, keep the rest in order."""
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9\-]*", query)
    kept = [w for w in words if w.lower() not in _STOPWORDS]
    cleaned = " ".join(kept) if kept else query
    return cleaned


def _retrieve_domain(domain: str, search_term: str) -> Tuple[List[dict], List[str]]:
    """Call every client registered for `domain` with the extracted search term.

    Returns (results, blocked_reasons). A client that raises AllowlistError
    is never bypassed -- that is exactly the defense-in-depth check doing its
    job (see retrieval/opentargets.py and retrieval/openfda.py module
    docstrings for the two sources currently blocked by the live allowlist).
    A client that raises anything else (network timeout, bad JSON, etc.) is
    treated as "returned nothing this time", not a blocked source -- it does
    not, by itself, trigger escalation.
    """
    results: List[dict] = []
    blocked: List[str] = []
    for client in DOMAIN_CLIENTS.get(domain, []):
        client_name = f"{client.__module__}.{client.__qualname__}"
        # One span + one retrieval-attempt count per retrieval-client call --
        # this is the mechanical, server-side measurement point for
        # allowlist_deny_rate: `attempts` increments unconditionally here,
        # `allowlist_denied` only when the client's own require_allowed()
        # call (backend/src/utils/allowlist.py) raised AllowlistError.
        with tracer.start_as_current_span(f"retrieval.{client_name}") as span:
            span.set_attribute("aidlc.evidence_domain", domain)
            span.set_attribute("aidlc.retrieval.client", client_name)
            retrieval_attempts_counter.add(1, {"domain": domain, "client": client_name})
            try:
                client_results = client(search_term)
                results.extend(client_results)
                span.set_attribute("aidlc.retrieval.result_count", len(client_results))
            except AllowlistError as exc:
                blocked.append(str(exc))
                allowlist_denied_counter.add(1, {"domain": domain, "client": client_name})
                span.set_attribute("aidlc.retrieval.allowlist_denied", True)
                span.record_exception(exc)
                _logger.info(
                    "Retrieval client %s blocked by allowlist for domain %s: %s",
                    client_name, domain, exc,
                )
            except Exception as exc:  # noqa: BLE001 - one flaky retrieval must not crash the query
                span.record_exception(exc)
                continue
    return results, blocked


# --------------------------------------------------------------------------
# 3. Escalation decision table
# --------------------------------------------------------------------------
#
# Mirrors .claude/skills/pharma-rag-principles/references/escalation-rules.md
# exactly. This POC has no semantic "conflicting evidence" detector (that
# would need an LLM reading claim content across sources), so "conflicting"
# is approximated by: a clinical_safety_intelligence claim resting on a
# single corroborating source (grounding.py's "low" confidence tier) is
# treated as the low-confidence case that rule requires escalation for.
def _apply_escalation(
    domains: List[str],
    claims: List[dict],
    blocked_by_domain: Dict[str, List[str]],
    results_by_domain: Dict[str, List[dict]],
) -> Tuple[str, bool, "str | None"]:
    # Every domain the query was classified into must produce at least one
    # claim for the response to be treated as fully "answered". A domain
    # that yields zero claims -- whether because a needed source was
    # blocked by the allowlist, or because retrieval simply came back empty
    # -- must not be silently dropped from a multi-domain response. This
    # covers the general case, not just the clinical-blocked special case:
    # e.g. a CHEMICAL+CLINICAL query where PubChem succeeds but
    # clinicaltrials/openfda genuinely return nothing must not read as a
    # full green "answered".
    claimed_domains = {c["evidence_domain"] for c in claims}
    missing_domains = [d for d in domains if d not in claimed_domains]

    # Rule: the clinical/safety domain was requested but produced zero
    # claims (blocked OR genuinely empty) -- escalate per escalation-rules.md
    # ("a needed source was blocked ... for a safety/clinical claim" and the
    # broader "claim touches clinical_safety_intelligence ... low-confidence"
    # spirit: missing safety evidence next to an otherwise-answered response
    # is exactly the case that needs a human to weigh in, not a silent drop).
    if CLINICAL in missing_domains:
        clinical_blocked = blocked_by_domain.get(CLINICAL, [])
        if clinical_blocked:
            reason = (
                "A needed source for clinical/safety evidence was blocked by the "
                "allowlist check and no allowlisted alternative in "
                f"'{CLINICAL}' returned results: {'; '.join(clinical_blocked)}"
            )
        else:
            reason = (
                f"The query was classified into '{CLINICAL}' but no allowlisted "
                "source returned any citable evidence for it, even though other "
                "requested domain(s) may have succeeded -- a missing "
                "clinical/safety half of the answer requires human review rather "
                "than being reported as fully answered."
            )
        return "escalated", True, reason

    # Rule: a clinical_safety_intelligence claim is low-confidence (proxy for
    # low-confidence/conflicting per escalation-rules.md).
    weak_safety_claims = [
        c for c in claims if c["evidence_domain"] == CLINICAL and c["confidence"] == "low"
    ]
    if weak_safety_claims:
        reason = (
            "A clinical/safety claim is corroborated by only a single allowlisted "
            "source (low confidence per the corroboration-count heuristic) -- "
            "escalation-rules.md requires human review for low-confidence safety evidence."
        )
        return "escalated", True, reason

    # Rule: some other (non-clinical) requested domain produced zero claims
    # while at least one domain did produce claims -- downgrade to
    # insufficient_evidence rather than reporting "answered" with that
    # domain's half silently missing.
    if missing_domains:
        gap_notes = []
        for d in missing_domains:
            if blocked_by_domain.get(d):
                gap_notes.append(
                    f"'{d}': needed source(s) blocked by the allowlist check "
                    f"({'; '.join(blocked_by_domain[d])})"
                )
            else:
                gap_notes.append(f"'{d}': no allowlisted source returned relevant results")
        if claims:
            reason = (
                "At least one requested evidence domain returned no citable "
                "evidence, so this response cannot be treated as fully answered "
                "even though other domain(s) succeeded. " + "; ".join(gap_notes)
            )
        else:
            reason = "No claim could be grounded with an allowlisted citation. " + "; ".join(gap_notes)
        return "insufficient_evidence", False, reason

    if claims:
        return "answered", False, None

    # No domains were classified at all (and therefore no claims either).
    reason = (
        "The heuristic domain classifier found no keyword match against any of "
        "the four evidence domains for this query, so no retrieval was attempted."
    )
    return "insufficient_evidence", False, reason


# --------------------------------------------------------------------------
# 4. Top-level entry point
# --------------------------------------------------------------------------
def run_query(query: str) -> dict:
    """Run the full pipeline for one research question.

    Returns a dict that has already been validated against
    data/schema/response_schema.json (validate_response raises on failure --
    this function never returns something unvalidated).
    """
    domains = classify(query)
    search_term = _extract_search_term(query)

    results_by_domain: Dict[str, List[dict]] = {}
    blocked_by_domain: Dict[str, List[str]] = {}
    for domain in domains:
        results, blocked = _retrieve_domain(domain, search_term)
        results_by_domain[domain] = results
        blocked_by_domain[domain] = blocked

    with tracer.start_as_current_span("grounding") as span:
        claims = build_claims(query, results_by_domain)
        answer_status, escalation_required, escalation_reason = _apply_escalation(
            domains, claims, blocked_by_domain, results_by_domain
        )
        span.set_attribute("aidlc.claims.count", len(claims))
        span.set_attribute("aidlc.answer_status", answer_status)
        span.set_attribute("aidlc.escalation.required", escalation_required)

    with tracer.start_as_current_span("response_assembly_validation") as span:
        response = {
            "query": query,
            "answer_status": answer_status,
            "claims": claims,
            "overall_confidence": rollup_confidence(claims),
            "escalation": {"required": escalation_required, "reason": escalation_reason},
        }

        validate_response(response)
        span.set_attribute("aidlc.overall_confidence", response["overall_confidence"])

    _logger.info(
        "run_query complete domains=%s answer_status=%s escalation_required=%s",
        domains, answer_status, escalation_required,
    )
    return response
