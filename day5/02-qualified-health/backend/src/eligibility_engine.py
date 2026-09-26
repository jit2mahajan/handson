"""Structured eligibility-rule evaluator.

Uses three-valued logic (True / False / None="unknown") instead of a plain
boolean so that missing structured data doesn't silently exclude a patient —
per PLAN.md's false-negative-averse design, "unknown" still flags the
patient for human review rather than dropping them.

Rule schema: {"all"|"any": [ {"field","op","value"} | nested {"all"|"any": [...]}, ... ]}
Ops: eq, lt, lte, gt, gte, contains
Fields: "conditions" (contains checks condition.code), "labs.<name>" (numeric),
        "demographics.<field>"
"""
from typing import Any, Optional


def _resolve_field(patient: dict, field: str) -> Any:
    if field == "conditions":
        return patient.get("conditions", [])
    if field.startswith("labs."):
        lab_name = field.split(".", 1)[1]
        for lab in patient.get("labs", []):
            if lab.get("name") == lab_name:
                return lab.get("value")
        return None
    if field.startswith("demographics."):
        sub_field = field.split(".", 1)[1]
        return patient.get("demographics", {}).get(sub_field)
    return None


def _eval_leaf(leaf: dict, patient: dict) -> tuple[Optional[bool], dict]:
    field = leaf["field"]
    op = leaf["op"]
    value = leaf["value"]
    resolved = _resolve_field(patient, field)

    detail = {"field": field, "op": op, "value": value, "matched_value": None}

    if op == "contains":
        conditions = resolved or []
        matched = next((c for c in conditions if c.get("code") == value), None)
        detail["matched_value"] = matched
        return (matched is not None), detail

    if resolved is None:
        return None, detail

    detail["matched_value"] = resolved
    if op == "eq":
        return resolved == value, detail
    if op == "lt":
        return resolved < value, detail
    if op == "lte":
        return resolved <= value, detail
    if op == "gt":
        return resolved > value, detail
    if op == "gte":
        return resolved >= value, detail
    raise ValueError(f"Unknown op: {op}")


def _eval_node(node: dict, patient: dict, leaves: list[dict]) -> Optional[bool]:
    if "all" in node:
        results = [_eval_node(child, patient, leaves) for child in node["all"]]
        if any(r is False for r in results):
            return False
        if any(r is None for r in results):
            return None
        return True
    if "any" in node:
        results = [_eval_node(child, patient, leaves) for child in node["any"]]
        if any(r is True for r in results):
            return True
        if any(r is None for r in results):
            return None
        return False

    outcome, detail = _eval_leaf(node, patient)
    detail["outcome"] = outcome
    leaves.append(detail)
    return outcome


def evaluate(rules: dict, patient: dict) -> dict:
    """Returns {"result": True|False|None, "leaves": [...]}."""
    leaves: list[dict] = []
    result = _eval_node(rules, patient, leaves)
    return {"result": result, "leaves": leaves}
