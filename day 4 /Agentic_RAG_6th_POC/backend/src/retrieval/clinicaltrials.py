"""ClinicalTrials.gov API v2 client (clinical_safety_intelligence domain)."""
from __future__ import annotations

import datetime as _dt
from typing import List

import requests

from backend.src.utils.allowlist import require_allowed

DOMAIN = "clinical_safety_intelligence"
BASE = "https://clinicaltrials.gov/api/v2/studies"
TIMEOUT = 15

# query.term matches better on a short entity/drug name than on a long,
# multi-clause phrase (verified against the live API while building this --
# a full cleaned question like "adverse events reported metformin FDA
# approval status" matches far fewer studies than "metformin" alone). If the
# full search term comes back empty, fall back to trying each individual
# word, skipping generic clinical-domain vocabulary that is never itself a
# drug/condition name.
_GENERIC_WORDS = {
    "clinical", "trial", "trials", "safety", "data", "exists", "adverse",
    "events", "been", "reported", "approval", "status", "study", "studies",
    "dose", "dosing", "efficacy", "toxicity", "patient", "patients",
    "response", "responses", "sign", "signs", "level", "levels", "pattern",
    "profile", "effect", "effects",
}


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _candidate_terms(term: str) -> List[str]:
    """Full term first, then individual words -- but only words specific
    enough to plausibly be a drug/condition name. Single letters or very
    short leftover tokens (e.g. "X" from a placeholder like "compound X")
    are excluded: tried in isolation they match unrelated studies by
    coincidence rather than anything relevant, which would fabricate
    apparent relevance the query never actually had.
    """
    words = term.split()
    candidates = [term]
    for w in reversed(words):
        if len(w) >= 4 and w.isalpha() and w.lower() not in _GENERIC_WORDS and w not in candidates:
            candidates.append(w)
    return candidates


def _query_studies(term: str, max_results: int) -> List[dict]:
    require_allowed(BASE, expected_domain=DOMAIN)
    try:
        resp = requests.get(
            BASE,
            params={"query.term": term, "pageSize": max_results},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("studies", [])
    except (requests.RequestException, ValueError):
        return []


def _title_of(study: dict) -> str:
    ident = study.get("protocolSection", {}).get("identificationModule", {})
    return (ident.get("briefTitle") or ident.get("officialTitle") or "")


def search(term: str, max_results: int = 3) -> List[dict]:
    """Search ClinicalTrials.gov for studies matching `term`.

    ClinicalTrials.gov's query.term does ranked full-text search over its
    whole corpus, so almost any single English word returns *something* --
    it essentially never comes back empty (verified while building this: a
    generic leftover word like "compound" returns unrelated studies with
    "compound" nowhere in them). That makes "studies came back non-empty" too
    weak a signal that a single-word fallback candidate is actually relevant.
    So for fallback candidates (everything after the first, full-term
    attempt), a study is only kept if the candidate word literally appears
    in its title -- a cheap, honest relevance check that avoids reporting
    real-but-unrelated studies as if they were about the query.
    """
    candidates = _candidate_terms(term)
    studies: List[dict] = _query_studies(candidates[0], max_results)
    for candidate in candidates[1:]:
        if studies:
            break
        fetched = _query_studies(candidate, max_results)
        studies = [s for s in fetched if candidate.lower() in _title_of(s).lower()]

    retrieved_at = _now_iso()
    out = []
    for study in studies:
        protocol = study.get("protocolSection", {})
        ident = protocol.get("identificationModule", {})
        status_module = protocol.get("statusModule", {})
        nct_id = ident.get("nctId", "")
        title = ident.get("briefTitle") or ident.get("officialTitle") or f"Study {nct_id}"
        status = status_module.get("overallStatus", "unknown status")
        out.append(
            {
                "title": title,
                "summary": f"ClinicalTrials.gov status: {status}.",
                "url": f"https://clinicaltrials.gov/study/{nct_id}" if nct_id else BASE,
                "source_domain": DOMAIN,
                "retrieved_at": retrieved_at,
            }
        )
    return out
