import { Link } from 'react-router'

import type { PatientRead } from '@/api/schema'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatNameLastFirst } from '@/lib/format'

import { PatientStatusBadge } from './PatientStatusBadge'

/**
 * A table on `md` and up, a card list below it. Both render from the same rows and CSS hides
 * one, so there is no resize listener and no layout flash. Hidden elements (`display: none`)
 * are skipped by screen readers.
 */
export function PatientList({ patients, caption }: { patients: PatientRead[]; caption: string }) {
  return (
    <>
      <PatientTable patients={patients} caption={caption} />
      <PatientCards patients={patients} caption={caption} />
    </>
  )
}

// The name link's ::after stretches over its whole row/card, so anywhere is clickable while
// the markup stays one real link per patient (keyboard, middle-click, and screen readers work).
const STRETCHED_LINK =
  'font-medium outline-none after:absolute after:inset-0 after:rounded-[inherit] hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset'

function PatientTable({ patients, caption }: { patients: PatientRead[]; caption: string }) {
  return (
    <div className="hidden rounded-lg border md:block">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Last visit</TableHead>
            <TableHead className="pr-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className="relative">
              <TableCell className="py-3 pl-4">
                <Link to={`/patients/${patient.id}`} className={STRETCHED_LINK}>
                  {formatNameLastFirst(patient)}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">{patient.age}</TableCell>
              <TableCell>
                <LastVisit value={patient.last_visit_at} />
              </TableCell>
              <TableCell className="pr-4">
                <PatientStatusBadge status={patient.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PatientCards({ patients, caption }: { patients: PatientRead[]; caption: string }) {
  return (
    <ul aria-label={caption} className="divide-y rounded-lg border md:hidden">
      {patients.map((patient) => (
        <li key={patient.id} className="relative flex items-start justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Link to={`/patients/${patient.id}`} className={`truncate ${STRETCHED_LINK}`}>
              {formatNameLastFirst(patient)}
            </Link>
            <p className="text-sm text-muted-foreground">
              Age <span className="tabular-nums">{patient.age}</span> ·{' '}
              {patient.last_visit_at === null ? (
                'No visits yet'
              ) : (
                <>
                  Last visit <LastVisit value={patient.last_visit_at} />
                </>
              )}
            </p>
          </div>
          <PatientStatusBadge status={patient.status} />
        </li>
      ))}
    </ul>
  )
}

function LastVisit({ value }: { value: string | null }) {
  if (value === null) return <span className="text-muted-foreground">No visits yet</span>
  return (
    <time dateTime={value} className="whitespace-nowrap">
      {formatDate(value)}
    </time>
  )
}

export function PatientListSkeleton() {
  return (
    <div role="status" aria-label="Loading patients" className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}
