"""Seeds ~8 synthetic FHIR-shaped patients on backend startup if the
patients table is empty — a mix of clearly eligible, clearly ineligible,
and borderline/missing-evidence cases across the two seeded interventions.
Run through the same ingestion path as a real connector would use.
"""
from models import Condition, Demographics, IngestBundle, Lab
from ingestion import ingest

SEED_PATIENTS: list[IngestBundle] = [
    IngestBundle(
        source_patient_id="fhir-001",
        demographics=Demographics(first_name="Alice", last_name="Nguyen", dob="1958-03-12"),
        conditions=[Condition(code="ckd_stage4_or_5", diagnosed_on="2025-11-02")],
        labs=[Lab(name="egfr", value=22, unit="mL/min/1.73m2", date="2026-08-01")],
        notes=["Patient has stage 4 CKD, nephrology follow-up recommended, discussed dialysis planning."],
    ),
    IngestBundle(
        source_patient_id="fhir-002",
        demographics=Demographics(first_name="Marcus", last_name="Ibe", dob="1971-07-04"),
        conditions=[Condition(code="hfref", diagnosed_on="2024-05-19")],
        labs=[Lab(name="ejection_fraction", value=25, unit="%", date="2026-07-20")],
        notes=["Reduced ejection fraction heart failure, NYHA class III, evaluating advanced therapy options."],
    ),
    IngestBundle(
        source_patient_id="fhir-003",
        demographics=Demographics(first_name="Priya", last_name="Shah", dob="1990-01-30"),
        conditions=[Condition(code="asthma", diagnosed_on="2010-06-01")],
        labs=[Lab(name="egfr", value=95, unit="mL/min/1.73m2", date="2026-08-01")],
        notes=["Well-controlled asthma, no renal or cardiac concerns."],
    ),
    IngestBundle(
        source_patient_id="fhir-004",
        demographics=Demographics(first_name="David", last_name="Okoro", dob="1965-09-09"),
        conditions=[Condition(code="ckd_stage4_or_5", diagnosed_on="2026-01-15")],
        labs=[],  # egfr not yet on file — missing evidence, should escalate
        notes=["Recently diagnosed with advanced CKD; labs pending from outside lab, awaiting results."],
    ),
    IngestBundle(
        source_patient_id="fhir-005",
        demographics=Demographics(first_name="Elena", last_name="Petrov", dob="1980-04-22"),
        conditions=[Condition(code="ckd_stage3", diagnosed_on="2023-02-11")],
        labs=[Lab(name="egfr", value=45, unit="mL/min/1.73m2", date="2026-08-01")],
        notes=["Stable stage 3 CKD, routine monitoring, no referral indicated at this time."],
    ),
    IngestBundle(
        source_patient_id="fhir-006",
        demographics=Demographics(first_name="Wei", last_name="Zhang", dob="1953-12-01"),
        conditions=[Condition(code="ckd_stage4_or_5", diagnosed_on="2025-06-30")],
        labs=[Lab(name="egfr", value=15, unit="mL/min/1.73m2", date="2026-08-05")],
        notes=["Stage 5 CKD, eGFR 15, nephrology has initiated dialysis access planning."],
    ),
    IngestBundle(
        source_patient_id="fhir-007",
        demographics=Demographics(first_name="Sofia", last_name="Reyes", dob="1975-08-17"),
        conditions=[Condition(code="hfref", diagnosed_on="2022-10-05")],
        labs=[Lab(name="ejection_fraction", value=36, unit="%", date="2026-08-01")],
        notes=["EF improved slightly to 36% on GDMT; team is still discussing advanced heart failure therapy referral given persistent symptoms."],
    ),
    IngestBundle(
        source_patient_id="fhir-008",
        demographics=Demographics(first_name="Tomas", last_name="Novak", dob="1961-02-27"),
        conditions=[
            Condition(code="ckd_stage4_or_5", diagnosed_on="2025-09-10"),
            Condition(code="hfref", diagnosed_on="2024-12-01"),
        ],
        labs=[
            Lab(name="egfr", value=18, unit="mL/min/1.73m2", date="2026-08-02"),
            Lab(name="ejection_fraction", value=20, unit="%", date="2026-07-28"),
        ],
        notes=["Cardio-renal syndrome; eligible for both nephrology and advanced heart failure referral pathways."],
    ),
]


async def seed_if_empty() -> int:
    import db

    if await db.count_patients() > 0:
        return 0
    for bundle in SEED_PATIENTS:
        await ingest("fhir_ehr", bundle)
    return len(SEED_PATIENTS)
