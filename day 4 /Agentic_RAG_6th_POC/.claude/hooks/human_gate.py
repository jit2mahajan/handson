#!/usr/bin/env python3
"""PreToolUse: pause for human approval on writes/edits that matter enough to
require sign-off, instead of letting them proceed silently.

Gated:
  1. Edits to the source-of-truth allowlist or schema.
  2. Escalated responses being logged (escalation.required == true).
  3. A triage report being filed as *final* (non-.draft.md filename).
  4. A new LLM-provider fallback key being stored.
  5. A spec (security review) report being filed as *final* (non-.draft.md filename).
"""
import json
import os
import sys

GATED_EXACT = {
    os.path.join("data", "allowlist", "sources.json"),
    os.path.join("data", "schema", "response_schema.json"),
    os.path.join("backend", ".runtime", "provider_key"),
}


def ask(reason):
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
    project_dir = os.environ.get("CLAUDE_PROJECT_DIR", ".")
    file_path = tool_input.get("file_path", "")
    rel = relpath(project_dir, file_path)

    if rel in GATED_EXACT:
        ask(f"Editing '{rel}' is a source-of-truth change (allowlist / schema / "
            f"provider key) — requires human approval before it's applied.")
        sys.exit(0)

    triage_dir = os.path.join("reports", "triage")
    if rel.startswith(triage_dir) and rel.endswith("-compliance-report.md") \
            and not rel.endswith(".draft.md"):
        ask(f"Filing '{rel}' as a final compliance report requires human review "
            f"before it's persisted.")
        sys.exit(0)

    spec_dir = os.path.join("reports", "spec")
    if rel.startswith(spec_dir) and rel.endswith("-security-review.md") \
            and not rel.endswith(".draft.md"):
        ask(f"Filing '{rel}' as a final security review requires human review "
            f"before it's persisted.")
        sys.exit(0)

    if rel == os.path.join("logs", "responses.jsonl"):
        content = tool_input.get("content", "") or ""
        if '"required": true' in content and '"escalation"' in content:
            ask("This response is escalated (low-confidence or conflicting "
                "safety/clinical evidence) — requires human sign-off before being "
                "logged and delivered to the team.")
            sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
