import { useCallback, useMemo } from 'react'
import { useSearchParams, type NavigateOptions } from 'react-router'
import { z } from 'zod'

export const PAGE_SIZE = 20

/**
 * The patient list's state, kept in the URL so it is shareable and survives a refresh.
 *
 * Every field falls back to its default via `.catch()`, so a hand-edited or stale URL
 * (`?page=abc`, `?page=0`) shows the default list instead of an error.
 */
const listParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
})

export type PatientListParams = z.infer<typeof listParamsSchema>

const DEFAULTS = listParamsSchema.parse({})

export function usePatientListParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(
    () => listParamsSchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  )

  /** Merge `updates` into the URL. Defaults are omitted, so the plain list stays `/patients`. */
  const setParams = useCallback(
    (updates: Partial<PatientListParams>, options?: NavigateOptions) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const key of Object.keys(updates) as (keyof PatientListParams)[]) {
          const value = updates[key]
          if (value === undefined || value === DEFAULTS[key]) next.delete(key)
          else next.set(key, String(value))
        }
        return next
      }, options)
    },
    [setSearchParams],
  )

  return [params, setParams] as const
}
