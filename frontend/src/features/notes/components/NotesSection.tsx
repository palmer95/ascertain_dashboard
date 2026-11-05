import { useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Plus, Trash2 } from 'lucide-react'

import type { NoteRead } from '@/api/schema'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'

import { useNotes } from '../queries'
import { DeleteNoteDialog } from './DeleteNoteDialog'
import { NoteForm } from './NoteForm'

export function NotesSection({ patientId }: { patientId: string }) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const { data: notes, error, refetch } = useNotes(patientId)

  const [isAdding, setIsAdding] = useState(false)
  // Kept after closing so the dialog's text doesn't vanish during its exit animation.
  const [noteToDelete, setNoteToDelete] = useState<NoteRead | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  function closeForm() {
    // Render the "Add note" button again before focusing it, so focus isn't lost.
    flushSync(() => setIsAdding(false))
    addButtonRef.current?.focus()
  }

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          {/* Focusable from script only: where focus lands after a note is deleted. */}
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="font-medium outline-none">
            Notes
            {notes && (
              <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                ({notes.length})
              </span>
            )}
          </h2>
          <CardDescription>Clinical notes, newest first</CardDescription>
          {!isAdding && (
            <CardAction>
              <Button ref={addButtonRef} size="sm" onClick={() => setIsAdding(true)}>
                <Plus aria-hidden data-icon="inline-start" />
                Add note
              </Button>
            </CardAction>
          )}
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {isAdding && <NoteForm patientId={patientId} onDone={closeForm} />}

          {notes ? (
            notes.length > 0 ? (
              <ol className="flex flex-col divide-y">
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onDelete={() => {
                      setNoteToDelete(note)
                      setIsDeleteOpen(true)
                    }}
                  />
                ))}
              </ol>
            ) : (
              !isAdding && <p className="text-muted-foreground">No notes yet.</p>
            )
          ) : error ? (
            <ErrorState title="Couldn't load notes" error={error} onRetry={() => void refetch()} />
          ) : (
            <NotesSkeleton />
          )}
        </CardContent>
      </Card>

      <DeleteNoteDialog
        patientId={patientId}
        note={noteToDelete}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        focusAfterDelete={headingRef}
      />
    </section>
  )
}

function NoteItem({ note, onDelete }: { note: NoteRead; onDelete: () => void }) {
  const takenAt = formatDateTime(note.taken_at)
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <time dateTime={note.taken_at} className="text-xs font-medium text-muted-foreground">
          {takenAt}
        </time>
        {/* Keep the author's line breaks; break long unbroken strings instead of overflowing. */}
        <p className="wrap-break-word whitespace-pre-wrap">{note.content}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete note from ${takenAt}`}
        className="text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  )
}

function NotesSkeleton() {
  return (
    <div role="status" aria-label="Loading notes" className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
