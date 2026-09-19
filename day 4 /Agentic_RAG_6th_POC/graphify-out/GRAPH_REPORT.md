# Graph Report - Agentic_RAG_6th_POC  (2026-09-19)

## Corpus Check
- Corpus is ~22,054 words - fits in a single context window. You may not need a graph.

## Summary
- 392 nodes · 722 edges · 22 communities (14 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.88)
- Token cost: 236,234 input · 0 output

## Community Hubs (Navigation)
- Governance Hooks (Allowlist + Audit)
- Knowledge Vault, Roadmap & Load-Test Docs
- ClinicalTrials.gov Retrieval Client
- Subagent Governance & Delegation
- Grounding & Backend Contract
- FastAPI Query API
- Template Response Schema (genericized)
- Response Schema (canonical)
- Frontend Rendering (app.js)
- Schema Structural Constraints (claims)
- Pharma Governance MCP Server
- Schema Structural Constraints (citations)
- k6 Load Test Script
- MCP Registration Config

## God Nodes (most connected - your core abstractions)
1. `require_allowed()` - 23 edges
2. `Backend README / Contract` - 21 edges
3. `Backend Subagent` - 20 edges
4. `AIDLC Root README` - 19 edges
5. `P3-Triage Subagent` - 16 edges
6. `Roadmap vault note (20-step build plan)` - 16 edges
7. `Pharma RAG Principles Skill` - 15 edges
8. `Knowledge Vault Home` - 14 edges
9. `Output Schema Walkthrough` - 13 edges
10. `build_claims()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Output schema walkthrough (plugin copy)` --semantically_similar_to--> `Output schema reference (generic template)`  [INFERRED] [semantically similar]
  plugins/pharma-rag-governance/skills/pharma-rag-principles/references/output-schema.md → templates/agentic-governance-scaffold/.claude/skills/governance-principles/references/output-schema.md
- `app.js isProviderUnreachable()` --conceptually_related_to--> `api/main.py - FastAPI GET /health, POST /query, POST /settings/provider-key`  [AMBIGUOUS]
  frontend/README.md → backend/README.md
- `Pharma RAG Principles skill (plugin copy)` --semantically_similar_to--> `Governance Principles skill (generic template)`  [INFERRED] [semantically similar]
  plugins/pharma-rag-governance/skills/pharma-rag-principles/SKILL.md → templates/agentic-governance-scaffold/.claude/skills/governance-principles/SKILL.md
- `Source allowlist reference (plugin copy)` --semantically_similar_to--> `Source allowlist reference (generic template)`  [INFERRED] [semantically similar]
  plugins/pharma-rag-governance/skills/pharma-rag-principles/references/allowlist.md → templates/agentic-governance-scaffold/.claude/skills/governance-principles/references/allowlist.md
- `Escalation decision table (plugin copy)` --semantically_similar_to--> `Escalation decision table (generic template)`  [INFERRED] [semantically similar]
  plugins/pharma-rag-governance/skills/pharma-rag-principles/references/escalation-rules.md → templates/agentic-governance-scaffold/.claude/skills/governance-principles/references/escalation-rules.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Mechanisms enforcing the four commitments (allowlist hook, schema minItems, escalation table)** — claude_hooks_check_allowlist_retrieval_check_allowlist_retrieval_hook, data_schema_response_schema_response_schema_json, claude_skills_pharma_rag_principles_references_escalation_rules_escalation_rules_doc, claude_skills_pharma_rag_principles_skill_four_commitments [EXTRACTED 1.00]
- **Backend/Frontend/P3-Triage subagents governed by shared context contract and delegation table** — claude_agents_backend_backend_agent, claude_agents_frontend_frontend_agent, claude_agents_p3_triage_p3_triage_agent, claude_skills_pharma_rag_principles_references_agent_context_contract_agent_context_contract_doc [EXTRACTED 1.00]
- **Governance layer packaged as installable plugin: skill + hooks + three subagents** — claude_skills_pharma_rag_principles_skill_pharma_rag_principles_skill, claude_hooks_check_allowlist_retrieval_check_allowlist_retrieval_hook, claude_hooks_human_gate_human_gate_hook, claude_agents_backend_backend_agent, claude_agents_frontend_frontend_agent, claude_agents_p3_triage_p3_triage_agent [EXTRACTED 1.00]
- **Delegation triad (backend/frontend/p3-triage) governed by pharma-rag-principles skill** — plugins_pharma_rag_governance_agents_backend_backend, plugins_pharma_rag_governance_agents_frontend_frontend, plugins_pharma_rag_governance_agents_p3_triage_p3_triage, plugins_pharma_rag_governance_skills_pharma_rag_principles_skill_skill [INFERRED 0.85]
- **Four mechanically-enforced commitments reference set** — plugins_pharma_rag_governance_skills_pharma_rag_principles_references_allowlist_allowlist, plugins_pharma_rag_governance_skills_pharma_rag_principles_references_output_schema_output_schema, plugins_pharma_rag_governance_skills_pharma_rag_principles_references_escalation_rules_escalation_rules, plugins_pharma_rag_governance_skills_pharma_rag_principles_references_domain_routing_domain_routing [EXTRACTED 1.00]
- **2026-09-19 code review's nine findings** — reports_code_review_2026_09_19_code_review_code_review, reports_code_review_2026_09_19_code_review_escalation_gap_finding, reports_code_review_2026_09_19_code_review_cors_finding, reports_code_review_2026_09_19_code_review_corroboration_heuristic_finding, reports_code_review_2026_09_19_code_review_stale_allowlist_cache_finding, reports_code_review_2026_09_19_code_review_dead_validation_finding, reports_code_review_2026_09_19_code_review_path_leak_finding, reports_code_review_2026_09_19_code_review_xss_finding, reports_code_review_2026_09_19_code_review_provider_key_auth_finding, reports_code_review_2026_09_19_code_review_port_collision_finding [EXTRACTED 1.00]

## Communities (22 total, 8 thin omitted)

### Community 0 - "Governance Hooks (Allowlist + Audit)"
Cohesion: 0.08
Nodes (38): extract_url(), main(), PostToolUse: append every retrieval-shaped tool call to the audit trail. Logs…, ask(), extract_url(), main(), PreToolUse: gate any retrieval-shaped tool call against the pharma source…, ask() (+30 more)

### Community 1 - "Knowledge Vault, Roadmap & Load-Test Docs"
Cohesion: 0.07
Nodes (46): Knowledge Vault README, Allowlist expansion for opentargets/openfda (step 11), Observability deferral rationale, Roadmap vault note (20-step build plan), k6 fixed query mix (one per evidence domain), Load Testing README (k6), k6 SLO thresholds, check_source_allowlisted(url) tool (+38 more)

### Community 2 - "ClinicalTrials.gov Retrieval Client"
Cohesion: 0.07
Nodes (39): _candidate_terms(), _now_iso(), _query_studies(), ClinicalTrials.gov API v2 client (clinical_safety_intelligence domain)., Full term first, then individual words -- but only words specific enough to…, Search ClinicalTrials.gov for studies matching `term`. ClinicalTrials.gov's…, search(), _title_of() (+31 more)

### Community 3 - "Subagent Governance & Delegation"
Cohesion: 0.15
Nodes (44): Backend Subagent, Frontend Subagent, P3-Triage Subagent, .claude/audit/retrieval_log.jsonl, check_allowlist_retrieval.py (PreToolUse hook), human_gate.py (human-in-the-loop approval hook), AIDLC Project Instructions (CLAUDE.md), Agent Context Contract (+36 more)

### Community 4 - "Grounding & Backend Contract"
Cohesion: 0.09
Nodes (38): Backend README / Contract, Backend requirements.txt (fastapi, uvicorn, requests, jsonschema, pydantic), backend/.runtime/provider_key (gitignored alternate LLM provider key), api/main.py - FastAPI GET /health, POST /query, POST /settings/provider-key, build_claims(), _build_statement(), _confidence_from_corroboration(), Step 12 fix: corroboration count by distinct hostname, not distinct citation URL (+30 more)

### Community 5 - "FastAPI Query API"
Cohesion: 0.07
Nodes (36): health(), ProviderKeyRequest, query(), QueryRequest, FastAPI app: GET /health, POST /query, POST /settings/provider-key. Run from…, set_provider_key(), Overall response confidence = the weakest (minimum) claim confidence. A…, rollup_confidence() (+28 more)

### Community 6 - "Template Response Schema (genericized)"
Cohesion: 0.08
Nodes (24): enum, description, type, type, properties, required, type, enum (+16 more)

### Community 7 - "Response Schema (canonical)"
Cohesion: 0.09
Nodes (22): enum, description, type, properties, required, type, enum, properties (+14 more)

### Community 8 - "Frontend Rendering (app.js)"
Cohesion: 0.23
Nodes (17): confidenceBadgeHtml(), els, escapeAttr(), escapeHtml(), formatDomain(), hideConnectPanel(), isHttpUrl(), isProviderUnreachable() (+9 more)

### Community 9 - "Schema Structural Constraints (claims)"
Cohesion: 0.15
Nodes (16): items, minItems, type, items, type, enum, enum, properties (+8 more)

### Community 10 - "Pharma Governance MCP Server"
Cohesion: 0.20
Nodes (13): mcp_server_fastmcp, check_source_allowlisted(), _load_allowlist(), log_retrieval(), Summarize triage status: most recent finalized report (if any) and a count of…, Custom MCP server exposing this project's governance logic as callable tools.…, Check whether a URL's host is on the approved pharma source allowlist. Returns…, Validate a candidate response (as a JSON string) against… (+5 more)

### Community 11 - "Schema Structural Constraints (citations)"
Cohesion: 0.18
Nodes (14): items, minItems, type, items, enum, enum, properties, required (+6 more)

### Community 12 - "k6 Load Test Script"
Cohesion: 0.25
Nodes (7): escalationRate, insufficientEvidenceRate, options, QUERIES, queryDuration, SCENARIOS, ref_k6

### Community 13 - "MCP Registration Config"
Cohesion: 0.50
Nodes (3): CLAUDE_PROJECT_DIR, python3, pharma-governance

## Ambiguous Edges - Review These
- `api/main.py - FastAPI GET /health, POST /query, POST /settings/provider-key` → `app.js isProviderUnreachable()`  [AMBIGUOUS]
  frontend/README.md · relation: conceptually_related_to

## Knowledge Gaps
- **51 isolated node(s):** `python3`, `CLAUDE_PROJECT_DIR`, `$schema`, `title`, `type` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 132 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `api/main.py - FastAPI GET /health, POST /query, POST /settings/provider-key` and `app.js isProviderUnreachable()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Backend README / Contract` connect `Grounding & Backend Contract` to `Subagent Governance & Delegation`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `require_allowed()` connect `Grounding & Backend Contract` to `ClinicalTrials.gov Retrieval Client`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `Roadmap vault note (20-step build plan)` connect `Knowledge Vault, Roadmap & Load-Test Docs` to `Subagent Governance & Delegation`, `Grounding & Backend Contract`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `python3`, `CLAUDE_PROJECT_DIR`, `$schema` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Governance Hooks (Allowlist + Audit)` be split into smaller, more focused modules?**
  _Cohesion score 0.07770582793709528 - nodes in this community are weakly interconnected._
- **Should `Knowledge Vault, Roadmap & Load-Test Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.06570048309178744 - nodes in this community are weakly interconnected._