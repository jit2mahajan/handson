"""Coordinator-facing chatbot: stateless, single-turn Q&A grounded only in
the current candidates table (same data GET /candidates already exposes).
Groq-backed (openai/gpt-oss-120b); absent GROQ_API_KEY, degrades to a stub
answer rather than crashing, matching evidence_extraction.py's pattern.
"""
import groq_client
from db import get_candidates

SYSTEM_PROMPT = (
    "You are a clinical-coordinator assistant for a patient-screening tool. "
    "The user message contains the full candidate data you may use — treat it "
    "as your only source of truth. Never speculate, never use outside medical "
    "knowledge, and never answer questions unrelated to these candidates (say "
    "you can only answer questions about the current candidate list instead). "
    "Every claim must cite the exact patient_key it came from, written exactly "
    "as it appears in the data (e.g. pk_abc123def456). Respond in plain text "
    "only — no markdown formatting. If the data doesn't answer the question, "
    "say so rather than guessing."
)


def _build_context(candidates: list[dict]) -> str:
    if not candidates:
        return "No candidates found."
    lines = []
    for c in candidates:
        evidence = "; ".join(
            f"{e['evidence_domain']}: {e['statement']}" for e in (c.get("evidence") or [])
        )
        escalation = c.get("escalation") or {}
        lines.append(
            f"- patient_key={c['patient_key']} status={c['status']} score={c['score']} "
            f"escalated={escalation.get('required', False)} evidence=[{evidence}]"
        )
    return "\n".join(lines)


async def answer(message: str, intervention_id: str | None) -> dict:
    candidates = await get_candidates(intervention_id)
    context = _build_context(candidates)
    grounded_on = [c["patient_key"] for c in candidates]

    if groq_client.get_client() is None:
        return {
            "answer": (
                "(unverified — no GROQ_API_KEY set) Cannot generate a live answer. "
                f"{len(candidates)} candidate(s) currently on file for this query."
            ),
            "grounded_on": grounded_on,
        }

    try:
        reply = groq_client.chat_completion(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Candidate data:\n{context}\n\nQuestion: {message}"},
            ],
            max_tokens=400,
        )
    except Exception as e:
        return {
            "answer": f"(Groq call failed: {type(e).__name__} — check GROQ_API_KEY) {len(candidates)} candidate(s) on file for this query.",
            "grounded_on": grounded_on,
        }
    return {"answer": reply, "grounded_on": grounded_on}
