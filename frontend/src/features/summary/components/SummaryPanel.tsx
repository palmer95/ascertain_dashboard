import { useId } from 'react'
import { Sparkles } from 'lucide-react'

import type { SummarySource } from '@/api/schema'
import { ErrorState } from '@/components/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { usePatientSummary } from '../queries'

/**
 * The narrative part of the patient summary. Its facts (name, age, blood type, allergies,
 * conditions) are already on this page, read from the same record, so they aren't repeated.
 * Model-written text is labelled as such, because a clinician should check it against the
 * notes before relying on it.
 */
export function SummaryPanel({ patientId }: { patientId: string }) {
  const headingId = useId()
  const { data: summary, error, isFetching, refetch } = usePatientSummary(patientId)

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <h2 id={headingId} className="font-medium">
            Summary
          </h2>
          {summary && (
            <CardAction>
              {summary.source === 'llm' ? (
                <Badge variant="secondary">
                  <Sparkles aria-hidden data-icon="inline-start" />
                  AI-generated
                </Badge>
              ) : (
                <Badge variant="outline">Template</Badge>
              )}
            </CardAction>
          )}
        </CardHeader>

        {/* aria-busy: a screen reader waits for the refreshed text instead of reading stale. */}
        <CardContent aria-busy={isFetching} className="flex flex-col gap-3">
          {summary ? (
            <>
              <p className="leading-relaxed">{summary.narrative}</p>
              <p className="text-xs text-muted-foreground">
                {isFetching ? 'Updating…' : sourceNote(summary.source, summary.note_count)}
              </p>
            </>
          ) : error ? (
            <ErrorState
              title="Couldn't load the summary"
              error={error}
              onRetry={() => void refetch()}
            />
          ) : (
            <div role="status" aria-label="Generating summary" className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function sourceNote(source: SummarySource, noteCount: number) {
  const notes = noteCount === 1 ? '1 note' : `${noteCount} notes`
  if (source === 'llm') return `Written by AI from ${notes}. Check details against the notes.`
  return noteCount > 0 ? `Generated from ${notes} without AI.` : null
}
