#!/usr/bin/env python3
"""Custom MCP server exposing read-only candidate/intervention data.

Wraps the exact same `backend/src/db.py` query functions the API uses —
no SQL is duplicated here. Deliberately read-only: `/screen` (real Groq
spend) and `/candidates/{patient_key}/finalize` (the app's human-in-the-loop
approve/reject gate) are NOT exposed as tools, so a connected MCP client
can inspect the system but can't trigger LLM spend or bypass the human
gate that finalizes a real clinical disposition.
"""
import json
import os
import sys
from pathlib import Path
from typing import Optional

PROJECT_DIR = Path(os.environ.get("CLAUDE_PROJECT_DIR", Path(__file__).resolve().parents[2]))
BACKEND_SRC = PROJECT_DIR / "backend" / "src"
sys.path.insert(0, str(BACKEND_SRC))

from mcp.server.fastmcp import FastMCP

import db  # noqa: E402  (backend/src on sys.path above)

DISPOSITIONS_LOG_PATH = PROJECT_DIR / "logs" / "candidate_dispositions.jsonl"

mcp = FastMCP("qualified-health")


@mcp.tool()
async def list_interventions() -> list[dict]:
    """List every configured intervention (id, name, eligibility rules, required evidence)."""
    return await db.list_interventions()


@mcp.tool()
async def get_candidates(intervention_id: Optional[str] = None) -> list[dict]:
    """List scored candidates, optionally filtered to one intervention_id. Ranked by score."""
    return await db.get_candidates(intervention_id)


@mcp.tool()
async def get_candidate_evidence(patient_key: str, intervention_id: str) -> Optional[dict]:
    """Get one candidate's full record: score, status, evidence trail, escalation."""
    return await db.get_candidate(patient_key, intervention_id)


@mcp.tool()
def get_disposition_log(limit: int = 50) -> list[dict]:
    """Tail the human-in-the-loop disposition audit log (most recent entries last)."""
    if not DISPOSITIONS_LOG_PATH.exists():
        return []
    with open(DISPOSITIONS_LOG_PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
    return [json.loads(line) for line in lines[-limit:]]


if __name__ == "__main__":
    mcp.run()
