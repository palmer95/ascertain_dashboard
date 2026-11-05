"""Synthetic clinical notes for seen patients, so summaries have something to work with."""

import random
from datetime import timedelta

from app.models import Patient, PatientNote

SEED = 4242

# Hand-written templates. {condition} is one of the patient's conditions.
_FOLLOW_UP = [
    "Follow-up for {condition}. Patient reports symptoms are well controlled on the current "
    "regimen. BP {bp}, HR {hr}. No medication changes; recheck in {interval}.",
    "Seen for {condition}. Reports intermittent symptoms over the past month, worse with "
    "exertion. BP {bp}, HR {hr}. Adjusted dose and reviewed warning signs; follow up in "
    "{interval}.",
    "Medication review for {condition}. Tolerating treatment without side effects. Labs ordered "
    "ahead of next visit. Counseled on adherence. Return in {interval}.",
]
_GENERAL = [
    "Annual wellness visit. No acute complaints. BP {bp}, HR {hr}. Reviewed medications and "
    "allergies; age-appropriate screening discussed. Return in {interval}.",
    "Seen for acute upper respiratory symptoms for 4 days. Afebrile, lungs clear. Supportive care "
    "advised; return if symptoms persist beyond 10 days.",
    "Telephone follow-up. Patient reports feeling better since the last visit and has no new "
    "concerns. Will keep the scheduled appointment.",
    "Seen for low back pain after lifting at home. No red-flag symptoms. Recommended activity as "
    "tolerated, heat, and NSAIDs if appropriate given allergy history. Follow up in {interval}.",
]
_INTERVALS = ["2 weeks", "4 weeks", "3 months", "6 months"]


def build_notes(patients: list[Patient]) -> list[PatientNote]:
    """1-4 notes per seen patient, the latest at their last visit. Deterministic per patient."""
    notes: list[PatientNote] = []
    for patient in patients:
        if patient.last_visit_at is None:
            continue  # Not yet seen, so nothing to document.
        rng = random.Random(
            f"{SEED}:{patient.first_name}:{patient.last_name}:{patient.date_of_birth}"
        )
        taken_at = patient.last_visit_at
        for _ in range(rng.randint(1, 4)):
            notes.append(
                PatientNote(patient_id=patient.id, taken_at=taken_at, content=_note(rng, patient))
            )
            taken_at -= timedelta(days=rng.randint(30, 180))
    return notes


def _note(rng: random.Random, patient: Patient) -> str:
    use_condition = patient.conditions and rng.random() < 0.7
    template = rng.choice(_FOLLOW_UP if use_condition else _GENERAL)
    return template.format(
        condition=rng.choice(patient.conditions).lower() if use_condition else "",
        bp=f"{rng.randint(108, 148)}/{rng.randint(68, 94)}",
        hr=rng.randint(58, 96),
        interval=rng.choice(_INTERVALS),
    )
