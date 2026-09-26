import json
import os
from typing import Optional

import asyncpg

from embeddings import to_pgvector_literal

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://qh:qh@localhost:5432/qualified_health"
)

_pool: Optional[asyncpg.Pool] = None


async def _init_connection(conn: asyncpg.Connection) -> None:
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=DATABASE_URL, init=_init_connection)
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def count_patients() -> int:
    pool = await get_pool()
    return await pool.fetchval("SELECT count(*) FROM patients")


def _merge_conditions(existing: list, new: list) -> list:
    by_code = {c["code"]: dict(c) for c in existing}
    for c in new:
        current = by_code.get(c["code"])
        if current is None:
            by_code[c["code"]] = dict(c)
        elif not current.get("diagnosed_on") and c.get("diagnosed_on"):
            # A later source may have the diagnosis date an earlier one lacked —
            # fill it in rather than keep the first-seen (incomplete) record.
            current["diagnosed_on"] = c["diagnosed_on"]
    return list(by_code.values())


def _merge_meds(existing: list, new: list) -> list:
    merged = list(existing)
    for m in new:
        if m not in merged:
            merged.append(m)
    return merged


def _merge_labs(existing: list, new: list) -> list:
    seen = {(l["name"], l.get("date")) for l in existing}
    merged = list(existing)
    for l in new:
        key = (l["name"], l.get("date"))
        if key not in seen:
            merged.append(l)
            seen.add(key)
    return merged


async def upsert_patient(
    patient_key: str,
    source: str,
    source_patient_id: str,
    demographics: dict,
    conditions: list,
    meds: list,
    labs: list,
    notes: list[str],
) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT source_ids, conditions, meds, labs FROM patients WHERE patient_key = $1",
                patient_key,
            )
            if row:
                source_ids = {**row["source_ids"], source: source_patient_id}
                merged_conditions = _merge_conditions(row["conditions"], conditions)
                merged_meds = _merge_meds(row["meds"], meds)
                merged_labs = _merge_labs(row["labs"], labs)
                await conn.execute(
                    """
                    UPDATE patients
                    SET source_ids = $2, demographics = $3, conditions = $4,
                        meds = $5, labs = $6, updated_at = now()
                    WHERE patient_key = $1
                    """,
                    patient_key,
                    source_ids,
                    demographics,
                    merged_conditions,
                    merged_meds,
                    merged_labs,
                )
            else:
                await conn.execute(
                    """
                    INSERT INTO patients (patient_key, source_ids, demographics, conditions, meds, labs)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    patient_key,
                    {source: source_patient_id},
                    demographics,
                    conditions,
                    meds,
                    labs,
                )

            for note_text in notes:
                from embeddings import embed  # local import avoids cycle at module load

                vector_literal = to_pgvector_literal(embed(note_text))
                await conn.execute(
                    f"INSERT INTO notes (patient_key, text, embedding) VALUES ($1, $2, '{vector_literal}'::vector)",
                    patient_key,
                    note_text,
                )


async def get_all_patients() -> list[dict]:
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT patient_key, source_ids, demographics, conditions, meds, labs FROM patients"
    )
    return [dict(r) for r in rows]


async def get_patient(patient_key: str) -> Optional[dict]:
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT patient_key, source_ids, demographics, conditions, meds, labs FROM patients WHERE patient_key = $1",
        patient_key,
    )
    return dict(row) if row else None


async def list_interventions() -> list[dict]:
    pool = await get_pool()
    rows = await pool.fetch(
        "SELECT intervention_id, name, rules, required_evidence FROM eligibility_criteria ORDER BY intervention_id"
    )
    return [dict(r) for r in rows]


async def get_criteria(intervention_id: str) -> Optional[dict]:
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT intervention_id, name, rules, required_evidence FROM eligibility_criteria WHERE intervention_id = $1",
        intervention_id,
    )
    return dict(row) if row else None


async def search_notes_by_similarity(
    patient_key: str, query_embedding: list[float], limit: int = 1
) -> list[dict]:
    pool = await get_pool()
    vector_literal = to_pgvector_literal(query_embedding)
    rows = await pool.fetch(
        f"""
        SELECT text, 1 - (embedding <=> '{vector_literal}'::vector) AS similarity
        FROM notes
        WHERE patient_key = $1
        ORDER BY embedding <=> '{vector_literal}'::vector
        LIMIT $2
        """,
        patient_key,
        limit,
    )
    return [dict(r) for r in rows]


async def upsert_candidate(
    patient_key: str,
    intervention_id: str,
    score: float,
    evidence: list,
    escalation: dict,
) -> None:
    pool = await get_pool()
    await pool.execute(
        """
        INSERT INTO candidates (patient_key, intervention_id, score, status, evidence, escalation)
        VALUES ($1, $2, $3, 'flagged', $4, $5)
        ON CONFLICT (patient_key, intervention_id) DO UPDATE SET
            score = $3, evidence = $4, escalation = $5, updated_at = now()
            WHERE candidates.status NOT IN ('approved', 'rejected')
        """,
        patient_key,
        intervention_id,
        score,
        evidence,
        escalation,
    )


async def get_candidates(intervention_id: Optional[str] = None) -> list[dict]:
    pool = await get_pool()
    if intervention_id:
        rows = await pool.fetch(
            "SELECT * FROM candidates WHERE intervention_id = $1 ORDER BY score DESC",
            intervention_id,
        )
    else:
        rows = await pool.fetch("SELECT * FROM candidates ORDER BY score DESC")
    return [dict(r) for r in rows]


async def get_candidate(patient_key: str, intervention_id: str) -> Optional[dict]:
    pool = await get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM candidates WHERE patient_key = $1 AND intervention_id = $2",
        patient_key,
        intervention_id,
    )
    return dict(row) if row else None


async def set_candidate_status(patient_key: str, intervention_id: str, status: str) -> bool:
    pool = await get_pool()
    result = await pool.execute(
        "UPDATE candidates SET status = $3, updated_at = now() WHERE patient_key = $1 AND intervention_id = $2",
        patient_key,
        intervention_id,
        status,
    )
    return result != "UPDATE 0"
