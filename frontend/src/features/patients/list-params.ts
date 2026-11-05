import { useCallback, useMemo } from 'react'
import { useSearchParams, type NavigateOptions } from 'react-router'
import { z } from 'zod'

import {
  bloodTypeValues,
  lastVisitValues,
  patientSortValues,
  patientStatusValues,
  sortOrderValues,
} from '@/api/schema'

import { US_STATE_CODES } from './form/us-states'

export const PAGE_SIZE = 20
// These mirror the backend's limits.
export const SEARCH_MAX_LENGTH = 100
export const FILTER_TEXT_MAX_LENGTH = 100
export const MAX_AGE = 130

/** Multi-value filter: unknown values drop out; known ones keep a fixed order, without repeats. */
function listOf<T extends string>(allowed: readonly T[]) {
  return z
    .array(z.string())
    .catch([])
    .transform((values) => allowed.filter((value) => values.includes(value)))
}

const text = (max: number) => z.string().trim().max(max).catch('')
const age = z.coerce.number().int().min(0).max(MAX_AGE).optional().catch(undefined)

/**
 * The patient list's state, kept in the URL so it is shareable and survives a refresh.
 *
 * Every field falls back to its default via `.catch()`, so a hand-edited or stale URL
 * (`?page=abc`, `?status=unknown`) shows the default list instead of an error. The enums come
 * from the generated API schema, so a backend change surfaces here at compile time.
 */
const fields = {
  q: text(SEARCH_MAX_LENGTH),
  status: listOf(patientStatusValues),
  blood_type: listOf(bloodTypeValues),
  state: listOf(US_STATE_CODES),
  min_age: age,
  max_age: age,
  condition: text(FILTER_TEXT_MAX_LENGTH),
  allergy: text(FILTER_TEXT_MAX_LENGTH),
  last_visit: z.enum(lastVisitValues).optional().catch(undefined),
  sort: z.enum(patientSortValues).catch('name'),
  order: z.enum(sortOrderValues).catch('asc'),
  page: z.coerce.number().int().min(1).catch(1),
}

const listParamsSchema = z.object(fields).transform((params) => {
  // A reversed age range (from a hand-edited URL) is read the way it was surely meant.
  const { min_age, max_age } = params
  return min_age !== undefined && max_age !== undefined && min_age > max_age
    ? { ...params, min_age: max_age, max_age: min_age }
    : params
})

export type PatientListParams = z.infer<typeof listParamsSchema>
type Key = keyof PatientListParams

const KEYS = Object.keys(fields) as Key[]
const LIST_KEYS = new Set<Key>(['status', 'blood_type', 'state'])

function parse(search: URLSearchParams): PatientListParams {
  const raw: Record<string, unknown> = {}
  for (const key of KEYS) {
    // Repeated keys (`?status=active&status=pending`) are lists; an empty value means unset.
    raw[key] = LIST_KEYS.has(key) ? search.getAll(key) : search.get(key) || undefined
  }
  return listParamsSchema.parse(raw)
}

const DEFAULTS = parse(new URLSearchParams())

/** Values that reset every filter in the panel (search, sorting and paging are separate). */
export const NO_PANEL_FILTERS = {
  status: [],
  blood_type: [],
  state: [],
  min_age: undefined,
  max_age: undefined,
  condition: '',
  allergy: '',
  last_visit: undefined,
} satisfies Partial<PatientListParams>

/** How many of the panel's filters are in use (for the Filters button's badge). */
export function countPanelFilters(params: PatientListParams) {
  return [
    params.status.length > 0,
    params.blood_type.length > 0,
    params.state.length > 0,
    params.min_age !== undefined || params.max_age !== undefined,
    params.condition !== '',
    params.allergy !== '',
    params.last_visit !== undefined,
  ].filter(Boolean).length
}

/** True when the list is narrowed by a search or filter (sorting and paging don't count). */
export function hasActiveFilters(params: PatientListParams) {
  return params.q !== DEFAULTS.q || countPanelFilters(params) > 0
}

export function usePatientListParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => parse(searchParams), [searchParams])

  /**
   * Merge `updates` into the URL. The query string is rebuilt from validated values, so junk
   * params drop out, keys keep a stable order, and defaults are omitted (the plain list stays
   * `/patients`).
   */
  const setParams = useCallback(
    (updates: Partial<PatientListParams>, options?: NavigateOptions) => {
      setSearchParams((prev) => {
        const merged = { ...parse(prev), ...updates }
        const next = new URLSearchParams()
        for (const key of KEYS) {
          const value = merged[key]
          if (Array.isArray(value)) {
            for (const item of value) next.append(key, item)
          } else if (value !== undefined && value !== DEFAULTS[key]) {
            next.set(key, String(value))
          }
        }
        return next
      }, options)
    },
    [setSearchParams],
  )

  return [params, setParams] as const
}
