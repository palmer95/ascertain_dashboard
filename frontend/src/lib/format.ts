const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/** A timestamp as a date in the user's locale and time zone, e.g. "Mar 3, 2026". */
export function formatDate(isoTimestamp: string) {
  return dateFormatter.format(new Date(isoTimestamp))
}

const calendarDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

/**
 * A calendar date ("YYYY-MM-DD", e.g. a date of birth). `new Date()` parses these as UTC
 * midnight, so formatting in UTC keeps US time zones from showing the previous day.
 */
export function formatCalendarDate(isoDate: string) {
  return calendarDateFormatter.format(new Date(isoDate))
}

export function formatFullName(person: { first_name: string; last_name: string }) {
  return `${person.first_name} ${person.last_name}`
}

/** "Last, First": the clinical convention, and it matches the list's default sort. */
export function formatNameLastFirst(person: { first_name: string; last_name: string }) {
  return `${person.last_name}, ${person.first_name}`
}
