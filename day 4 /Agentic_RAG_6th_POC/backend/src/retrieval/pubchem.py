"""PubChem PUG REST client (chemical_compound_intelligence domain)."""
from __future__ import annotations

import datetime as _dt
from typing import List, Optional
from urllib.parse import quote

import requests

from backend.src.utils.allowlist import require_allowed

DOMAIN = "chemical_compound_intelligence"
BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
TIMEOUT = 15

# PubChem's name-lookup endpoint expects a compound name close to exact, not
# a bag of words -- unlike PubMed/ClinicalTrials.gov it does not do its own
# free-text query expansion. If the full search term (which may still be a
# multi-word phrase after orchestrator._extract_search_term) doesn't resolve,
# fall back to trying each individual word, skipping generic chemistry
# vocabulary that is never itself a compound name.
_GENERIC_WORDS = {
    "molecular", "formula", "weight", "structure", "chemical", "compound",
    "bioactivity", "solubility", "smiles", "scaffold", "ic50", "binding",
    "affinity", "small", "molecule",
}


def _now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _lookup_cids(name: str, max_results: int) -> List[int]:
    cids_url = f"{BASE}/compound/name/{quote(name, safe='')}/cids/JSON"
    require_allowed(cids_url, expected_domain=DOMAIN)
    try:
        resp = requests.get(cids_url, timeout=TIMEOUT)
        if resp.status_code == 404:
            return []
        resp.raise_for_status()
        return resp.json().get("IdentifierList", {}).get("CID", [])[:max_results]
    except (requests.RequestException, ValueError):
        return []


def _candidate_names(term: str) -> List[str]:
    """Full term first, then individual non-generic words, last word first.

    Only words specific enough to plausibly be a compound name are tried in
    isolation: single letters or very short leftover tokens (e.g. "X" from a
    placeholder like "compound X") are excluded, since PubChem will happily
    resolve them to an unrelated real compound (e.g. "X" -> a chemical
    element synonym), which would fabricate apparent relevance the query
    never actually had.
    """
    words = term.split()
    candidates = [term]
    for w in reversed(words):
        if len(w) >= 4 and w.isalpha() and w.lower() not in _GENERIC_WORDS and w not in candidates:
            candidates.append(w)
    return candidates


def search(term: str, max_results: int = 3) -> List[dict]:
    """Look up `term` as a compound name in PubChem and return basic properties."""
    cids: List[int] = []
    for candidate in _candidate_names(term):
        cids = _lookup_cids(candidate, max_results)
        if cids:
            break
    if not cids:
        return []

    cid_list = ",".join(str(c) for c in cids)
    props_url = (
        f"{BASE}/compound/cid/{cid_list}/property/"
        "MolecularFormula,MolecularWeight,IUPACName/JSON"
    )
    require_allowed(props_url, expected_domain=DOMAIN)
    try:
        props_resp = requests.get(props_url, timeout=TIMEOUT)
        props_resp.raise_for_status()
        properties = props_resp.json().get("PropertyTable", {}).get("Properties", [])
    except (requests.RequestException, ValueError):
        return []

    retrieved_at = _now_iso()
    out = []
    for prop in properties:
        cid = prop.get("CID")
        name = prop.get("IUPACName", term)
        formula = prop.get("MolecularFormula", "")
        mw = prop.get("MolecularWeight", "")
        out.append(
            {
                "title": f"PubChem CID {cid}: {name}",
                "summary": f"Molecular formula {formula}, molecular weight {mw}.",
                "url": f"https://pubchem.ncbi.nlm.nih.gov/compound/{cid}",
                "source_domain": DOMAIN,
                "retrieved_at": retrieved_at,
            }
        )
    return out
