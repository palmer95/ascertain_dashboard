import type { RefObject } from 'react'

import type { NoteRead } from '@/api/schema'
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
} from '@/components/ui/alert-dialog'
import { formatDateTime } from '@/lib/format'

import { useDeleteNote } from '../queries'

/**
 * Confirms before deleting: notes are clinical records and the delete can't be undone.
 *
 * One dialog serves the whole list, so it outlives the row it deletes. Cancelling returns
 * focus to the row's delete button; after a delete that button is gone, so focus moves to
 * `focusAfterDelete` instead of being lost.
 */
export function DeleteNoteDialog({
  patientId,
  note,
  open,
  onOpenChange,
  focusAfterDelete,
}: {
  patientId: string
  note: NoteRead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  focusAfterDelete: RefObject<HTMLElement | null>
}) {
  const deleteNote = useDeleteNote(patientId)
  const isDeleting = deleteNote.isPending

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isDeleting) return // don't dismiss mid-request
        onOpenChange(next)
      }}
      // Clear a previous attempt's error once the dialog has closed.
      onOpenChangeComplete={(isOpen) => !isOpen && deleteNote.reset()}
    >
      <AlertDialogContent
        finalFocus={() => (deleteNote.isSuccess ? focusAfterDelete.current : true)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            {note && (
              <>The note from {formatDateTime(note.taken_at)} will be permanently deleted. </>
            )}
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteNote.error && <FormError error={deleteNote.error} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting || !note}
            onClick={() => {
              if (note) deleteNote.mutate(note.id, { onSuccess: () => onOpenChange(false) })
            }}
          >
            {isDeleting ? 'Deleting…' : 'Delete note'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
