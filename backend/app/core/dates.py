from datetime import date


def age_on(date_of_birth: date, on: date) -> int:
    """Age in whole years on a given day (a Feb 29 birthday counts from Mar 1 in common years)."""
    had_birthday = (on.month, on.day) >= (date_of_birth.month, date_of_birth.day)
    return on.year - date_of_birth.year - (0 if had_birthday else 1)
