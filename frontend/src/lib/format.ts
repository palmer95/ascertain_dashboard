const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

/** A timestamp as a date in the user's locale and time zone, e.g. "Mar 3, 2026". */
export function formatDate(isoTimestamp: string) {
  return dateFormatter.format(new Date(isoTimestamp))
}

/** "Last, First": the clinical convention, and it matches the list's default sort. */
export function formatNameLastFirst(person: { first_name: string; last_name: string }) {
  return `${person.last_name}, ${person.first_name}`
}
