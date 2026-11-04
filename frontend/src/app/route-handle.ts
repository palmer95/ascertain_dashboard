/** Static metadata attached to routes via `handle` (read back with `useMatches`). */
export interface RouteHandle {
  /** Breadcrumb label for this route segment. */
  crumb?: string
}

/** `handle` is `unknown` to React Router, so narrow it before use. */
export function getCrumb(handle: unknown): string | undefined {
  if (typeof handle === 'object' && handle !== null && 'crumb' in handle) {
    return typeof handle.crumb === 'string' ? handle.crumb : undefined
  }
  return undefined
}
