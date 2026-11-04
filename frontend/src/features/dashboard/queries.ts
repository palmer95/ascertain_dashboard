import { queryOptions, useQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'

// Patient mutations (Part 4) invalidate this alongside the patient lists.
export const dashboardKeys = {
  stats: ['dashboard', 'stats'] as const,
}

export function dashboardStatsQuery() {
  return queryOptions({
    queryKey: dashboardKeys.stats,
    queryFn: ({ signal }) => unwrap(api.GET('/dashboard/stats', { signal })),
  })
}

export function useDashboardStats() {
  return useQuery(dashboardStatsQuery())
}
