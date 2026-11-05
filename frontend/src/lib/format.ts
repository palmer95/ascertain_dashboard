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

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/** A timestamp with its time, in the user's locale and time zone, e.g. "Mar 3, 2026, 2:15 PM". */
export function formatDateTime(isoTimestamp: string) {
  return dateTimeFormatter.format(new Date(isoTimestamp))
}

/**
 * A Date as the local "YYYY-MM-DDTHH:mm" string a `datetime-local` input expects.
 * (`toISOString()` would give UTC, i.e. the wrong wall-clock time.)
 */
export function toDateTimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}
