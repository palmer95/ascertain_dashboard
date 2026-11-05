import { Pencil } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { z } from 'zod'

import { ApiError } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { MessageState } from '@/components/MessageState'
import { Button } from '@/components/ui/button'
import { NotesSection } from '@/features/notes/components/NotesSection'
import { DeletePatientDialog } from '@/features/patients/components/DeletePatientDialog'
import {
  PatientProfile,
  PatientProfileSkeleton,
  PatientRecordMeta,
} from '@/features/patients/components/PatientProfile'
import { usePatient } from '@/features/patients/queries'
import { SummaryPanel } from '@/features/summary/components/SummaryPanel'

// Any 8-4-4-4-12 hex ID. A malformed one can't exist, so it's "not found" without a request
// (the API would answer 422 for it).
const patientIdSchema = z.guid()

export default function PatientDetailPage() {
  const { patientId = '' } = useParams()
  const isValidId = patientIdSchema.safeParse(patientId).success
  const { data: patient, error, refetch } = usePatient(patientId, { enabled: isValidId })

  if (!isValidId || (error instanceof ApiError && error.isNotFound)) {
    return (
      <MessageState
        title="Patient not found"
        description="This patient doesn't exist or may have been removed."
        actions={
          <Button render={<Link to="/patients" />} nativeButton={false}>
            Back to patients
          </Button>
        }
      />
    )
  }
  if (error && !patient) {
    return (
      <ErrorState title="Couldn't load this patient" error={error} onRetry={() => void refetch()} />
    )
  }

  // The summary and notes load alongside the profile rather than after it.
  return (
    <div className="flex flex-col gap-6">
      {patient ? (
        <PatientProfile
          patient={patient}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                render={<Link to={`/patients/${patient.id}/edit`} />}
                nativeButton={false}
              >
                <Pencil aria-hidden data-icon="inline-start" />
                Edit
              </Button>
              <DeletePatientDialog patient={patient} />
            </>
          }
        />
      ) : (
        <PatientProfileSkeleton />
      )}
      <SummaryPanel patientId={patientId} />
      <NotesSection patientId={patientId} />
      {patient && <PatientRecordMeta patient={patient} />}
    </div>
  )
}
