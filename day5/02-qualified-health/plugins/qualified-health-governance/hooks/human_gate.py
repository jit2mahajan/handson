#!/usr/bin/env python3
"""PreToolUse: pause for human approval on writes/edits that matter enough to
require sign-off, instead of letting them proceed silently.

Gated:
  1. Edits to the source-of-truth allowlist or schema.
  2. Escalated candidate evaluations being logged (escalation.required == true).
  3. A triage report being filed as *final* (non-.draft.md filename).
  4. A candidate disposition write that sets a terminal status
     (approved/rejected) — i.e. finalizing a patient.
"""
import json
import os
import re
import sys
import time

PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", ".")
LIFECYCLE_LOG_PATH = os.path.join(PROJECT_DIR, ".claude", "audit", "lifecycle_log.jsonl")

GATED_EXACT = {
    os.path.join("data", "allowlist", "sources.json"),
    os.path.join("data", "schema", "response_schema.json"),
}

TERMINAL_STATUSES = ("approved", "rejected")


def log_gate_event(reason):
    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "event": "human_gate.ask",
        "reason": reason,
    }
    os.makedirs(os.path.dirname(LIFECYCLE_LOG_PATH), exist_ok=True)
    with open(LIFECYCLE_LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")


def ask(reason):
    log_gate_event(reason)
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": reason,
        }
    }))


def relpath(project_dir, file_path):
    if not file_path:
        return ""
    try:
        return os.path.relpath(file_path, project_dir)
    except Exception:
        return file_path


def main():
    payload = json.load(sys.stdin)
    tool_name = payload.get("tool_name", "")
    if tool_name not in ("Write", "Edit"):
        sys.exit(0)

    tool_input = payload.get("tool_input", {}) or {}
    file_path = tool_input.get("file_path", "")
    rel = relpath(PROJECT_DIR, file_path)

    if rel in GATED_EXACT:
        ask(f"Editing '{rel}' is a source-of-truth change (allowlist / schema) — "
            f"requires human approval before it's applied.")
        sys.exit(0)

    triage_dir = os.path.join("reports", "triage")
    if rel.startswith(triage_dir) and rel.endswith("-compliance-report.md") \
            and not rel.endswith(".draft.md"):
        ask(f"Filing '{rel}' as a final compliance report requires human review "
            f"before it's persisted.")
        sys.exit(0)

    dispositions_path = os.path.join("logs", "candidate_dispositions.jsonl")
    if rel == dispositions_path:
        content = tool_input.get("content", "") or ""
        status_pattern = r'"status"\s*:\s*"(%s)"' % "|".join(TERMINAL_STATUSES)
        if re.search(status_pattern, content):
            ask("This write finalizes a patient candidate's disposition "
                "(approved/rejected) — requires human sign-off before it's "
                "logged and acted on.")
            sys.exit(0)

    if rel == os.path.join("logs", "responses.jsonl"):
        content = tool_input.get("content", "") or ""
        if re.search(r'"escalation"', content) and re.search(r'"required"\s*:\s*true', content):
            ask("This candidate evaluation is escalated (low-confidence or "
                "missing evidence) — requires human sign-off before being "
                "logged and delivered to the care team.")
            sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
