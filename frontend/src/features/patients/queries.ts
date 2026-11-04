import { useEffect } from 'react'
import { keepPreviousData, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'

import { PAGE_SIZE, type PatientListParams } from './list-params'

/** Hierarchical query keys, so a mutation can invalidate every list with `patientKeys.lists()`. */
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (query: object) => [...patientKeys.lists(), query] as const,
}

export function patientListQuery({ page }: PatientListParams) {
  const query = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
  return queryOptions({
    queryKey: patientKeys.list(query),
    // The signal cancels the request when its key is superseded or the page unmounts.
    queryFn: ({ signal }) => unwrap(api.GET('/patients', { params: { query }, signal })),
  })
}

/**
 * One page of patients. The previous page stays on screen while the next one loads (no
 * flash of skeletons), and the following page is prefetched so "Next" is usually instant.
 */
export function usePatientList(params: PatientListParams) {
  const queryClient = useQueryClient()
  const result = useQuery({ ...patientListQuery(params), placeholderData: keepPreviousData })

  const { data, isPlaceholderData } = result
  const hasNextPage = data !== undefined && data.offset + data.limit < data.total

  useEffect(() => {
    if (hasNextPage && !isPlaceholderData) {
      void queryClient.prefetchQuery(patientListQuery({ ...params, page: params.page + 1 }))
    }
  }, [hasNextPage, isPlaceholderData, params, queryClient])

  return result
}
