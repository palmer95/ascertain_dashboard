import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

/** "Showing 21–40 of 150" with previous/next controls. `page` is 1-based. */
export function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing{' '}
        <span className="font-medium text-foreground tabular-nums">
          {from}–{to}
        </span>{' '}
        of <span className="font-medium text-foreground tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground tabular-nums sm:inline">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft data-icon="inline-start" aria-hidden />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight data-icon="inline-end" aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
