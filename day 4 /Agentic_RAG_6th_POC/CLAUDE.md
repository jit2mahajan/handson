# AIDLC project instructions

Read the `pharma-rag-principles` skill before touching any retrieval, grounding, output-formatting, or escalation code — it states the four commitments this project is built on and how each is mechanically enforced (allowlist hook, schema `minItems`, escalation table).

Delegation, the human-in-the-loop gates, and the provider fallback mechanism are documented in `README.md`. Route work to `backend`, `frontend`, or `p3-triage` per the Delegation table there rather than editing across ownership boundaries.

Do not widen `data/allowlist/sources.json` or relax `data/schema/response_schema.json` to make a task easier — both are gated for human approval on any edit, and that gate exists on purpose.
