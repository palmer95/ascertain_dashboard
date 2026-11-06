import { TZDate } from '@date-fns/tz'

/*
 * Times are shown on the clinic's clock (the API's `CLINIC_TIMEZONE`), not the browser's, so
 * a note's time, its day in the summary and a patient's last visit agree for everyone,
 * including staff working from another time zone. Set once at startup from `GET /config`;
 * until then (and in tests) the browser's time zone is used.
 */
let clinicTimeZone: string | undefined

function formatters(timeZone: string | undefined) {
  return {
    date: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone }),
    dateTime: new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }),
    zone: new Intl.DateTimeFormat(undefined, { timeZoneName: 'shortGeneric', timeZone }),
  }
}

let clinic = formatters(undefined)

export function setClinicTimeZone(timeZone: string | undefined) {
  clinicTimeZone = timeZone
  clinic = formatters(timeZone)
}

/** The clinic's time zone as a short name, e.g. "ET". */
export function clinicTimeZoneName() {
  const parts = clinic.zone.formatToParts(new Date())
  return parts.find((part) => part.type === 'timeZoneName')?.value ?? ''
}

/** A timestamp as a date on the clinic's calendar, e.g. "Mar 3, 2026". */
export function formatDate(isoTimestamp: string) {
  return clinic.date.format(new Date(isoTimestamp))
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

/**
 * A timestamp with its time on the clinic's clock, e.g. "Mar 3, 2026, 2:15 PM ET". The zone is
 * named because it may not be the reader's own.
 */
export function formatDateTime(isoTimestamp: string) {
  return `${clinic.dateTime.format(new Date(isoTimestamp))} ${clinicTimeZoneName()}`
}

/**
 * An instant as the "YYYY-MM-DDTHH:mm" wall-clock time a `datetime-local` input expects, on the
 * clinic's clock. (`toISOString()` would give UTC, i.e. the wrong wall-clock time.)
 */
export function toDateTimeLocalValue(instant: Date) {
  const date = clinicTimeZone ? new TZDate(instant, clinicTimeZone) : instant
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * The instant a `datetime-local` value means on the clinic's clock (DST-aware). An invalid
 * Date if the value isn't one.
 */
export function fromDateTimeLocalValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return new Date(NaN)
  const [year, month, day, hours, minutes] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ]
  if (!clinicTimeZone) return new Date(year, month - 1, day, hours, minutes)
  return new Date(new TZDate(year, month - 1, day, hours, minutes, clinicTimeZone).getTime())
}
