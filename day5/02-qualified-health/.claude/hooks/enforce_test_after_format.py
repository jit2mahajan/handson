#!/usr/bin/env python3
"""PostToolUse: track whether a formatter ran without a subsequent test run.
Sets a pending-tests marker after a formatter command; a test-runner command
clears it. Paired with check_tests_before_commit.py, which blocks `git
commit` while the marker is set — enforcing "testing is done after
formatting"."""
import json
import os
import re
import sys

PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", ".")
MARKER_PATH = os.path.join(PROJECT_DIR, ".claude", "audit", "pending_tests.flag")

FORMATTER_PATTERNS = [r"\bblack\b", r"\bruff\s+format\b", r"\bprettier\b", r"\bisort\b"]
TEST_PATTERNS = [r"\bpytest\b", r"\bnpm\s+test\b", r"\bnpm\s+run\s+test\b", r"\bjest\b"]


def main():
    payload = json.load(sys.stdin)
    if payload.get("tool_name") != "Bash":
        sys.exit(0)

    command = (payload.get("tool_input", {}) or {}).get("command", "") or ""
    os.makedirs(os.path.dirname(MARKER_PATH), exist_ok=True)

    if any(re.search(p, command) for p in TEST_PATTERNS):
        if os.path.exists(MARKER_PATH):
            os.remove(MARKER_PATH)
        sys.exit(0)

    if any(re.search(p, command) for p in FORMATTER_PATTERNS):
        with open(MARKER_PATH, "w") as f:
            f.write(command)
        sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
