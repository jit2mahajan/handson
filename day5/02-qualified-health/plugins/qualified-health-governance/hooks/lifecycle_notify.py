#!/usr/bin/env python3
"""Notification / SessionStart / SessionEnd / Stop / SubagentStop: append a
timestamped entry to the lifecycle log for every lifecycle event, so there's
a durable record of session/subagent activity (not just the interactive
prompt)."""
import json
import os
import sys
import time

PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", ".")
LOG_PATH = os.path.join(PROJECT_DIR, ".claude", "audit", "lifecycle_log.jsonl")


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": payload.get("hook_event_name", "unknown"),
        "session_id": payload.get("session_id", ""),
        "message": payload.get("message", ""),
    }
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
    sys.exit(0)


if __name__ == "__main__":
    main()
