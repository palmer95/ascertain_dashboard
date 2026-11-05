import type { PatientSort, SortOrder } from '@/api/schema'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { SORT_OPTIONS } from '../sorting'

const SORT_ITEMS = SORT_OPTIONS.map(({ sort, order, label }) => ({
  value: `${sort}:${order}`,
  label,
}))

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
