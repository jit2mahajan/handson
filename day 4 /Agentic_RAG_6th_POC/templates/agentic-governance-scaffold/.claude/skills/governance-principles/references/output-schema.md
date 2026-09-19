# Output schema

Canonical schema: `data/schema/response_schema.json` (draft-07, `AgenticResponse`). Every response your app emits or logs must validate against it.

- `answer_status`: `answered | insufficient_evidence | escalated`.
- Each claim requires `statement`, `confidence`, `evidence_domain` (one of your project's domain enums), and `citations` with **`minItems: 1`** — the structural enforcement that makes an ungrounded claim impossible to emit.
- `escalation: { required, reason }` — `required: true` should be gated for human sign-off before logging/delivery.
