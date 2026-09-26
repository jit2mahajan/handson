#!/usr/bin/env python3
"""PreToolUse: gate any retrieval (WebFetch/Bash/mcp fetch) against a URL not
present in data/allowlist/sources.json — ask for human approval instead of
silently fetching from an unreviewed source."""
import json
import os
import sys
from urllib.parse import urlparse

PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", ".")
ALLOWLIST_PATH = os.path.join(PROJECT_DIR, "data", "allowlist", "sources.json")


def load_allowlist_hosts():
    try:
        with open(ALLOWLIST_PATH) as f:
            data = json.load(f)
    except Exception:
        return set()
    hosts = set()
    for value in data.values():
        if isinstance(value, list):
            hosts.update(value)
    return hosts


def extract_url(tool_name, tool_input):
    if tool_name == "WebFetch":
        return tool_input.get("url", "")
    if tool_name == "mcp__fetch__fetch":
        return tool_input.get("url", "") or tool_input.get("uri", "")
    if tool_name == "Bash":
        command = tool_input.get("command", "") or ""
        for token in command.split():
            if token.startswith("http://") or token.startswith("https://"):
                return token
    return ""


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

    hostname = urlparse(url).hostname or ""
    allowed_hosts = load_allowlist_hosts()

    if hostname not in allowed_hosts:
        ask(f"'{hostname}' is not in data/allowlist/sources.json — retrieving from "
            f"an unreviewed source requires human approval.")

    sys.exit(0)


if __name__ == "__main__":
    main()
