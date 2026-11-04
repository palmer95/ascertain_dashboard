import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { SEARCH_MAX_LENGTH } from '../list-params'

const DEBOUNCE_MS = 300

/**
 * Name search that never blocks typing: the input owns its text, and the URL (and so the
 * query) is updated once typing pauses. Enter searches immediately.
 */
export function PatientSearch({
  value,
  onSearch,
  className,
}: {
  value: string
  onSearch: (query: string) => void
  className?: string
}) {
  const [text, setText] = useState(value)
  const timer = useRef<number>(undefined)

  // The URL changed from outside (Back, "Clear filters"): show its value. Adjusting state while
  // rendering is React's recommended pattern for this. Comparing against the trimmed text means
  // our own debounced write never clobbers what the user is still typing (e.g. a trailing space).
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    if (value !== text.trim()) setText(value)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function search(query: string, delay: number) {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => onSearch(query.trim()), delay)
  }

  return (
    <form
      role="search"
      className={cn('relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        search(text, 0)
      }}
    >
      <label htmlFor="patient-search" className="sr-only">
        Search patients by name
      </label>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id="patient-search"
        type="search"
        placeholder="Search by name…"
        autoComplete="off"
        spellCheck={false}
        maxLength={SEARCH_MAX_LENGTH}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          search(event.target.value, DEBOUNCE_MS)
        }}
        className="pl-8"
      />
    </form>
  )
}
