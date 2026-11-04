import type { PatientStatus } from '@/api/schema'
import { Badge } from '@/components/ui/badge'

// Typed as Record<PatientStatus, …> so a new backend status fails the build until styled.
const STATUS_STYLES: Record<PatientStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground' },
  discharged: {
    label: 'Discharged',
    className: 'border-border bg-transparent text-muted-foreground',
  },
}

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  const { label, className } = STATUS_STYLES[status]
  // The label carries the meaning; colour is only a secondary cue.
  return <Badge className={className}>{label}</Badge>
}
