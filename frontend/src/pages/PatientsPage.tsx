import { useEffect } from 'react'

import { ErrorState } from '@/components/ErrorState'
import { PaginationBar } from '@/components/PaginationBar'
import { Button } from '@/components/ui/button'
import { SortSelect, StatusFilter } from '@/features/patients/components/PatientFilters'
import { PatientList, PatientListSkeleton } from '@/features/patients/components/PatientList'
import { PatientSearch } from '@/features/patients/components/PatientSearch'
import {
  hasActiveFilters,
  PAGE_SIZE,
  usePatientListParams,
  type PatientListParams,
} from '@/features/patients/list-params'
import { usePatientList } from '@/features/patients/queries'
import { cn } from '@/lib/utils'

export default function PatientsPage() {
  const [params, setParams] = usePatientListParams()
  const { data, error, isPlaceholderData, refetch } = usePatientList(params)

  const lastPage = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const isFiltered = hasActiveFilters(params)

  // A page past the end (an old link, or the list shrank): replace it with the last real page.
  useEffect(() => {
    if (data && !isPlaceholderData && params.page > lastPage) {
      setParams({ page: lastPage }, { replace: true })
    }
  }, [data, isPlaceholderData, params.page, lastPage, setParams])

  /** New search, filter or sort: back to page 1, and keep the scroll position. */
  function refine(updates: Partial<PatientListParams>, { replace = false } = {}) {
    setParams({ ...updates, page: 1 }, { replace, preventScrollReset: true })
  }

  const clearFilters = () => refine({ q: '', status: undefined })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Patients</h1>
        {/* Live region: announces the new count after a search or filter. */}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {data
            ? `${data.total} ${data.total === 1 ? 'patient' : 'patients'}${isFiltered ? ' found' : ''}`
            : !error && 'Loading patients…'}
        </p>
      </header>

      {/* Phones: search on its own row, the two menus side by side beneath it. */}
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {/* Typing replaces the history entry, so Back doesn't step through every keystroke. */}
        <PatientSearch
          value={params.q}
          onSearch={(q) => refine({ q }, { replace: true })}
          className="col-span-2 flex-1"
        />
        <StatusFilter value={params.status} onChange={(status) => refine({ status })} />
        <SortSelect
          sort={params.sort}
          order={params.order}
          onChange={(sort, order) => refine({ sort, order })}
          className="w-full sm:w-44 md:hidden"
        />
      </div>

      {!data ? (
        error ? (
          <ErrorState title="Couldn't load patients" error={error} onRetry={() => void refetch()} />
        ) : (
          <PatientListSkeleton />
        )
      ) : data.total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isFiltered ? 'No patients match your search.' : 'No patients yet.'}
          </p>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : data.items.length === 0 ? (
        // Past the last page; the effect above is about to redirect.
        <PatientListSkeleton />
      ) : (
        <>
          {/* While new results load, the current ones stay visible but dimmed. */}
          <div
            aria-busy={isPlaceholderData}
            className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}
          >
            <PatientList
              patients={data.items}
              caption={`Patients, page ${params.page} of ${lastPage}`}
              sort={params.sort}
              order={params.order}
              onSortChange={(sort, order) => refine({ sort, order })}
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
