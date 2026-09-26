import json
import os
import time
from typing import Optional

import db
import eligibility_engine
import evidence_extraction

PROJECT_DIR = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())
DISPOSITIONS_LOG_PATH = os.path.join(PROJECT_DIR, "logs", "candidate_dispositions.jsonl")


def _append_disposition_log(entry: dict) -> None:
    os.makedirs(os.path.dirname(DISPOSITIONS_LOG_PATH), exist_ok=True)
    with open(DISPOSITIONS_LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")


async def screen_intervention(intervention_id: str) -> list[dict]:
    criteria = await db.get_criteria(intervention_id)
    if criteria is None:
        raise ValueError(f"Unknown intervention_id: {intervention_id}")

    patients = await db.get_all_patients()
    screened: list[dict] = []

    for patient in patients:
        eval_result = eligibility_engine.evaluate(criteria["rules"], patient)
        if eval_result["result"] is False:
            continue  # clearly ineligible — not a candidate

        existing = await db.get_candidate(patient["patient_key"], intervention_id)
        if existing and existing["status"] in ("approved", "rejected"):
            # Already finalized by a coordinator — skip re-extraction (which
            # may make a live Groq call) rather than redo work whose result
            # the DB write would discard anyway.
            continue

        claims, escalation = await evidence_extraction.extract(patient, criteria, eval_result)
        score = 1.0 if eval_result["result"] is True else 0.5

        await db.upsert_candidate(
            patient["patient_key"], intervention_id, score, claims, escalation
        )
        screened.append({
            "patient_key": patient["patient_key"],
            "intervention_id": intervention_id,
            "score": score,
            "claims": claims,
            "escalation": escalation,
        })

    return screened


async def update_disposition(patient_key: str, intervention_id: str, status: str) -> bool:
    if status not in ("flagged", "pending_review"):
        raise ValueError("PATCH may only set status to 'flagged' or 'pending_review' — "
                          "use the /finalize endpoint for approved/rejected")
    updated = await db.set_candidate_status(patient_key, intervention_id, status)
    if updated:
        _append_disposition_log({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "patient_key": patient_key,
            "intervention_id": intervention_id,
            "status": status,
        })
    return updated


async def finalize_candidate(
    patient_key: str, intervention_id: str, status: str, confirmed_by: str
) -> bool:
    if status not in ("approved", "rejected"):
        raise ValueError("finalize status must be 'approved' or 'rejected'")
    if not confirmed_by:
        raise ValueError("confirmed_by is required to finalize a candidate")

    candidate = await db.get_candidate(patient_key, intervention_id)
    if candidate is None:
        return False

    updated = await db.set_candidate_status(patient_key, intervention_id, status)
    if updated:
        _append_disposition_log({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "patient_key": patient_key,
            "intervention_id": intervention_id,
            "status": status,
            "confirmed_by": confirmed_by,
        })
    return updated
