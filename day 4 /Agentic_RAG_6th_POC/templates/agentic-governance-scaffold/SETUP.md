# Setting up this governance scaffold for a new project

This is the governance/agent-ops layer from AIDLC (Agentic RAG for Literature Review & Drug-Discovery Intelligence), genericized. It gives any agentic app four mechanically-enforced commitments: retrieve only from approved sources, ground every claim, return structured output, fail gracefully. Nothing here is pharma-specific — follow these steps to adapt it.

## 1. Copy the tree

Copy this whole `agentic-governance-scaffold/` directory's contents to your new project's root (`.claude/`, `data/`).

## 2. Rename your domains

Pick real names for `domain_a`..`domain_d` (or however many domains your project needs — the count isn't fixed at four, that's just what AIDLC used). Update:
- `data/allowlist/sources.json` — rename the keys, replace the example hosts with your real approved sources.
- `data/schema/response_schema.json` — update the `evidence_domain` enum in the `claims` schema to match.

## 3. Swap the allowlist hosts

Each domain key's array is a list of hostnames (as returned by `urlparse(url).hostname`) — not full URLs, not paths. Get these reviewed by whoever owns source-of-truth decisions for your domain before treating them as final.

## 4. Restate the four commitments for your context

Edit `.claude/skills/governance-principles/SKILL.md` and its `references/*.md` — the mechanism (hook + `minItems: 1` + escalation table) stays the same; only the domain-specific wording needs updating (e.g. "clinical/safety claim" → whatever your project's highest-risk claim category is).

## 5. Verify

- `python3 -m json.tool .claude/settings.json data/allowlist/sources.json data/schema/response_schema.json` — all valid.
- Pipe a non-allowlisted URL and an allowlisted one into `check_allowlist_retrieval.py` via stdin — confirm `ask` vs. silent-allow.
- Confirm `.claude/settings.json`'s hook commands wrap `${CLAUDE_PROJECT_DIR}` in escaped quotes (`\"${CLAUDE_PROJECT_DIR}/...\"`) — unquoted breaks if your project path ever contains a space.

## 6. Add agents as needed

This scaffold ships the hooks/skill/data layer only. Add `.claude/agents/*.md` for whatever subagents your project needs — see AIDLC's own `backend.md`/`frontend.md`/`p3-triage.md` (one level up, in the source project) for a worked example of the pattern: context contract, do-not list, draft→final convention for anything gated.
