import createClient from 'openapi-fetch'

import { ApiError } from './errors'
import type { paths } from './schema'

/**
 * Typed client generated from the backend's OpenAPI schema (`pnpm gen:api`): paths, params,
 * bodies and responses are all checked at compile time.
 *
 * Always a relative `/api` base: the Vite proxy (dev) and nginx (prod) forward it to the
 * backend, so no API URL is baked into the build and no CORS is needed.
 */
export const api = createClient<paths>({ baseUrl: '/api' })

/**
 * Resolve an `api.*` call to its data, or throw an `ApiError`.
 *
 * openapi-fetch returns `{ data, error }` instead of throwing; TanStack Query needs a thrown
 * error to enter its error state (and to retry), so every call goes through here.
 */
export async function unwrap<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result: Awaited<typeof request>
  try {
    result = await request
  } catch (cause) {
    // A cancelled query (e.g. the user typed again) is not a failure; let it propagate as-is.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw ApiError.network(cause)
  }
  const { data, error, response } = result
  if (!response.ok) throw ApiError.fromResponse(response, error)
  return data as T
}
