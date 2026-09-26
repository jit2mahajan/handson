# AIDLC — Agentic RAG for Literature Review & Drug-Discovery Intelligence

A grounded, agentic retrieval system for pharma R&D: given a research question, it tells the team which evidence is relevant, how confident they can be, and the source trail. **It supports discovery and synthesis — it does not make the scientific decision.**

## Four commitments (mechanically enforced, not just documented)

1. **Retrieve only from approved sources** — `data/allowlist/sources.json`, enforced by `.claude/hooks/check_allowlist_retrieval.py`.
2. **Ground every claim** — `data/schema/response_schema.json`, `citations.minItems: 1`.
3. **Return structured output** — every response validates against the schema above; no free text.
4. **Fail gracefully** — `insufficient_evidence`/`escalated` instead of fabrication; see `.claude/skills/pharma-rag-principles/references/escalation-rules.md`.

Four evidence domains: target identification & validation, chemical & compound intelligence, clinical & safety intelligence, competitive & regulatory intelligence. Domain routing is agent-driven per query — see `references/domain-routing.md`.

## Human-in-the-loop gates

Five points pause for approval instead of deciding silently (`permissionDecision: "ask"`):

1. New/unlisted source requested during retrieval.
2. Escalation triggered (`escalation.required: true` being logged).
3. A triage report filed as final (not `.draft.md`).
4. An edit to the allowlist, the schema, or a new provider fallback key being stored.
5. A spec (security review) report filed as final (not `.draft.md`).

## Delegation

| Request shape | Delegate to | Notes |
|---|---|---|
| Retrieval, schema, grounding, or API logic | `backend` | Owns `data/schema/response_schema.json` |
| UI rendering, evidence/confidence/citation display | `frontend` | Never touches backend or data files |
| "Run triage", "check compliance", "review the audit log" | `p3-triage` | Read-only reviewer |
| "Security review", "check for vulnerabilities", "is this safe to ship" | `spec` | Read-only reviewer, third agent alongside `backend`/`frontend` |
| A change that touches the schema **and** its UI | `backend` first, then `frontend` | Sequential — frontend depends on the finalized (and human-approved) schema shape |

## LLM provider fallback

If the default LLM provider is unreachable or unconfigured, the app lets the user supply an alternate provider API key (e.g. OpenRouter) via `POST /settings/provider-key` (backend) / the "Connect" form (frontend). The key is stored only at `backend/.runtime/provider_key` (gitignored) and never logged.

## Layout

See `.claude/skills/pharma-rag-principles/SKILL.md` for the governing principles, `backend/README.md` and `frontend/README.md` for their respective contracts, and the plan history under this repo's `.claude/` for the full build roadmap (steps 3-20).

## Plugins

- **Internal**: `plugins/pharma-rag-governance/` — the governance layer (skill + hooks + backend/frontend/p3-triage agents) packaged as an installable plugin, so it can be dropped into other repos instead of manually copied.
- **External**: none installed yet. Candidates to evaluate against the actual claude.com/plugins marketplace listing (not assumed in advance): a git/PR-workflow plugin for the step 12 code-review pass, and FastAPI/Python tooling support. This line gets updated once something is actually installed.
