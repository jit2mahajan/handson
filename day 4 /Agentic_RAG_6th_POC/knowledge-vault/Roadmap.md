# Roadmap

The 20-step build plan for AIDLC, and status as of this writing. See [[Home]] to navigate back.

| Step | What | Status |
|---|---|---|
| 1-2 | Domain/commitment definition | Done (pre-scaffold decisions) |
| 3 | `pharma-rag-principles` skill + reference docs | Done |
| 4 | Hooks: `check_allowlist_retrieval.py`, `human_gate.py`, `audit_retrieval_log.py` | Done |
| 5 | Subagents: `backend`, `frontend`, `p3-triage` | Done |
| 6 | Subagent context isolation — [[agent-context-contract]] | Done |
| 7 | Delegation table (root [[README]]) | Done |
| 8 | Context trimming — [[context-management]] | Done |
| 9 | Reusable template — `templates/agentic-governance-scaffold/` | Done |
| 10 | Installable plugin — `plugins/pharma-rag-governance/` | Done |
| 11 | RAG engine (backend) + UI (frontend) | Done — backend + frontend built and smoke-tested; `api.platform.opentargets.org`/`api.fda.gov` added to allowlist (human-approved) and live-verified |
| 12 | Code review of steps 11 diff | Done — 9 findings in `reports/code-review/2026-09-19-code-review.md`; all fixed (escalation gap, stale allowlist cache, grounding heuristic, dead validation path, path-leak in errors, CORS, frontend XSS, port collision) |
| 13 | `.mcp.json` registration | Done |
| 14 | Custom `pharma-governance-mcp` server | Done |
| 15 | Observability (OTel + SigNoz) | Done — `backend/src/observability/otel.py`, `docker-compose.observability.yml` (SigNoz via Foundry-generated manifests), `observability/dashboards/README.md`; verified with no collector running |
| 16 | Load testing (k6) | Done — `loadtest/k6/query_load_test.js` |
| 17 | Knowledge vault (this vault) | Done |
| 18 | Graphify knowledge graph | Done — `graphify-out/graph.html`/`graph.json`/`GRAPH_REPORT.md`; 392 nodes, 722 edges, 22 communities; health warning noted (90 dangling-endpoint edges) |
| 19 | Prompt engineering pass | Done — prompts checked against heuristic implementations (no changes needed); eval set re-run after step 12's grounding fix, 8/8 pass |
| 20 | Demo script | Not started |

See [[Architecture-Decisions]] for the reasoning behind the choices already made.
