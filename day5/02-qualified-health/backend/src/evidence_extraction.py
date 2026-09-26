"""Evidence extraction: structured claims are built directly from the
patient's structured data (real, always grounded, no LLM needed). Claims for
rule leaves with missing structured data ("unknown") fall back to a
pgvector similarity search over the patient's clinical notes; turning that
retrieved snippet into a verified statement is where Groq (openai/gpt-oss-120b)
would be called — stubbed absent GROQ_API_KEY, per the documented simplification.
"""
from typing import Optional

import db
import groq_client
from embeddings import embed


def _structured_claim(leaf: dict) -> Optional[dict]:
    if leaf["outcome"] is not True:
        return None
    field = leaf["field"]
    matched = leaf["matched_value"]
    if field == "conditions":
        return {
            "evidence_domain": "diagnosis_date",
            "statement": f"Diagnosed with {matched['code']}"
            + (f" on {matched['diagnosed_on']}" if matched.get("diagnosed_on") else ""),
            "source": "structured_ehr_data",
            "snippet": str(matched),
        }
    if field.startswith("labs."):
        lab_name = field.split(".", 1)[1]
        return {
            "evidence_domain": "lab_value",
            "statement": f"{lab_name} = {matched} ({leaf['op']} {leaf['value']} threshold met)",
            "source": "structured_lab_data",
            "snippet": f"{lab_name}: {matched}",
        }
    return None


async def _note_based_claim(patient_key: str, criteria_name: str) -> tuple[Optional[dict], bool, str]:
    query_embedding = embed(criteria_name)
    matches = await db.search_notes_by_similarity(patient_key, query_embedding, limit=1)
    if not matches:
        return None, True, "no supporting clinical note found for this criterion"

    snippet = matches[0]["text"][:280]

    if groq_client.get_client() is not None:
        try:
            statement = groq_client.chat_completion([{
                "role": "user",
                "content": (
                    f'Clinical note snippet: "{snippet}"\n\n'
                    f"Task: write exactly one factual sentence describing what this snippet says "
                    f"about eligibility for: {criteria_name}. Use only information stated in the "
                    "snippet — do not infer, do not use outside medical knowledge, and do not "
                    "repeat these instructions. If the snippet does not address this criterion, "
                    "say so in one sentence instead of guessing."
                ),
            }])
            return (
                {"evidence_domain": "note_snippet", "statement": statement, "source": "clinical_notes", "snippet": snippet},
                False,
                "",
            )
        except Exception as e:
            statement = f"(Groq call failed: {type(e).__name__} — check GROQ_API_KEY) Closest matching note: \"{snippet}\""
            return (
                {"evidence_domain": "note_snippet", "statement": statement, "source": "clinical_notes", "snippet": snippet},
                True,
                "evidence extraction failed — Groq call errored, check GROQ_API_KEY",
            )

    statement = f"(unverified — no GROQ_API_KEY set) Closest matching note: \"{snippet}\""
    return (
        {"evidence_domain": "note_snippet", "statement": statement, "source": "clinical_notes", "snippet": snippet},
        True,
        "evidence extraction not LLM-verified — set GROQ_API_KEY for live extraction",
    )


async def extract(patient: dict, criteria: dict, eval_result: dict) -> tuple[list[dict], dict]:
    claims: list[dict] = []
    escalation_reasons: list[str] = []

    for leaf in eval_result["leaves"]:
        structured = _structured_claim(leaf)
        if structured:
            claims.append(structured)
        elif leaf["outcome"] is None:
            note_claim, needs_escalation, reason = await _note_based_claim(
                patient["patient_key"], criteria["name"]
            )
            if note_claim:
                claims.append(note_claim)
            if needs_escalation and reason:
                escalation_reasons.append(reason)

    if eval_result["result"] is None:
        escalation_reasons.append(
            "structured data insufficient to fully confirm or rule out eligibility"
        )

    if not claims:
        claims.append({
            "evidence_domain": "note_snippet",
            "statement": "No structured or note-based evidence found for this candidate.",
            "source": "none",
            "snippet": "",
        })
        escalation_reasons.append("no evidence available")

    escalation = {
        "required": len(escalation_reasons) > 0,
        "reason": "; ".join(dict.fromkeys(escalation_reasons)),
    }
    return claims, escalation
