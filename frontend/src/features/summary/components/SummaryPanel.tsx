import { useId } from 'react'
import { Sparkles } from 'lucide-react'

import type { SummarySource } from '@/api/schema'
import { ErrorState } from '@/components/ErrorState'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { usePatientSummary } from '../queries'

/**
 * The narrative part of the patient summary: an overview, then recent changes and the plan
 * as short lists, so the chart can be scanned rather than read. Its facts (name, age, blood type, allergies,
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
              <p className="leading-relaxed">{summary.narrative.overview}</p>
              {(summary.narrative.recent_changes.length > 0 ||
                summary.narrative.plan.length > 0) && (
                <div className="grid gap-4 md:auto-cols-fr md:grid-flow-col">
                  <NarrativeList title="Recent changes" items={summary.narrative.recent_changes} />
                  <NarrativeList title="Plan" items={summary.narrative.plan} />
                </div>
              )}
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

function NarrativeList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="flex list-disc flex-col gap-1 pl-4 marker:text-muted-foreground">
        {items.map((item, index) => (
          // Items are plain strings that can repeat, and the list is replaced, never reordered.
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function sourceNote(source: SummarySource, noteCount: number) {
  const notes = noteCount === 1 ? '1 note' : `${noteCount} notes`
  if (source === 'llm') return `Written by AI from ${notes}. Check details against the notes.`
  return noteCount > 0 ? `Generated from ${notes} without AI.` : null
}
