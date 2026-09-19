# Graph Report - Day4_1  (2026-09-19)

## Corpus Check
- Corpus is ~619 words - fits in a single context window. You may not need a graph.

## Summary
- 39 nodes · 42 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.8)
- Token cost: 0 input · 41,470 output

## Community Hubs (Navigation)
- Package Manifest
- Frontend Result & Error Display
- Express Server Setup
- SIP Calculation Backend
- Script DOM Bindings
- SIP Input Form
- MCP Fetch Config

## God Nodes (most connected - your core abstractions)
1. `backend agent (SIP Calculator backend owner)` - 5 edges
2. `SIP Calculator HTML page (index.html)` - 5 edges
3. `#sip-form (calculator input form)` - 5 edges
4. `SIP future-value formula` - 4 edges
5. `DEFAULT_ANNUAL_RETURN constant` - 4 edges
6. `/api/calculate route` - 4 edges
7. `fetch` - 2 edges
8. `scripts` - 2 edges
9. `express` - 2 edges
10. `mcp__fetch__fetch tool` - 2 edges

## Surprising Connections (you probably didn't know these)
- `#annualReturnRate input` --semantically_similar_to--> `DEFAULT_ANNUAL_RETURN constant`  [INFERRED] [semantically similar]
  public/index.html → .claude/agents/backend.md
- `#result section (invested amount / returns / total value)` --conceptually_related_to--> `SIP future-value formula`  [INFERRED]
  public/index.html → .claude/agents/backend.md
- `script.js (linked script)` --conceptually_related_to--> `/api/calculate route`  [INFERRED]
  public/index.html → .claude/agents/backend.md
- `#sip-form (calculator input form)` --conceptually_related_to--> `/api/calculate route`  [INFERRED]
  public/index.html → .claude/agents/backend.md
- `#error message paragraph` --conceptually_related_to--> `API input validation & 400 error handling`  [INFERRED]
  public/index.html → .claude/agents/backend.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Backend agent responsibilities for the SIP calculator** — _claude_agents_backend_agent, _claude_agents_backend_sip_formula, _claude_agents_backend_default_annual_return, _claude_agents_backend_api_calculate, _claude_agents_backend_mcp_fetch_tool, _claude_agents_backend_input_validation [EXTRACTED 1.00]
- **End-to-end SIP calculation flow from form inputs to backend result** — public_index_sip_form, public_index_monthlyinvestment_input, public_index_annualreturnrate_input, public_index_years_input, _claude_agents_backend_api_calculate, _claude_agents_backend_sip_formula, public_index_result_section [INFERRED 0.85]

## Communities (7 total, 1 thin omitted)

### Community 0 - "Package Manifest"
Cohesion: 0.20
Nodes (9): dependencies, express, description, main, name, scripts, start, version (+1 more)

### Community 1 - "Frontend Result & Error Display"
Cohesion: 0.33
Nodes (6): API input validation & 400 error handling, #error message paragraph, SIP Calculator HTML page (index.html), #result section (invested amount / returns / total value), script.js (linked script), style.css (linked stylesheet)

### Community 2 - "Express Server Setup"
Cohesion: 0.33
Nodes (4): ref_path, app, express, path

### Community 3 - "SIP Calculation Backend"
Cohesion: 0.70
Nodes (5): backend agent (SIP Calculator backend owner), /api/calculate route, DEFAULT_ANNUAL_RETURN constant, mcp__fetch__fetch tool, SIP future-value formula

### Community 4 - "Script DOM Bindings"
Cohesion: 0.40
Nodes (4): currency, errorEl, form, resultSection

### Community 5 - "SIP Input Form"
Cohesion: 0.50
Nodes (4): #annualReturnRate input, #monthlyInvestment input, #sip-form (calculator input form), #years input

## Knowledge Gaps
- **17 isolated node(s):** `python3`, `name`, `version`, `description`, `main` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 20 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `Package Manifest` to `Express Server Setup`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `#sip-form (calculator input form)` connect `SIP Input Form` to `Frontend Result & Error Display`, `SIP Calculation Backend`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `SIP Calculator HTML page (index.html)` connect `Frontend Result & Error Display` to `SIP Input Form`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `SIP future-value formula` (e.g. with `DEFAULT_ANNUAL_RETURN constant` and `#result section (invested amount / returns / total value)`) actually correct?**
  _`SIP future-value formula` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `DEFAULT_ANNUAL_RETURN constant` (e.g. with `SIP future-value formula` and `#annualReturnRate input`) actually correct?**
  _`DEFAULT_ANNUAL_RETURN constant` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `python3`, `name`, `version` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._