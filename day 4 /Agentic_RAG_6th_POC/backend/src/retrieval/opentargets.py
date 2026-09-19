"""Open Targets GraphQL client (target_identification_validation domain).

KNOWN ALLOWLIST GAP (do not silently work around this -- see backend/README.md):
the live Open Targets Platform GraphQL API is served from
`api.platform.opentargets.org`, but `data/allowlist/sources.json` currently
lists only `www.opentargets.org` (the marketing/docs site, not the API host)
under `target_identification_validation`. Per `allowlist.md`, this module does
NOT fetch from the unlisted API host and rationalize it afterward -- it calls
`require_allowed()` before every request like every other client, which
raises `AllowlistError` given the current allowlist contents. The orchestrator
catches that and treats Open Targets as a blocked source for this run,
applying the escalation-rules.md decision table accordingly.

Once a human reviews and (if appropriate) adds `api.platform.opentargets.org`
to `data/allowlist/sources.json`, this client will start working with zero
code changes.
"""
from __future__ import annotations

import datetime as _dt
from typing import List

import requests

from backend.src.utils.allowlist import AllowlistError, require_allowed

DOMAIN = "target_identification_validation"
GRAPHQL_URL = "https://api.platform.opentargets.org/api/v4/graphql"
TIMEOUT = 15

_SEARCH_QUERY = """
query SearchTarget($q: String!) {
  search(queryString: $q, entityNames: ["target"]) {
    hits {
      id
      name
      description
    }
  }
}
"""


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def search(term: str, max_results: int = 3) -> List[dict]:
    """Search Open Targets for a target/gene matching `term`.

    Raises AllowlistError if the GraphQL host is not on the allowlist (this
    is the current, expected state -- see module docstring). Callers
    (the orchestrator) must catch this and treat it as a blocked source,
    never bypass the check to fetch anyway.
    """
    require_allowed(GRAPHQL_URL, expected_domain=DOMAIN)

    try:
        resp = requests.post(
            GRAPHQL_URL,
            json={"query": _SEARCH_QUERY, "variables": {"q": term}},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        hits = resp.json().get("data", {}).get("search", {}).get("hits", [])[:max_results]
    except (requests.RequestException, ValueError):
        return []

    retrieved_at = _now_iso()
    out = []
    for hit in hits:
        target_id = hit.get("id", "")
        name = hit.get("name") or term
        description = hit.get("description") or ""
        out.append(
            {
                "title": f"Open Targets: {name} ({target_id})",
                "summary": description,
                "url": f"https://www.opentargets.org/target/{target_id}" if target_id else GRAPHQL_URL,
                "source_domain": DOMAIN,
                "retrieved_at": retrieved_at,
            }
        )
    return out


__all__ = ["search", "DOMAIN", "AllowlistError"]
