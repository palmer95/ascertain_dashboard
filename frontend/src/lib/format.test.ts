import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  formatDate,
  formatDateTime,
  fromDateTimeLocalValue,
  setClinicTimeZone,
  toDateTimeLocalValue,
} from './format'

// 10 pm on Mar 3 in New York (EST, UTC-5) is already Mar 4 in UTC, and in this test's own
// time zone if the machine runs on UTC (as CI does).
const EVENING_IN_NEW_YORK = '2026-03-04T03:00:00Z'

describe('times on the clinic clock', () => {
  beforeEach(() => setClinicTimeZone('America/New_York'))
  afterEach(() => setClinicTimeZone(undefined))

  it('dates a timestamp by the clinic calendar, whatever the browser zone', () => {
    expect(formatDate(EVENING_IN_NEW_YORK)).toBe('Mar 3, 2026')
  })

  it('shows the time with the clinic zone named', () => {
    expect(formatDateTime(EVENING_IN_NEW_YORK)).toMatch(/^Mar 3, 2026, 10:00\sPM ET$/)
  })

  it('round-trips the note form time through the clinic clock', () => {
    expect(toDateTimeLocalValue(new Date(EVENING_IN_NEW_YORK))).toBe('2026-03-03T22:00')
    expect(fromDateTimeLocalValue('2026-03-03T22:00').toISOString()).toBe(
      '2026-03-04T03:00:00.000Z',
    )
  })

  it('follows daylight saving time', () => {
    // EDT (UTC-4) in July.
    expect(fromDateTimeLocalValue('2026-07-01T22:00').toISOString()).toBe(
      '2026-07-02T02:00:00.000Z',
    )
  })

  it('rejects a value that is not a date and time', () => {
    expect(fromDateTimeLocalValue('not a time').getTime()).toBeNaN()
  })
})
