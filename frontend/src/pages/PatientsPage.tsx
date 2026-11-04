import { useEffect } from 'react'

import { ErrorState } from '@/components/ErrorState'
import { PaginationBar } from '@/components/PaginationBar'
import { PatientList, PatientListSkeleton } from '@/features/patients/components/PatientList'
import { PAGE_SIZE, usePatientListParams } from '@/features/patients/list-params'
import { usePatientList } from '@/features/patients/queries'
import { cn } from '@/lib/utils'

export default function PatientsPage() {
  const [params, setParams] = usePatientListParams()
  const { data, error, isPlaceholderData, refetch } = usePatientList(params)

  const lastPage = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  // A page past the end (an old link, or the list shrank): replace it with the last real page.
  useEffect(() => {
    if (data && !isPlaceholderData && params.page > lastPage) {
      setParams({ page: lastPage }, { replace: true })
    }
  }, [data, isPlaceholderData, params.page, lastPage, setParams])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <p className="text-sm text-muted-foreground">
          {data
            ? `${data.total} ${data.total === 1 ? 'patient' : 'patients'}`
            : !error && 'Loading patients…'}
        </p>
      </header>

      {!data ? (
        error ? (
          <ErrorState title="Couldn't load patients" error={error} onRetry={() => void refetch()} />
        ) : (
          <PatientListSkeleton />
        )
      ) : data.total === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No patients yet.
        </p>
      ) : data.items.length === 0 ? (
        // Past the last page; the effect above is about to redirect.
        <PatientListSkeleton />
      ) : (
        <>
          {/* While the next page loads, the current one stays visible but dimmed. */}
          <div
            aria-busy={isPlaceholderData}
            className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
          >
            <PatientList
              patients={data.items}
              caption={`Patients, page ${params.page} of ${lastPage}`}
            />
          </div>
          <PaginationBar
            page={params.page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onPageChange={(page) => setParams({ page })}
          />
        </>
      )}
    </div>
  )
}
