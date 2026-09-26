# Roadmap

Vault-native step-status mirror of [[detailed-plan]]'s 20-step table. This is a status view for
vault navigation only — [[detailed-plan]] is the source of truth for what each step actually
required and how it was verified.

| Step | What | Status |
|---|---|---|
| 1 | Problem statement | Done — [[PLAN]] |
| 2 | AIDLC plan (HLD/LLD) | Done — [[PLAN]] |
| 3 | Skills + hooks | Done — `.claude/skills/`, `.claude/hooks/` |
| 4 | Subagents: backend, frontend | Done — `.claude/agents/backend.md`, `.claude/agents/frontend.md` |
| 5 | `p3-triage` subagent | Done — `.claude/agents/p3-triage.md` |
| 6 | Subagent context isolation | Done — [[agent-context-contract]] |
| 7 | Delegation table | Done — [[README]] |
| 8 | Context trimming | Done — [[context-management]] |
| 9 | Reusable plugin scaffold | Done — `plugins/qualified-health-governance/`, see [[detailed-plan]] addendum "plugin packaging" |
| 10 | Plugins (internal/external) | Done — see [[detailed-plan]] addendum "plugin packaging" |
| 11 | RAG engine (essential features) | Done — see [[detailed-plan]] Stage B |
| 12 | Test, review, report | Done — manual review, see [[Architecture-Decisions]] and `reports/code-review/2026-09-26-code-review.md` |
| 13 | MCP server registration | Done — `.mcp.json`, see [[detailed-plan]] addendum "MCP server" |
| 14 | Custom MCP server | Done — `mcp-servers/qualified-health-mcp/`, see [[detailed-plan]] addendum "MCP server" |
| 15 | Observability (OpenTelemetry + SigNoz) | Done — see [[detailed-plan]] addendum "observability" |
| 16 | Load testing (k6 + dashboard viz) | Partially done — chat-only k6 script + in-UI self-test; result dashboard still planned |
| 17 | Knowledge vault (this vault) | **Done** — [[Home]], [[Architecture-Decisions]], this file |
| 18 | Graphify knowledge graph | Planned — gated behind the `/graphify` skill only |
| 19 | Prompt engineering pass | Done — see [[detailed-plan]] addendum "prompt-engineering pass" |
| 20 | Demo for first user | Done — `DEMO.md`, see [[detailed-plan]] addendum "demo script" |

## Not in scope

Step 18 (graphify) is intentionally excluded from this project's implementation pass — it's gated
behind the `/graphify` skill only, per the user's global CLAUDE.md.
