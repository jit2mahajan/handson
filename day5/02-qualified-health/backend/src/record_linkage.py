"""Record linkage across ingestion sources.

Simplification (documented, not a bug): canonical patient identity is a
deterministic hash of normalized last name + first name + DOB, not
probabilistic matching (e.g. `splink`). This is real dedup logic — the same
person ingested from two different sources resolves to the same
`patient_key` — just not fuzzy/probabilistic matching at population scale,
which is out of scope for a local demo population.
"""
import hashlib

from models import Demographics


def canonical_patient_key(demographics: Demographics) -> str:
    normalized = f"{demographics.last_name.strip().lower()}|{demographics.first_name.strip().lower()}|{demographics.dob.strip()}"
    digest = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12]
    return f"pk_{digest}"
