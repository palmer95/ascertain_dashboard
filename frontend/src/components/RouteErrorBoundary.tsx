import { useRouteError } from 'react-router'

import { MessageState } from '@/components/MessageState'
import { Button } from '@/components/ui/button'

// Browsers word a failed dynamic import differently (Chrome, Safari, Firefox).
const STALE_CHUNK_PATTERN =
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i

/**
 * Shown instead of a blank screen when a page throws while rendering or its code fails to
 * load. Unknown URLs go to the `*` route, and data errors don't reach here either: queries
 * return them, and each page shows its own state.
 *
 * Links are plain `<a>` tags: a full page load is the reliable reset when the app is in a bad
 * state.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()

  // After a deploy, an open tab may request page chunks that no longer exist.
  const isStaleChunk = error instanceof Error && STALE_CHUNK_PATTERN.test(error.message)

  return (
    <div role="alert">
      <MessageState
        title={isStaleChunk ? 'A new version is available' : 'Something went wrong'}
        description={
          isStaleChunk
            ? 'Reload the page to get the latest version of the app.'
            : 'An unexpected error occurred. Reloading the page usually fixes it.'
        }
        actions={
          <>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            <Button variant="outline" render={<a href="/" />} nativeButton={false}>
              Back to dashboard
            </Button>
          </>
        }
      />
      {import.meta.env.DEV && error instanceof Error && (
        <pre className="mt-6 overflow-x-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap">
          {error.stack ?? error.message}
        </pre>
      )}
    </div>
  )
}

/** For the root route: the app shell itself failed, so there's no layout padding around it. */
export function RootErrorBoundary() {
  return (
    <div className="p-4 md:p-6">
      <RouteErrorBoundary />
    </div>
  )
}
