# Agent context contract

Every subagent invocation starts with zero memory of the calling session — the prompt must be self-contained. This is the minimum each subagent needs from its caller. Don't paste more than this (the subagent re-reads its own source-of-truth files); don't paste less (it can't see anything you didn't say).

## `backend`

- The research question, verbatim.
- If the request is about an existing response rather than a new query: which line(s)/timestamp in `logs/responses.jsonl` triggered it.
- **Not needed**: the allowlist or schema content inline — backend re-reads `data/allowlist/sources.json` and `data/schema/response_schema.json` itself.

## `frontend`

- Which schema field(s) or response shape changed, and a pointer to backend's API contract (endpoint + example payload).
- **Not needed**: a full dump of `response_schema.json` — frontend reads it directly when it needs the full shape.

## `p3-triage`

- The UTC time window or line range in `logs/responses.jsonl` / `.claude/audit/retrieval_log.jsonl` to review.
- **Never** "review everything" once those logs grow large — see `context-management.md` for why, and how triage bounds this itself via prior finalized reports.

If a caller's prompt to any of these three agents doesn't include what this contract requires, the agent should ask rather than guess.
