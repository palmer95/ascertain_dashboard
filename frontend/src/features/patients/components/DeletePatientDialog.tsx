import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'

import type { PatientRead } from '@/api/schema'
import { FormError } from '@/components/FormError'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatFullName } from '@/lib/format'

import { patientKeys, useDeletePatient } from '../queries'

/** Delete button plus its confirmation: the delete is permanent and takes the notes with it. */
export function DeletePatientDialog({ patient }: { patient: PatientRead }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const deletePatient = useDeletePatient()
  const isDeleting = deletePatient.isPending
  const name = formatFullName(patient)

  function confirm() {
    deletePatient.mutate(patient.id, {
      onSuccess: () => {
        // Clear the cached record only once this page has gone, or its queries would
        // refetch and briefly show "not found".
        void Promise.resolve(navigate('/patients', { replace: true })).then(() =>
          queryClient.removeQueries({ queryKey: patientKeys.detail(patient.id) }),
        )
      },
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !isDeleting && setOpen(next)}
      onOpenChangeComplete={(isOpen) => !isOpen && deletePatient.reset()}
    >
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <Trash2 aria-hidden data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the patient record and all of their notes. It can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deletePatient.error && <FormError error={deletePatient.error} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={confirm}>
            {isDeleting ? 'Deleting…' : 'Delete patient'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
