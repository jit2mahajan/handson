#!/usr/bin/env python3
"""PreToolUse: ask for confirmation if `git commit` is run while the
pending-tests marker (set by enforce_test_after_format.py) is still present
— i.e. code was formatted but no test run has been logged since."""
import json
import os
import re
import sys

PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", ".")
MARKER_PATH = os.path.join(PROJECT_DIR, ".claude", "audit", "pending_tests.flag")


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
    if payload.get("tool_name") != "Bash":
        sys.exit(0)

    command = (payload.get("tool_input", {}) or {}).get("command", "") or ""
    if re.search(r"\bgit\s+commit\b", command) and os.path.exists(MARKER_PATH):
        ask("Code was formatted but no test run has been logged since — "
            "confirm tests passed before committing.")

    sys.exit(0)


if __name__ == "__main__":
    main()
