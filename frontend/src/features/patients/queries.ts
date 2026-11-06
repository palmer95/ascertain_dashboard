import { useEffect } from 'react'
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import { ApiError } from '@/api/errors'
import type { PatientCreate, PatientPage, PatientRead, PatientUpdate } from '@/api/schema'
import { dashboardKeys } from '@/features/dashboard/queries'

import { PAGE_SIZE, type PatientListParams } from './list-params'

/** Hierarchical query keys, so a mutation can invalidate every list with `patientKeys.lists()`. */
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (query: object) => [...patientKeys.lists(), query] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
}

export function patientListQuery({ q, page, ...filters }: PatientListParams) {
  // Unset filters are left out, so equal lists share a cache entry and requests stay short.
  const query = {
    q: q || undefined,
    status: filters.status.length ? filters.status : undefined,
    blood_type: filters.blood_type.length ? filters.blood_type : undefined,
    state: filters.state.length ? filters.state : undefined,
    min_age: filters.min_age,
    max_age: filters.max_age,
    condition: filters.condition || undefined,
    allergy: filters.allergy || undefined,
    last_visit: filters.last_visit,
    sort: filters.sort,
    order: filters.order,
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

/**
 * Lists and dashboard counts show every patient, so any create, edit or delete refreshes them,
 * as does a note change (a patient's last visit is the time of their latest note).
 */
export function invalidateOverviews(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: patientKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.stats })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PatientCreate) => unwrap(api.POST('/patients', { body })),
    onSuccess: (patient) => {
      // The detail page opens next; seed it so it renders without another request.
      queryClient.setQueryData(patientKeys.detail(patient.id), patient)
      invalidateOverviews(queryClient)
    },
  })
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: PatientUpdate) =>
      unwrap(api.PUT('/patients/{patient_id}', { params: { path: { patient_id: id } }, body })),
    onSuccess: (patient: PatientRead) => {
      queryClient.setQueryData(patientKeys.detail(id), patient)
      // Also refetches what's nested under the patient: the summary repeats its facts.
      void queryClient.invalidateQueries({ queryKey: patientKeys.detail(id) })
      invalidateOverviews(queryClient)
    },
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await unwrap(api.DELETE('/patients/{patient_id}', { params: { path: { patient_id: id } } }))
      } catch (error) {
        // Already gone (e.g. deleted in another tab): the outcome the user wanted.
        if (!(error instanceof ApiError && error.isNotFound)) throw error
      }
    },
    onSuccess: () => invalidateOverviews(queryClient),
  })
}
