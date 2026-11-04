import type { PatientStatus } from '@/api/schema'
import { Badge } from '@/components/ui/badge'

import { PATIENT_STATUS_LABELS } from '../status'

const STATUS_STYLES: Record<PatientStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  inactive: 'bg-muted text-muted-foreground',
  discharged: 'border-border bg-transparent text-muted-foreground',
}

export function PatientStatusBadge({ status }: { status: PatientStatus }) {
  // The label carries the meaning; colour is only a secondary cue.
  return <Badge className={STATUS_STYLES[status]}>{PATIENT_STATUS_LABELS[status]}</Badge>
}
