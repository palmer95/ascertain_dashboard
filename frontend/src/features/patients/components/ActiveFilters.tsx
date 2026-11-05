import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { describeActiveFilters } from '../filters'
import type { PatientListParams } from '../list-params'

/** The filters in use as removable chips, so they stay visible with the panel closed. */
export function ActiveFilters({
  params,
  onChange,
  onClearAll,
}: {
  params: PatientListParams
  onChange: (updates: Partial<PatientListParams>) => void
  onClearAll: () => void
}) {
  const filters = describeActiveFilters(params)
  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <h2 className="sr-only">Filters in use</h2>
      <ul className="contents">
        {filters.map((filter) => (
          <li key={filter.key}>
            <Button
              variant="secondary"
              size="xs"
              aria-label={`Remove filter ${filter.label}`}
              onClick={() => onChange(filter.remove)}
              className="max-w-64"
            >
              <span className="truncate">{filter.label}</span>
              <X aria-hidden data-icon="inline-end" />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="link" size="xs" onClick={onClearAll}>
        Clear all
      </Button>
    </div>
  )
}
