import type { LastVisit } from '@/api/schema'

import { US_STATES, type StateCode } from './form/us-states'
import type { PatientListParams } from './list-params'
import { PATIENT_STATUS_LABELS } from './status'

// Typed as Record<LastVisit, …> so a new backend preset fails the build until it's added.
export const LAST_VISIT_LABELS: Record<LastVisit, string> = {
  within_30_days: 'Past 30 days',
  within_90_days: 'Past 90 days',
  within_1_year: 'Past year',
  over_1_year: 'Over a year ago',
  never: 'Never seen',
}

export const STATE_NAMES = Object.fromEntries(US_STATES) as Record<StateCode, string>

export function describeAgeRange(min: number | undefined, max: number | undefined) {
  if (min !== undefined && max !== undefined) return min === max ? `${min}` : `${min}–${max}`
  if (min !== undefined) return `${min}+`
  if (max !== undefined) return `up to ${max}`
  return undefined
}

export interface ActiveFilter {
  key: string
  label: string
  /** The update that removes just this filter. */
  remove: Partial<PatientListParams>
}

/** One entry per value in use, in panel order, so each can be removed on its own. */
export function describeActiveFilters(params: PatientListParams): ActiveFilter[] {
  const without = <T>(values: T[], value: T) => values.filter((item) => item !== value)
  const active: ActiveFilter[] = []

  for (const status of params.status) {
    active.push({
      key: `status:${status}`,
      label: `Status: ${PATIENT_STATUS_LABELS[status]}`,
      remove: { status: without(params.status, status) },
    })
  }
  for (const type of params.blood_type) {
    active.push({
      key: `blood_type:${type}`,
      label: `Blood type: ${type}`,
      remove: { blood_type: without(params.blood_type, type) },
    })
  }
  const ages = describeAgeRange(params.min_age, params.max_age)
  if (ages) {
    active.push({
      key: 'age',
      label: `Age: ${ages}`,
      remove: { min_age: undefined, max_age: undefined },
    })
  }
  if (params.last_visit) {
    active.push({
      key: 'last_visit',
      label: `Last visit: ${LAST_VISIT_LABELS[params.last_visit]}`,
      remove: { last_visit: undefined },
    })
  }
  if (params.condition) {
    active.push({
      key: 'condition',
      label: `Condition: ${params.condition}`,
      remove: { condition: '' },
    })
  }
  if (params.allergy) {
    active.push({ key: 'allergy', label: `Allergy: ${params.allergy}`, remove: { allergy: '' } })
  }
  for (const state of params.state) {
    active.push({
      key: `state:${state}`,
      label: `State: ${STATE_NAMES[state]}`,
      remove: { state: without(params.state, state) },
    })
  }
  return active
}
