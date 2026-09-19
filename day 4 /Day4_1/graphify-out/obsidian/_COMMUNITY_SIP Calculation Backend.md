---
type: community
members: 5
---

# SIP Calculation Backend

**Members:** 5 nodes

## Members
- [[apicalculate route]] - concept - .claude/agents/backend.md
- [[DEFAULT_ANNUAL_RETURN constant]] - concept - .claude/agents/backend.md
- [[SIP future-value formula]] - concept - .claude/agents/backend.md
- [[backend agent (SIP Calculator backend owner)]] - document - .claude/agents/backend.md
- [[mcp__fetch__fetch tool]] - concept - .claude/agents/backend.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/SIP_Calculation_Backend
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Frontend Result & Error Display]]
- 2 edges to [[_COMMUNITY_SIP Input Form]]

## Top bridge nodes
- [[apicalculate route]] - degree 4, connects to 2 communities
- [[backend agent (SIP Calculator backend owner)]] - degree 5, connects to 1 community
- [[DEFAULT_ANNUAL_RETURN constant]] - degree 4, connects to 1 community
- [[SIP future-value formula]] - degree 4, connects to 1 community