"""Curated reference data so seeded patients look clinically plausible."""

from app.models.enums import BloodType, PatientStatus

# Approximate US population distribution (American Red Cross).
BLOOD_TYPE_WEIGHTS: dict[BloodType, float] = {
    BloodType.O_POSITIVE: 37.4,
    BloodType.A_POSITIVE: 35.7,
    BloodType.B_POSITIVE: 8.5,
    BloodType.O_NEGATIVE: 6.6,
    BloodType.A_NEGATIVE: 6.3,
    BloodType.AB_POSITIVE: 3.4,
    BloodType.B_NEGATIVE: 1.5,
    BloodType.AB_NEGATIVE: 0.6,
}

STATUS_WEIGHTS: dict[PatientStatus, float] = {
    PatientStatus.ACTIVE: 70,
    PatientStatus.INACTIVE: 14,
    PatientStatus.PENDING: 8,
    PatientStatus.DISCHARGED: 8,
}

# (min_age, max_age, weight): skewed toward adults, as in a typical primary-care panel.
AGE_BANDS: list[tuple[int, int, float]] = [
    (1, 17, 15),
    (18, 39, 25),
    (40, 64, 35),
    (65, 95, 25),
]

PEDIATRIC_CONDITIONS = ["Asthma", "ADHD", "Atopic dermatitis", "Seasonal allergic rhinitis"]

ADULT_CONDITIONS = [
    "Hypertension",
    "Hyperlipidemia",
    "Type 2 diabetes mellitus",
    "Hypothyroidism",
    "GERD",
    "Generalized anxiety disorder",
    "Major depressive disorder",
    "Migraine",
    "Asthma",
    "Obesity",
    "Obstructive sleep apnea",
]

# Sex-specific conditions are omitted because the schema does not record sex.
OLDER_ADULT_CONDITIONS = [
    "Osteoarthritis",
    "Atrial fibrillation",
    "Chronic kidney disease, stage 3",
    "COPD",
    "Coronary artery disease",
    "Osteoporosis",
]

ALLERGIES = [
    "Penicillin",
    "Sulfonamides",
    "Amoxicillin",
    "NSAIDs",
    "Codeine",
    "Latex",
    "Peanuts",
    "Tree nuts",
    "Shellfish",
    "Eggs",
    "Bee stings",
    "Iodinated contrast",
]

# Reserved for documentation (RFC 2606), so no seeded address can reach a real inbox.
EMAIL_DOMAINS = ["example.com", "example.org", "example.net"]
