---
type: community
members: 4
---

# SIP Input Form

**Members:** 4 nodes

## Members
- [[annualReturnRate input]] - code - public/index.html
- [[monthlyInvestment input]] - code - public/index.html
- [[sip-form (calculator input form)]] - code - public/index.html
- [[years input]] - code - public/index.html

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/SIP_Input_Form
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_SIP Calculation Backend]]
- 1 edge to [[_COMMUNITY_Frontend Result & Error Display]]

## Top bridge nodes
- [[sip-form (calculator input form)]] - degree 5, connects to 2 communities
- [[annualReturnRate input]] - degree 2, connects to 1 community