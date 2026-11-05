import { Link, useNavigate, useParams } from 'react-router'
import { z } from 'zod'

import { ApiError } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { MessageState } from '@/components/MessageState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PatientForm } from '@/features/patients/components/PatientForm'
import { usePatient, useUpdatePatient } from '@/features/patients/queries'
import { formatFullName } from '@/lib/format'

const patientIdSchema = z.guid()

export default function PatientEditPage() {
  const { patientId = '' } = useParams()
  const navigate = useNavigate()
  const isValidId = patientIdSchema.safeParse(patientId).success
  const {
    data: patient,
    error,
    isPlaceholderData,
    refetch,
  } = usePatient(patientId, {
    enabled: isValidId,
  })
  const updatePatient = useUpdatePatient(patientId)
  const detailPath = `/patients/${patientId}`

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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {patient ? `Edit ${formatFullName(patient)}` : 'Edit patient'}
        </h1>
      </header>
      {/* Wait for the fresh record, not the list row shown as a placeholder: the form reads its
          values once, so it must start from the latest data. */}
      {patient && !isPlaceholderData ? (
        <PatientForm
          patient={patient}
          submitLabel="Save changes"
          cancelTo={detailPath}
          onSubmit={updatePatient.mutateAsync}
          onSaved={() => void navigate(detailPath, { replace: true })}
        />
      ) : (
        <div role="status" aria-label="Loading patient" className="flex flex-col gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-64" />
        </div>
      )}
    </div>
  )
}
