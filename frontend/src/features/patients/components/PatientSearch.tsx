import { Search } from 'lucide-react'

import { DebouncedInput } from '@/components/DebouncedInput'
import { cn } from '@/lib/utils'

import { SEARCH_MAX_LENGTH } from '../list-params'

/** Name search; the URL (and so the query) updates once typing pauses, or on Enter. */
export function PatientSearch({
  value,
  onSearch,
  className,
}: {
  value: string
  onSearch: (query: string) => void
  className?: string
}) {
  return (
    <form
      role="search"
      className={cn('relative', className)}
      // Enter is handled by the input; don't reload the page.
      onSubmit={(event) => event.preventDefault()}
    >
      <label htmlFor="patient-search" className="sr-only">
        Search patients by name
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <DebouncedInput
        id="patient-search"
        type="search"
        placeholder="Search by name…"
        autoComplete="off"
        spellCheck={false}
        maxLength={SEARCH_MAX_LENGTH}
        value={value}
        onCommit={onSearch}
        className="pl-8"
      />
    </form>
  )
}
