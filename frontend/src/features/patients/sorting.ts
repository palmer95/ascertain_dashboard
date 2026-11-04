import type { PatientSort, SortOrder } from '@/api/schema'

/** The order a column sorts in when first chosen: the useful end first (most recent visit). */
export const DEFAULT_SORT_ORDER: Record<PatientSort, SortOrder> = {
  name: 'asc',
  age: 'asc',
  last_visit_at: 'desc',
  status: 'asc',
}

/** Every sort as one choice, for the small-screen sort menu (the table has sortable headers). */
export const SORT_OPTIONS: { sort: PatientSort; order: SortOrder; label: string }[] = [
  { sort: 'name', order: 'asc', label: 'Name (A–Z)' },
  { sort: 'name', order: 'desc', label: 'Name (Z–A)' },
  { sort: 'age', order: 'asc', label: 'Youngest first' },
  { sort: 'age', order: 'desc', label: 'Oldest first' },
  { sort: 'last_visit_at', order: 'desc', label: 'Most recent visit' },
  { sort: 'last_visit_at', order: 'asc', label: 'Oldest visit' },
  { sort: 'status', order: 'asc', label: 'Status (A–Z)' },
  { sort: 'status', order: 'desc', label: 'Status (Z–A)' },
]
