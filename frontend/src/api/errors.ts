import type { ErrorDetail, ErrorResponse } from './schema'

/** status 0 means no response at all (offline, DNS, server down). */
export const NETWORK_ERROR_STATUS = 0

/** Every failed API call surfaces as this, so UI code handles one error shape. */
export class ApiError extends Error {
  override readonly name = 'ApiError'
  readonly status: number
  /** Stable machine-readable code from the backend, e.g. `validation_error`. */
  readonly code: string
  /** Field-level problems (422), ready to map onto form inputs. */
  readonly details: ErrorDetail[]
  /** Echoed `X-Request-ID`, so a user can quote it in a bug report. */
  readonly requestId: string | null

  constructor(
    message: string,
    options: {
      status: number
      code: string
      details?: ErrorDetail[]
      requestId?: string | null
      cause?: unknown
    },
  ) {
    super(message, { cause: options.cause })
    this.status = options.status
    this.code = options.code
    this.details = options.details ?? []
    this.requestId = options.requestId ?? null
  }

  get isNetworkError(): boolean {
    return this.status === NETWORK_ERROR_STATUS
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  static fromResponse(response: Response, body: unknown): ApiError {
    const requestId = response.headers.get('X-Request-ID')
    if (isErrorResponse(body)) {
      const { code, message, details } = body.error
      return new ApiError(message, { status: response.status, code, details, requestId })
    }
    // Not our envelope: e.g. a proxy's HTML 502 page while the backend restarts.
    return new ApiError(fallbackMessage(response.status), {
      status: response.status,
      code: 'http_error',
      requestId,
    })
  }

  static network(cause: unknown): ApiError {
    return new ApiError('Unable to reach the server. Check your connection and try again.', {
      status: NETWORK_ERROR_STATUS,
      code: 'network_error',
      cause,
    })
  }
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false
  const { error } = body
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  )
}

function fallbackMessage(status: number): string {
  if (status >= 500) return 'The server is having trouble right now. Please try again shortly.'
  return `Request failed (${status}).`
}

/** A message that's safe to show the user for any thrown value. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.isNetworkError
      ? "Couldn't reach the server. Check your connection and try again."
      : error.message
  }
  return 'Something went wrong. Please try again.'
}
