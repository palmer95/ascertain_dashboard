from datetime import date


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
