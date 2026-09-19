"""openFDA client.

Usable for two evidence domains depending on the endpoint queried:
- `clinical_safety_intelligence` (adverse events / label safety data)
- `competitive_regulatory_intelligence` (drug approval status via drugsfda)

KNOWN ALLOWLIST GAP (do not silently work around this -- see backend/README.md):
openFDA's actual API host is `api.fda.gov`. `data/allowlist/sources.json`
currently lists `www.fda.gov` and `www.accessdata.fda.gov` under
`clinical_safety_intelligence` / `competitive_regulatory_intelligence`, but
not `api.fda.gov` itself. Per `allowlist.md`, this module does not fetch from
the unlisted API host and rationalize it afterward -- it calls
`require_allowed()` before every request like every other client, which
raises `AllowlistError` given the current allowlist contents. The
orchestrator catches that and treats openFDA as a blocked source, applying
the escalation-rules.md decision table (this is the safety-domain path most
likely to produce `escalated` when openFDA is the only source attempted and
no allowlisted alternative in the same domain returned anything).

Once a human reviews and (if appropriate) adds `api.fda.gov` to
`data/allowlist/sources.json`, this client will start working with zero code
changes.
"""
from __future__ import annotations

import datetime as _dt
from typing import List

import requests

from backend.src.utils.allowlist import AllowlistError, require_allowed

BASE = "https://api.fda.gov"
TIMEOUT = 15


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def search_safety(term: str, max_results: int = 3) -> List[dict]:
    """Search openFDA drug adverse-event reports for `term`. Domain: clinical_safety_intelligence."""
    domain = "clinical_safety_intelligence"
    url = f"{BASE}/drug/event.json"
    require_allowed(url, expected_domain=domain)

    try:
        resp = requests.get(
            url,
            params={"search": f'patient.drug.medicinalproduct:"{term}"', "limit": max_results},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
    except (requests.RequestException, ValueError):
        return []

    retrieved_at = _now_iso()
    out = []
    for i, event in enumerate(results):
        safety_report_id = event.get("safetyreportid", f"unknown-{i}")
        reactions = event.get("patient", {}).get("reaction", [])
        reaction_terms = ", ".join(
            r.get("reactionmeddrapt", "") for r in reactions if r.get("reactionmeddrapt")
        ) or "no reaction terms reported"
        out.append(
            {
                "title": f"openFDA adverse event report {safety_report_id} ({term})",
                "summary": f"Reported reactions: {reaction_terms}.",
                "url": f"{BASE}/drug/event.json?search=safetyreportid:{safety_report_id}",
                "source_domain": domain,
                "retrieved_at": retrieved_at,
            }
        )
    return out


def search_approvals(term: str, max_results: int = 3) -> List[dict]:
    """Search openFDA drugsfda approval records for `term`. Domain: competitive_regulatory_intelligence."""
    domain = "competitive_regulatory_intelligence"
    url = f"{BASE}/drug/drugsfda.json"
    require_allowed(url, expected_domain=domain)

    try:
        resp = requests.get(
            url,
            params={"search": f'products.brand_name:"{term}"', "limit": max_results},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])
    except (requests.RequestException, ValueError):
        return []

    retrieved_at = _now_iso()
    out = []
    for record in results:
        app_no = record.get("application_number", "unknown")
        products = record.get("products", [])
        brand_names = ", ".join(p.get("brand_name", "") for p in products if p.get("brand_name"))
        out.append(
            {
                "title": f"openFDA application {app_no} ({brand_names or term})",
                "summary": f"FDA application number {app_no} covering: {brand_names or term}.",
                "url": f"{BASE}/drug/drugsfda.json?search=application_number:{app_no}",
                "source_domain": domain,
                "retrieved_at": retrieved_at,
            }
        )
    return out


__all__ = ["search_safety", "search_approvals", "AllowlistError"]
