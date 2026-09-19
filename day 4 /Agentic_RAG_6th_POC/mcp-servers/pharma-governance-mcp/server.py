#!/usr/bin/env python3
"""Custom MCP server exposing this project's governance logic as callable tools.

Backed by the exact same source-of-truth files the Claude Code hooks use
(`data/allowlist/sources.json`, `data/schema/response_schema.json`), so any
project — not just this one — can call the same allowlist/schema/escalation
logic over MCP instead of copying the hook scripts around.
"""
import datetime
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from mcp.server.fastmcp import FastMCP

PROJECT_DIR = Path(os.environ.get("CLAUDE_PROJECT_DIR", Path(__file__).resolve().parents[2]))
ALLOWLIST_PATH = PROJECT_DIR / "data" / "allowlist" / "sources.json"
SCHEMA_PATH = PROJECT_DIR / "data" / "schema" / "response_schema.json"
AUDIT_PATH = PROJECT_DIR / ".claude" / "audit" / "retrieval_log.jsonl"
TRIAGE_DIR = PROJECT_DIR / "reports" / "triage"

mcp = FastMCP("pharma-governance")


def _load_allowlist():
    with open(ALLOWLIST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@mcp.tool()
def check_source_allowlisted(url: str) -> dict:
    """Check whether a URL's host is on the approved pharma source allowlist.

    Returns the same verdict the check_allowlist_retrieval.py PreToolUse hook
    would give for the same URL, so callers can pre-check before attempting a
    retrieval rather than discovering it's blocked after the fact.
    """
    try:
        host = urlparse(url).hostname
    except Exception:
        return {"allowed": False, "host": None, "domain": None, "reason": "unparseable URL"}

    if not host:
        return {"allowed": False, "host": None, "domain": None, "reason": "no hostname in URL"}

    allowlist = _load_allowlist()
    for domain, hosts in allowlist.items():
        if host in hosts:
            return {"allowed": True, "host": host, "domain": domain, "reason": None}

    return {"allowed": False, "host": host, "domain": None, "reason": f"'{host}' not on allowlist"}


@mcp.tool()
def validate_response_schema(response_json: str) -> dict:
    """Validate a candidate response (as a JSON string) against
    data/schema/response_schema.json. Returns {valid, errors}.
    """
    import jsonschema

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = json.load(f)

    try:
        instance = json.loads(response_json)
    except json.JSONDecodeError as e:
        return {"valid": False, "errors": [f"invalid JSON: {e}"]}

    validator = jsonschema.Draft7Validator(schema)
    errors = [f"{'.'.join(str(p) for p in e.path)}: {e.message}" for e in validator.iter_errors(instance)]
    return {"valid": len(errors) == 0, "errors": errors}


@mcp.tool()
def log_retrieval(url: str, domain: str | None = None) -> dict:
    """Append one entry to the retrieval audit log, mirroring what
    audit_retrieval_log.py records for a Claude-Code-issued tool call —
    for retrieval performed by code that doesn't go through that hook
    (e.g. a running backend service).
    """
    try:
        host = urlparse(url).hostname
    except Exception:
        host = None

    resolved_domain = domain
    if resolved_domain is None and host:
        allowlist = _load_allowlist()
        for d, hosts in allowlist.items():
            if host in hosts:
                resolved_domain = d
                break

    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "session_id": "mcp",
        "tool_name": "mcp__pharma-governance__log_retrieval",
        "url": url,
        "host": host,
        "evidence_domain": resolved_domain,
        "cwd": str(PROJECT_DIR),
    }
    with open(AUDIT_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    return {"logged": True, "host": host, "domain": resolved_domain}


@mcp.tool()
def run_triage(window: str = "all") -> dict:
    """Summarize triage status: most recent finalized report (if any) and
    a count of raw log entries newer than it. `window` is currently
    informational only (e.g. an ISO timestamp) — pass "all" for no filter.
    This tool reports; it does not write a new report (that stays a
    p3-triage subagent responsibility, gated by human_gate.py).
    """
    finals = sorted(
        p for p in TRIAGE_DIR.glob("*-compliance-report.md") if not p.name.endswith(".draft.md")
    )
    latest_final = finals[-1].name if finals else None

    log_path = PROJECT_DIR / "logs" / "responses.jsonl"
    entry_count = 0
    if log_path.exists():
        with open(log_path, "r", encoding="utf-8") as f:
            entry_count = sum(1 for _ in f)

    return {
        "latest_finalized_report": latest_final,
        "responses_logged": entry_count,
        "window": window,
        "note": "Run the p3-triage subagent to produce/update an actual report.",
    }


if __name__ == "__main__":
    mcp.run()
