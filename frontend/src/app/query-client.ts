import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Patient data changes infrequently; avoid refetching on every mount.
      staleTime: 30_000,
      retry: 1,
    },
  },
})
