"""PubMed / NCBI E-utilities client (target_identification_validation domain).

Uses the keyless esearch + esummary endpoints. NCBI still serves E-utilities
under the legacy path on `www.ncbi.nlm.nih.gov` (verified live), which is the
exact host listed in `data/allowlist/sources.json` under
`target_identification_validation` -- so this client needs no allowlist
exception.
"""
from __future__ import annotations

import datetime as _dt
from typing import List

import requests

from backend.src.utils.allowlist import require_allowed

DOMAIN = "target_identification_validation"
BASE = "https://www.ncbi.nlm.nih.gov/entrez/eutils"
TIMEOUT = 15


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def search(term: str, max_results: int = 3) -> List[dict]:
    """Search PubMed for `term`, return normalized result dicts.

    Returns [] on network/parse failure rather than raising, so one flaky
    source doesn't crash the whole orchestration -- the caller sees "no
    results" and the escalation table decides what that means.
    """
    esearch_url = f"{BASE}/esearch.fcgi"
    require_allowed(esearch_url, expected_domain=DOMAIN)

    try:
        resp = requests.get(
            esearch_url,
            params={"db": "pubmed", "term": term, "retmode": "json", "retmax": max_results},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        ids = resp.json().get("esearchresult", {}).get("idlist", [])
        if not ids:
            return []

        esummary_url = f"{BASE}/esummary.fcgi"
        require_allowed(esummary_url, expected_domain=DOMAIN)
        summary_resp = requests.get(
            esummary_url,
            params={"db": "pubmed", "id": ",".join(ids), "retmode": "json"},
            timeout=TIMEOUT,
        )
        summary_resp.raise_for_status()
        result_block = summary_resp.json().get("result", {})
    except (requests.RequestException, ValueError):
        return []

    retrieved_at = _now_iso()
    out = []
    for uid in ids:
        doc = result_block.get(uid)
        if not doc:
            continue
        title = doc.get("title") or f"PubMed record {uid}"
        journal = doc.get("fulljournalname", "")
        pubdate = doc.get("pubdate", "")
        out.append(
            {
                "title": title,
                "summary": f"{journal} ({pubdate}).".strip(),
                "url": f"https://www.ncbi.nlm.nih.gov/pubmed/{uid}",
                "source_domain": DOMAIN,
                "retrieved_at": retrieved_at,
            }
        )
    return out
