import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

import { ApiError } from '@/api/errors'

/**
 * Put a 422's field errors on the matching inputs (the backend reports each one with the
 * field's name). A list item's error (`allergies.2`) goes on the list's input. Returns true
 * if any landed on a field; otherwise the caller shows the error at form level.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiError) || error.status !== 422) return false
  let applied = false
  for (const { field, msg } of error.details) {
    const name =
      fields.find((candidate) => candidate === field) ??
      fields.find((candidate) => field?.startsWith(`${candidate}.`))
    if (!name) continue
    setError(name, { type: 'server', message: msg }, { shouldFocus: !applied })
    applied = true
  }
  return applied
}
