import { useEffect } from 'react'
import {
  keepPreviousData,
  queryOptions,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import type { PatientPage } from '@/api/schema'

import { PAGE_SIZE, type PatientListParams } from './list-params'

/** Hierarchical query keys, so a mutation can invalidate every list with `patientKeys.lists()`. */
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (query: object) => [...patientKeys.lists(), query] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
}

export function patientListQuery({ q, status, sort, order, page }: PatientListParams) {
  const query = {
    q: q || undefined,
    status,
    sort,
    order,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }
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

export function patientDetailQuery(id: string) {
  return queryOptions({
    queryKey: patientKeys.detail(id),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/patients/{patient_id}', { params: { path: { patient_id: id } }, signal })),
  })
}

/** The patient's row from any cached list page, if the user arrived from the list. */
function findInCachedLists(queryClient: QueryClient, id: string) {
  for (const [, page] of queryClient.getQueriesData<PatientPage>({
    queryKey: patientKeys.lists(),
  })) {
    const patient = page?.items.find((item) => item.id === id)
    if (patient) return patient
  }
  return undefined
}

/**
 * One patient. Coming from the list, the row already in cache renders instantly as
 * placeholder data while the fresh record loads (list rows are full `PatientRead` objects).
 * Pass `enabled: false` to skip the request entirely (e.g. for an ID that can't be valid).
 */
export function usePatient(id: string, { enabled = true } = {}) {
  const queryClient = useQueryClient()
  return useQuery({
    ...patientDetailQuery(id),
    enabled,
    placeholderData: () => findInCachedLists(queryClient, id),
  })
}
