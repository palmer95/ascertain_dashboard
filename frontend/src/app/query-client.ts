import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/api/errors'

const MAX_RETRIES = 1

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Patient data changes infrequently; avoid refetching on every mount.
      staleTime: 30_000,
      // A 4xx (not found, bad params) will fail the same way again; only retry network
      // failures and 5xx, which are often transient.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < MAX_RETRIES
      },
    },
  },
})
