#!/usr/bin/env python3
"""PreToolUse: gate any retrieval-shaped tool call against the pharma source allowlist.

Never auto-denies — an unlisted or unparseable source asks a human instead,
per the human-in-the-loop decision for this project.
"""
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


def ask(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": reason,
        }
    }))


def main():
    payload = json.load(sys.stdin)
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input", {}) or {}

    url = extract_url(tool_name, tool_input)
    if not url:
        sys.exit(0)

    try:
        host = urlparse(url).hostname
    except Exception:
        host = None

    if not host:
        ask(f"Could not parse a hostname from '{url}'. Confirm this call retrieves "
            f"only from an approved pharma source before proceeding.")
        sys.exit(0)

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")
    allowlist_path = os.path.join(project_dir, "data", "allowlist", "sources.json")

    try:
        with open(allowlist_path, "r", encoding="utf-8") as f:
            allowlist = json.load(f)
    except FileNotFoundError:
        ask(f"Allowlist file not found at {allowlist_path}. Confirm '{host}' is an "
            f"approved pharma source before proceeding.")
        sys.exit(0)

    allowed_hosts = {h for hosts in allowlist.values() for h in hosts}

    if host not in allowed_hosts:
        ask(f"'{host}' is not on the approved pharma source allowlist "
            f"(data/allowlist/sources.json). Approve to allow this one-time retrieval, "
            f"or reject and add it to the allowlist as a reviewed change if it should "
            f"be permanent. Approved hosts: {sorted(allowed_hosts)}.")
        sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
