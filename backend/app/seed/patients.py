import random
from datetime import UTC, date, datetime, timedelta

from faker import Faker

from app.models import Patient
from app.models.enums import PatientStatus
from app.seed import clinical_data as cd

SEED = 42


def _age_on(dob: date, today: date) -> int:
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _random_dob(rng: random.Random, today: date) -> date:
    low, high, _ = rng.choices(cd.AGE_BANDS, weights=[b[2] for b in cd.AGE_BANDS])[0]
    age = rng.randint(low, high)
    return today - timedelta(days=age * 365 + rng.randint(0, 364))


def _conditions_for(rng: random.Random, age: int) -> list[str]:
    # Chronic-condition burden rises with age; most older adults have at least one.
    if age < 4:
        return []  # Conditions like asthma are rarely diagnosed this young.
    if age < 18:
        pool, min_count, max_count = cd.PEDIATRIC_CONDITIONS, 0, 1
    elif age < 65:
        pool, min_count, max_count = cd.ADULT_CONDITIONS, 0, 3
    else:
        pool, min_count, max_count = cd.ADULT_CONDITIONS + cd.OLDER_ADULT_CONDITIONS, 1, 5
    return sorted(rng.sample(pool, rng.randint(min_count, max_count)))


def _allergies(rng: random.Random) -> list[str]:
    # Most patients have no known drug or food allergies (NKDA).
    if rng.random() < 0.6:
        return []
    return sorted(rng.sample(cd.ALLERGIES, rng.randint(1, 3)))


def _last_visit(rng: random.Random, status: PatientStatus, now: datetime) -> datetime | None:
    match status:
        case PatientStatus.PENDING:
            return None  # Registered, not yet seen.
        case PatientStatus.ACTIVE:
            days_ago = rng.randint(1, 365)
        case PatientStatus.INACTIVE:
            days_ago = rng.randint(400, 1100)
        case PatientStatus.DISCHARGED:
            days_ago = rng.randint(30, 700)
    visit = now - timedelta(days=days_ago)
    return visit.replace(hour=rng.randint(8, 16), minute=rng.choice([0, 15, 30, 45]), second=0)


def build_patients(count: int) -> list[Patient]:
    """Generate `count` synthetic patients. Identities are deterministic for a given seed."""
    rng = random.Random(SEED)
    fake = Faker("en_US")
    fake.seed_instance(SEED)
    now = datetime.now(UTC).replace(microsecond=0)
    today = now.date()

    patients: list[Patient] = []
    for _ in range(count):
        first, last = fake.first_name(), fake.last_name()
        dob = _random_dob(rng, today)
        status = rng.choices(list(cd.STATUS_WEIGHTS), weights=list(cd.STATUS_WEIGHTS.values()))[0]
        has_email = rng.random() < 0.85
        state = fake.state_abbr(include_territories=False)

        patients.append(
            Patient(
                first_name=first,
                last_name=last,
                date_of_birth=dob,
                email=(
                    f"{first}.{last}{rng.randint(1, 99)}@{rng.choice(cd.EMAIL_DOMAINS)}".lower()
                    if has_email
                    else None
                ),
                # 555-0100..0199 is reserved for fictional use, so these never reach a real phone.
                phone=f"({rng.randint(201, 989)}) 555-01{rng.randint(0, 99):02d}",
                address_line1=fake.street_address(),
                address_line2=fake.secondary_address() if rng.random() < 0.25 else None,
                city=fake.city(),
                state=state,
                postal_code=fake.zipcode_in_state(state),
                blood_type=rng.choices(
                    list(cd.BLOOD_TYPE_WEIGHTS), weights=list(cd.BLOOD_TYPE_WEIGHTS.values())
                )[0],
                status=status,
                allergies=_allergies(rng),
                conditions=_conditions_for(rng, _age_on(dob, today)),
                last_visit_at=_last_visit(rng, status, now),
            )
        )
    return patients
