import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach } from 'vitest'

import { server } from './server'

// Browser APIs jsdom doesn't implement, which the UI library and theme code call.
if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) satisfies MediaQueryList,
  })
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

for (const method of ['scrollIntoView', 'hasPointerCapture', 'releasePointerCapture'] as const) {
  if (!(method in Element.prototype)) {
    Object.defineProperty(Element.prototype, method, { value: () => false })
  }
}

// Start intercepting now, not in beforeAll: setup runs before each test file's imports, and
// the API client keeps a reference to `fetch` from when it's created. Started any later, the
// client would hold the unpatched `fetch` and hit the real network.
// Any request a test didn't declare a handler for fails that test.
server.listen({ onUnhandledFrame: 'error' })

afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
