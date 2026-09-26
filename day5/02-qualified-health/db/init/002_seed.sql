INSERT INTO eligibility_criteria (intervention_id, name, rules, required_evidence) VALUES
('ckd_stage4_dialysis_referral', 'CKD Stage 4/5 Dialysis Referral',
 '{"all": [
     {"field": "conditions", "op": "contains", "value": "ckd_stage4_or_5"},
     {"field": "labs.egfr", "op": "lt", "value": 30}
 ]}'::jsonb,
 '["diagnosis_date", "lab_value"]'::jsonb),
('hfref_advanced_therapy_referral', 'HFrEF Advanced Therapy Referral',
 '{"all": [
     {"field": "conditions", "op": "contains", "value": "hfref"},
     {"field": "labs.ejection_fraction", "op": "lt", "value": 35}
 ]}'::jsonb,
 '["diagnosis_date", "lab_value"]'::jsonb)
ON CONFLICT (intervention_id) DO NOTHING;

-- Seed patients are inserted by backend/src/seed_patients.py, which runs
-- automatically on backend startup when the patients table is empty — this
-- keeps note-embedding generation in one place (the app's embeddings.py)
-- instead of duplicating the hashing algorithm in SQL.
