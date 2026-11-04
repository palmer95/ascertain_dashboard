import { useCallback, useMemo } from 'react'
import { useSearchParams, type NavigateOptions } from 'react-router'
import { z } from 'zod'

import { patientSortValues, patientStatusValues, sortOrderValues } from '@/api/schema'

export const PAGE_SIZE = 20
export const SEARCH_MAX_LENGTH = 100 // Mirrors the backend's limit on `q`.

/**
 * The patient list's state, kept in the URL so it is shareable and survives a refresh.
 *
 * Every field falls back to its default via `.catch()`, so a hand-edited or stale URL
 * (`?page=abc`, `?status=unknown`) shows the default list instead of an error. The enums come
 * from the generated API schema, so a backend change surfaces here at compile time.
 */
const listParamsSchema = z.object({
  q: z.string().trim().max(SEARCH_MAX_LENGTH).catch(''),
  status: z.enum(patientStatusValues).optional().catch(undefined),
  sort: z.enum(patientSortValues).catch('name'),
  order: z.enum(sortOrderValues).catch('asc'),
  page: z.coerce.number().int().min(1).catch(1),
})

export type PatientListParams = z.infer<typeof listParamsSchema>

const DEFAULTS = listParamsSchema.parse({})

/** True when the list is narrowed by a search or filter (sorting and paging don't count). */
export function hasActiveFilters(params: PatientListParams) {
  return params.q !== DEFAULTS.q || params.status !== DEFAULTS.status
}

export function usePatientListParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(
    () => listParamsSchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  )

  /**
   * Merge `updates` into the URL. The query string is rebuilt from validated values, so junk
   * params drop out, keys keep a stable order, and defaults are omitted (the plain list stays
   * `/patients`).
   */
  const setParams = useCallback(
    (updates: Partial<PatientListParams>, options?: NavigateOptions) => {
      setSearchParams((prev) => {
        const merged = { ...listParamsSchema.parse(Object.fromEntries(prev)), ...updates }
        const next = new URLSearchParams()
        for (const key of Object.keys(merged) as (keyof PatientListParams)[]) {
          const value = merged[key]
          if (value !== undefined && value !== DEFAULTS[key]) next.set(key, String(value))
        }
        return next
      }, options)
    },
    [setSearchParams],
  )

  return [params, setParams] as const
}
