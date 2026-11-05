import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation, type RouteObject } from 'react-router'

import { TooltipProvider } from '@/components/ui/tooltip'

/** Shows the current URL, so tests can assert where the app navigated. */
export function LocationDisplay() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

/**
 * Render routes inside the app's providers, starting at `path`. Uses a data router (as the
 * app does), so navigation blocking and other data-router features work. Each call gets its
 * own query cache, so tests never share data.
 */
export function renderRoutes(routes: RouteObject[], path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const view = render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return { ...view, user, router, queryClient }
}

/** Render one element at `path` (default `/`), with a URL readout beside it. */
export function renderWithRouter(element: ReactNode, path = '/', routePath = '*') {
  return renderRoutes(
    [
      {
        path: routePath,
        element: (
          <>
            {element}
            <LocationDisplay />
          </>
        ),
      },
    ],
    path,
  )
}
