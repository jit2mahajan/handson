"""Source-connector intake: normalizes an incoming bundle into the unified
patient shape and hands it to record-linkage + storage. One connector
(a generic FHIR-shaped JSON bundle) covers the demo; HL7v2/flat-file
connectors would normalize into the same IngestBundle shape upstream.
"""
import db
from models import IngestBundle
from record_linkage import canonical_patient_key


async def ingest(source: str, bundle: IngestBundle) -> str:
    patient_key = canonical_patient_key(bundle.demographics)
    await db.upsert_patient(
        patient_key=patient_key,
        source=source,
        source_patient_id=bundle.source_patient_id,
        demographics=bundle.demographics.model_dump(),
        conditions=[c.model_dump() for c in bundle.conditions],
        meds=bundle.meds,
        labs=[l.model_dump() for l in bundle.labs],
        notes=bundle.notes,
    )
    return patient_key
