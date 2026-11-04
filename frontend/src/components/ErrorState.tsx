import { AlertCircle } from 'lucide-react'

import { ApiError } from '@/api/errors'
import { Button } from '@/components/ui/button'

/** A failed request: what went wrong, a retry, and the request ID to quote in a bug report. */
export function ErrorState({
  title,
  error,
  onRetry,
}: {
  title: string
  error: Error
  onRetry?: () => void
}) {
  const apiError = error instanceof ApiError ? error : undefined
  const message = apiError?.isNetworkError
    ? "Couldn't reach the server. Check your connection and try again."
    : (apiError?.message ?? 'Something went wrong. Please try again.')

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"
    >
      <AlertCircle aria-hidden className="size-6 text-destructive" />
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        {apiError?.requestId && (
          <p className="text-xs text-muted-foreground">
            Reference: <span className="font-mono">{apiError.requestId}</span>
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
