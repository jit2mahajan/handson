#!/usr/bin/env python3
"""PostToolUse: append every retrieval call (WebFetch/Bash/mcp fetch) to a
durable audit log, so every source access is traceable after the fact."""
import json
import os
import sys
import time

PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", ".")
LOG_PATH = os.path.join(PROJECT_DIR, ".claude", "audit", "retrieval_log.jsonl")


def main():
    payload = json.load(sys.stdin)
    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "tool_name": payload.get("tool_name", ""),
        "tool_input": payload.get("tool_input", {}),
    }
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")
    sys.exit(0)


if __name__ == "__main__":
    main()
