import {
  patientStatusValues,
  type PatientSort,
  type PatientStatus,
  type SortOrder,
} from '@/api/schema'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { SORT_OPTIONS } from '../sorting'
import { PATIENT_STATUS_LABELS } from '../status'

const ALL_STATUSES = 'all'

const STATUS_ITEMS = [
  { value: ALL_STATUSES, label: 'All statuses' },
  ...patientStatusValues.map((status) => ({ value: status, label: PATIENT_STATUS_LABELS[status] })),
]

const SORT_ITEMS = SORT_OPTIONS.map(({ sort, order, label }) => ({
  value: `${sort}:${order}`,
  label,
}))

export function StatusFilter({
  value,
  onChange,
}: {
  value: PatientStatus | undefined
  onChange: (status: PatientStatus | undefined) => void
}) {
  return (
    <Select
      items={STATUS_ITEMS}
      value={value ?? ALL_STATUSES}
      onValueChange={(next) => onChange(patientStatusValues.find((status) => status === next))}
    >
      <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Sort menu for small screens, where there are no table headers to click. */
export function SortSelect({
  sort,
  order,
  onChange,
  className,
}: {
  sort: PatientSort
  order: SortOrder
  onChange: (sort: PatientSort, order: SortOrder) => void
  className?: string
}) {
  return (
    <Select
      items={SORT_ITEMS}
      value={`${sort}:${order}`}
      onValueChange={(next) => {
        const option = SORT_OPTIONS.find((o) => `${o.sort}:${o.order}` === next)
        if (option) onChange(option.sort, option.order)
      }}
    >
      <SelectTrigger aria-label="Sort patients" className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
