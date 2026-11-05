import { setupServer } from 'msw/node'

/**
 * Fake API for component tests. No default handlers: each test declares the endpoints it
 * relies on with `server.use(...)`, and any request it didn't expect fails the test.
 */
export const server = setupServer()

/** URL of an API path as the app requests it (`/api` on the page's origin). */
export const apiUrl = (path: string) => `${window.location.origin}/api${path}`
