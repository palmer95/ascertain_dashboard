import type { PatientStatus } from '@/api/schema'

// Typed as Record<PatientStatus, …> so a new backend status fails the build until it's added.
export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
  discharged: 'Discharged',
}
