CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS patients (
    patient_key   TEXT PRIMARY KEY,
    source_ids    JSONB NOT NULL DEFAULT '{}'::jsonb,
    demographics  JSONB NOT NULL DEFAULT '{}'::jsonb,
    conditions    JSONB NOT NULL DEFAULT '[]'::jsonb,
    meds          JSONB NOT NULL DEFAULT '[]'::jsonb,
    labs          JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Local hashing-based embedding stand-in uses a fixed 64-dim vector.
CREATE TABLE IF NOT EXISTS notes (
    id            BIGSERIAL PRIMARY KEY,
    patient_key   TEXT NOT NULL REFERENCES patients(patient_key) ON DELETE CASCADE,
    text          TEXT NOT NULL,
    embedding     VECTOR(64),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_embedding_idx ON notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

CREATE TABLE IF NOT EXISTS eligibility_criteria (
    intervention_id   TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    rules             JSONB NOT NULL,
    required_evidence JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS candidates (
    patient_key     TEXT NOT NULL REFERENCES patients(patient_key) ON DELETE CASCADE,
    intervention_id TEXT NOT NULL REFERENCES eligibility_criteria(intervention_id) ON DELETE CASCADE,
    score           NUMERIC NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'flagged'
                        CHECK (status IN ('flagged', 'pending_review', 'approved', 'rejected')),
    evidence        JSONB NOT NULL DEFAULT '[]'::jsonb,
    escalation      JSONB NOT NULL DEFAULT '{"required": false}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (patient_key, intervention_id)
);
