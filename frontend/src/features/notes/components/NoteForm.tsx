import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { cn } from 'cn'
import { z } from 'zod'

import { FormError } from '@/components/FormError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors } from '@/lib/forms'
import { clinicTimeZoneName, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/format'

import { NOTE_MAX_LENGTH, useCreateNote } from '../queries'

// The input has minute precision, so allow the current minute; the server allows 5 minutes.
const CLOCK_SKEW_MS = 60_000

// Field names match the API's, so server validation errors map straight onto the inputs.
const noteFormSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Write the note before saving')
    .max(NOTE_MAX_LENGTH, `Notes can be at most ${NOTE_MAX_LENGTH.toLocaleString()} characters`),
  // A `datetime-local` value: wall-clock time on the clinic's clock, no offset.
  taken_at: z
    .string()
    .min(1, 'Enter when the note was taken')
    .refine(
      (value) => !Number.isNaN(fromDateTimeLocalValue(value).getTime()),
      'Enter a valid date and time',
    )
    .refine(
      (value) => fromDateTimeLocalValue(value).getTime() <= Date.now() + CLOCK_SKEW_MS,
      "The time can't be in the future",
    ),
})

const FIELDS = ['content', 'taken_at'] as const

export function NoteForm({ patientId, onDone }: { patientId: string; onDone: () => void }) {
  const id = useId()
  const createNote = useCreateNote(patientId)
  const [formError, setFormError] = useState<unknown>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { content: '', taken_at: toDateTimeLocalValue(new Date()) },
  })
  const contentLength = useWatch({ control, name: 'content' }).length

  const onSubmit = handleSubmit(async ({ content, taken_at }) => {
    setFormError(null)
    try {
      // Sent as an absolute instant, so the server never has to guess the time zone.
      const takenAt = fromDateTimeLocalValue(taken_at).toISOString()
      await createNote.mutateAsync({ content, taken_at: takenAt })
      onDone()
    } catch (error) {
      // On failure the form keeps what was typed, so nothing has to be re-entered.
      if (!applyServerErrors(error, setError, FIELDS)) setFormError(error)
    }
  })

  const contentErrorId = `${id}-content-error`
  const takenAtErrorId = `${id}-taken-at-error`
  const takenAtHintId = `${id}-taken-at-hint`

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      aria-label="Add note"
      className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-content`}>Note</Label>
        <Textarea
          id={`${id}-content`}
          // Opening the form is a request to write, so the cursor goes straight to the note.
          autoFocus
          aria-invalid={errors.content ? true : undefined}
          aria-describedby={cn(`${id}-content-count`, errors.content && contentErrorId)}
          className="max-h-80 min-h-24 bg-background"
          {...register('content')}
        />
        <div className="flex gap-3 text-xs">
          {errors.content && (
            <p id={contentErrorId} className="text-destructive">
              {errors.content.message}
            </p>
          )}
          <p
            id={`${id}-content-count`}
            className={cn(
              'ml-auto text-muted-foreground tabular-nums',
              contentLength > NOTE_MAX_LENGTH && 'text-destructive',
            )}
          >
            {contentLength.toLocaleString()} / {NOTE_MAX_LENGTH.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor={`${id}-taken-at`}>Taken at</Label>
        <Input
          id={`${id}-taken-at`}
          type="datetime-local"
          max={toDateTimeLocalValue(new Date())}
          aria-invalid={errors.taken_at ? true : undefined}
          aria-describedby={cn(takenAtHintId, errors.taken_at && takenAtErrorId)}
          className="bg-background"
          {...register('taken_at')}
        />
        <p id={takenAtHintId} className="text-xs text-muted-foreground">
          Clinic time ({clinicTimeZoneName()})
        </p>
        {errors.taken_at && (
          <p id={takenAtErrorId} className="text-xs text-destructive">
            {errors.taken_at.message}
          </p>
        )}
      </div>

      {formError !== null && <FormError error={formError} />}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save note'}
        </Button>
      </div>
    </form>
  )
}
