from enum import StrEnum


class PatientStatus(StrEnum):
    """Administrative status. Clinical acuity is intentionally a separate concept."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    DISCHARGED = "discharged"


class BloodType(StrEnum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"
