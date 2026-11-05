import { useNavigate } from 'react-router'

import { PatientForm } from '@/features/patients/components/PatientForm'
import { useCreatePatient } from '@/features/patients/queries'

export default function PatientCreatePage() {
  const navigate = useNavigate()
  const createPatient = useCreatePatient()

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">New patient</h1>
        <p className="text-sm text-muted-foreground">Register a patient&apos;s details.</p>
      </header>
      <PatientForm
        submitLabel="Create patient"
        cancelTo="/patients"
        onSubmit={createPatient.mutateAsync}
        // Replace, so Back from the new record doesn't return to a blank form.
        onSaved={(patient) => void navigate(`/patients/${patient.id}`, { replace: true })}
      />
    </div>
  )
}
