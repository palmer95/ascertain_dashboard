"""Calendar dates for the clinic.

Timestamps are stored and compared as instants (UTC). Whenever a *calendar date* is needed,
such as today's date for an age or the day a note was taken, it's read in the clinic's time
zone (`CLINIC_TIMEZONE`), so an evening visit never lands on the next day.
"""

from datetime import UTC, date, datetime

from app.core.config import get_settings


def _now() -> datetime:
    """The current instant. A separate function so tests can move the clock."""
    return datetime.now(UTC)


def clinic_today() -> date:
    """Today's date on the clinic's wall clock."""
    return clinic_date(_now())


def clinic_date(moment: datetime) -> date:
    """The clinic's calendar date at an instant."""
    return moment.astimezone(get_settings().clinic_tz).date()


def age_on(date_of_birth: date, on: date) -> int:
    """Age in whole years on a given day (a Feb 29 birthday counts from Mar 1 in common years)."""
    had_birthday = (on.month, on.day) >= (date_of_birth.month, date_of_birth.day)
    return on.year - date_of_birth.year - (0 if had_birthday else 1)


def latest_birth_date_for_age(age: int, on: date) -> date:
    """The latest date of birth that makes someone at least `age` on a given day.

    So `date_of_birth <= latest_birth_date_for_age(n, today)` means "aged n or over". It agrees
    with `age_on`: a Feb 29 birthday only counts on Mar 1 in a common year.
    """
    try:
        return on.replace(year=on.year - age)
    except ValueError:  # `on` is Feb 29 and the target year isn't a leap year.
        return on.replace(year=on.year - age, day=28)
