import { AlertCircle } from 'lucide-react'

import { ApiError, describeError } from '@/api/errors'

/** A failed submit, shown inline next to the action that failed. Entered data stays put. */
export function FormError({ error }: { error: unknown }) {
  const requestId = error instanceof ApiError ? error.requestId : null
  return (
    <div role="alert" className="flex gap-2 text-sm text-destructive">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        {describeError(error)}
        {requestId && (
          <span className="block text-xs text-muted-foreground">
            Reference: <span className="font-mono">{requestId}</span>
          </span>
        )}
      </p>
    </div>
  )
}
