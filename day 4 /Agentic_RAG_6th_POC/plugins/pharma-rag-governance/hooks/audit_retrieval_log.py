#!/usr/bin/env python3
"""PostToolUse: append every retrieval-shaped tool call to the audit trail.

Logs both allowed and denied/asked attempts — the attempt itself is what
matters for traceability and allowlist-drift detection. Never logs anything
under backend/.runtime/ (provider API keys) so key material can never end up
in this file.
"""
import datetime
import json
import os
import re
import sys
from urllib.parse import urlparse

URL_RE = re.compile(r"https?://[^\s\"'<>]+")


def extract_url(tool_name, tool_input):
    if tool_name in ("WebFetch", "mcp__fetch__fetch"):
        return tool_input.get("url")
    if tool_name == "Bash":
        match = URL_RE.search(tool_input.get("command", ""))
        return match.group(0) if match else None
    return None


def main():
    payload = json.load(sys.stdin)
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input", {}) or {}

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")

    file_path = tool_input.get("file_path", "")
    if file_path and os.path.join("backend", ".runtime") in file_path:
        sys.exit(0)

    url = extract_url(tool_name, tool_input)
    if not url:
        sys.exit(0)

    try:
        host = urlparse(url).hostname
    except Exception:
        host = None

    domain_tag = None
    allowlist_path = os.path.join(project_dir, "data", "allowlist", "sources.json")
    try:
        with open(allowlist_path, "r", encoding="utf-8") as f:
            allowlist = json.load(f)
        for domain, hosts in allowlist.items():
            if host in hosts:
                domain_tag = domain
                break
    except FileNotFoundError:
        pass

    audit_dir = os.path.join(project_dir, ".claude", "audit")
    audit_path = os.path.join(audit_dir, "retrieval_log.jsonl")
    os.makedirs(audit_dir, exist_ok=True)

    entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "session_id": payload.get("session_id"),
        "tool_name": tool_name,
        "url": url,
        "host": host,
        "evidence_domain": domain_tag,
        "cwd": payload.get("cwd"),
    }
    with open(audit_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": (
                f"Retrieval audit log updated at .claude/audit/retrieval_log.jsonl "
                f"(host={host}, domain={domain_tag})."
            ),
        }
    }))


if __name__ == "__main__":
    main()
