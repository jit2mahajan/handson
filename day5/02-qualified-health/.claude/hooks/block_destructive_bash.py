#!/usr/bin/env python3
"""PreToolUse: hard-deny destructive Bash commands outright (not just ask) —
recursive/force deletes and history-rewriting git operations are too
dangerous around patient data to leave to a prompt."""
import json
import re
import sys

DENY_PATTERNS = [
    r"\brm\s+(-\w*r\w*f\w*|-\w*f\w*r\w*)\b",   # rm -rf / rm -fr (and combined flags)
    r"\bgit\s+push\s+.*--force\b",
    r"\bgit\s+reset\s+--hard\b",
    r"\bgit\s+clean\s+.*-[a-z]*f",
    r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;",   # fork bomb
]


def deny(reason):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))


def main():
    payload = json.load(sys.stdin)
    if payload.get("tool_name") != "Bash":
        sys.exit(0)

    command = (payload.get("tool_input", {}) or {}).get("command", "") or ""

    for pattern in DENY_PATTERNS:
        if re.search(pattern, command):
            deny(f"Command matched a denied destructive pattern ('{pattern}') — "
                 f"blocked outright, not escalated for approval.")
            sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
