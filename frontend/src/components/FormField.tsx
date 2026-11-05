import type { ReactNode } from 'react'
import { cn } from 'cn'

import { Label } from '@/components/ui/label'

/** Props every input in a field needs, so the label, error and hint are announced with it. */
export interface FieldControlProps {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

/**
 * A labelled form field with its hint and error. The input itself is rendered by `children`,
 * which receives the ids and ARIA attributes that tie it to the label and messages.
 */
export function FormField({
  id,
  label,
  optional = false,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  children: (control: FieldControlProps) => ReactNode
}) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = cn(hint && hintId, error && errorId) || undefined

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
