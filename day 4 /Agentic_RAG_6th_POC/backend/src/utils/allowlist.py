"""Defense-in-depth allowlist enforcement for this application's own HTTP calls.

The Claude Code PreToolUse hook (`.claude/hooks/check_allowlist_retrieval.py`) only
governs tool calls Claude Code itself issues during *development* of this repo. It
has no visibility into, and no effect on, HTTP requests this running FastAPI
application makes at runtime. So every retrieval client in `backend/src/retrieval/`
must independently re-check the same source of truth (`data/allowlist/sources.json`)
before making a request, using the helpers in this module.

Never widen this allowlist in code. If a source is genuinely missing, propose an
edit to `data/allowlist/sources.json` itself (a human-gated change) rather than
special-casing an unlisted host here.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

# backend/src/utils/allowlist.py -> repo root is four parents up.
_REPO_ROOT = Path(__file__).resolve().parents[3]
ALLOWLIST_PATH = _REPO_ROOT / "data" / "allowlist" / "sources.json"


class AllowlistError(Exception):
    """Raised when a retrieval target is not on the approved source allowlist."""


# In-process cache, invalidated by the allowlist file's mtime rather than
# held forever. This is what actually delivers the "zero code changes
# needed" promise documented in allowlist.md: once a human approves an edit
# to data/allowlist/sources.json, the very next is_allowed()/require_allowed()
# call in a long-running backend process picks it up automatically, without
# anyone having to know to call reload_allowlist() or restart the process.
_cache: Optional[dict] = None
_cache_mtime: Optional[float] = None


def _load_allowlist() -> dict:
    global _cache, _cache_mtime
    try:
        current_mtime = ALLOWLIST_PATH.stat().st_mtime
    except OSError:
        current_mtime = None
    if _cache is None or current_mtime != _cache_mtime:
        with open(ALLOWLIST_PATH, "r", encoding="utf-8") as f:
            _cache = json.load(f)
        _cache_mtime = current_mtime
    return _cache


def load_allowlist() -> dict:
    """Return the domain -> [hostnames] mapping from data/allowlist/sources.json.

    Cached in-process, but the cache is checked against the file's mtime on
    every call -- a human-approved edit to the file is picked up on the next
    call automatically. `reload_allowlist()` remains available to force an
    unconditional re-read (e.g. if the file was rewritten within the same
    mtime granularity).
    """
    return _load_allowlist()


def reload_allowlist() -> dict:
    """Force a re-read of the allowlist file, bypassing the cache unconditionally."""
    global _cache, _cache_mtime
    _cache = None
    _cache_mtime = None
    return _load_allowlist()


def hostname_of(url: str) -> Optional[str]:
    """Extract the hostname from a URL, or None if it can't be parsed."""
    try:
        return urlparse(url).hostname
    except Exception:
        return None


def domain_for_host(host: str) -> Optional[str]:
    """Return the evidence domain key that lists `host`, or None if unlisted.

    If a host happens to appear under more than one domain (e.g. www.fda.gov is
    listed under both clinical_safety_intelligence and
    competitive_regulatory_intelligence in the current allowlist), the first
    matching domain key (in file order) is returned. Callers that need the exact
    domain intended for a given call should pass it explicitly via
    `is_allowed(url, expected_domain=...)` instead of relying on this alone.
    """
    if not host:
        return None
    allowlist = load_allowlist()
    for domain, hosts in allowlist.items():
        if host in hosts:
            return domain
    return None


def is_allowed(url: str, expected_domain: Optional[str] = None) -> bool:
    """Return True if `url`'s hostname is on the allowlist.

    If `expected_domain` is given, the host must be listed under that specific
    domain key (not just any domain) for this to return True.
    """
    host = hostname_of(url)
    if not host:
        return False
    allowlist = load_allowlist()
    if expected_domain is not None:
        return host in allowlist.get(expected_domain, [])
    return any(host in hosts for hosts in allowlist.values())


def require_allowed(url: str, expected_domain: Optional[str] = None) -> str:
    """Return the hostname if `url` is allowed, else raise AllowlistError.

    Every retrieval client must call this immediately before issuing the actual
    HTTP request so an unlisted host is refused, not fetched-then-rationalized.

    The error message intentionally never includes the allowlist file's
    absolute filesystem path: this message flows unmodified into
    `escalation.reason`, which is returned to end users via the API, and an
    absolute server path (under /home/<user>/...) would leak server
    filesystem/username details to any caller who triggers a block. Server
    operators who need the full path can look it up via ALLOWLIST_PATH in
    this module directly.
    """
    host = hostname_of(url)
    if not host:
        raise AllowlistError(f"Could not parse a hostname from URL: {url!r}")

    allowlist = load_allowlist()
    if expected_domain is not None:
        allowed_hosts = allowlist.get(expected_domain, [])
        if host not in allowed_hosts:
            raise AllowlistError(
                f"Host '{host}' is not listed under domain '{expected_domain}' in "
                f"the approved pharma source allowlist. Allowed hosts for that "
                f"domain: {allowed_hosts}."
            )
        return host

    all_hosts = {h for hosts in allowlist.values() for h in hosts}
    if host not in all_hosts:
        raise AllowlistError(
            f"Host '{host}' is not on the approved pharma source allowlist. "
            f"Allowed hosts: {sorted(all_hosts)}."
        )
    return host
