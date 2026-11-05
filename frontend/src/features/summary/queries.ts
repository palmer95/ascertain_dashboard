import { queryOptions, useQuery } from '@tanstack/react-query'

import { api, unwrap } from '@/api/client'
import { patientKeys } from '@/features/patients/queries'

// Nested under the patient's detail key: editing the patient (Part 4) refreshes its summary.
export const summaryKeys = {
  detail: (patientId: string) => [...patientKeys.detail(patientId), 'summary'] as const,
}

export function summaryQuery(patientId: string) {
  return queryOptions({
    queryKey: summaryKeys.detail(patientId),
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/patients/{patient_id}/summary', {
          params: { path: { patient_id: patientId } },
          signal,
        }),
      ),
  })
}

export function usePatientSummary(patientId: string) {
  return useQuery(summaryQuery(patientId))
}
