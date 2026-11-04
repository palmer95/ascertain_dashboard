import type { ReactNode } from 'react'

import type { PatientRead } from '@/api/schema'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCalendarDate, formatDate, formatFullName } from '@/lib/format'

import { PatientStatusBadge } from './PatientStatusBadge'

export function PatientProfile({ patient }: { patient: PatientRead }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold">{formatFullName(patient)}</h1>
          <PatientStatusBadge status={patient.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          Age <span className="tabular-nums">{patient.age}</span> · Born{' '}
          {formatCalendarDate(patient.date_of_birth)} ·{' '}
          {patient.last_visit_at
            ? `Last visit ${formatDate(patient.last_visit_at)}`
            : 'No visits yet'}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Clinical first: it's what a clinician needs before anything else. */}
        <Section title="Clinical">
          <Field label="Blood type">{patient.blood_type}</Field>
          <Field label="Allergies">
            <TagList
              items={patient.allergies}
              empty="No known allergies"
              // Allergies are safety-critical, so they stand out.
              variant="destructive"
            />
          </Field>
          <Field label="Conditions">
            <TagList items={patient.conditions} empty="None recorded" variant="secondary" />
          </Field>
        </Section>

        <Section title="Contact">
          <Field label="Phone">
            <a href={`tel:${patient.phone}`} className="hover:underline">
              {patient.phone}
            </a>
          </Field>
          <Field label="Email">
            {patient.email ? (
              <a href={`mailto:${patient.email}`} className="break-all hover:underline">
                {patient.email}
              </a>
            ) : (
              <span className="text-muted-foreground">Not provided</span>
            )}
          </Field>
          <Field label="Address">
            <address className="not-italic">
              {patient.address_line1}
              {patient.address_line2 && (
                <>
                  <br />
                  {patient.address_line2}
                </>
              )}
              <br />
              {patient.city}, {patient.state} {patient.postal_code}
            </address>
          </Field>
        </Section>
      </div>

      <p className="text-xs text-muted-foreground">
        Record created {formatDate(patient.created_at)} · Last updated{' '}
        {formatDate(patient.updated_at)}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium">{title}</h2>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-4">{children}</dl>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function TagList({
  items,
  empty,
  variant,
}: {
  items: string[]
  empty: string
  variant: 'destructive' | 'secondary'
}) {
  if (items.length === 0) return <span className="text-muted-foreground">{empty}</span>
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Badge variant={variant}>{item}</Badge>
        </li>
      ))}
    </ul>
  )
}

export function PatientProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading patient" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  )
}
