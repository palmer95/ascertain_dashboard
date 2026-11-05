import { Link } from 'react-router'

import type { DashboardStats } from '@/api/schema'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusChart } from '@/features/dashboard/components/StatusChart'
import { useDashboardStats } from '@/features/dashboard/queries'
import { PatientStatusBadge } from '@/features/patients/components/PatientStatusBadge'
import { PATIENT_STATUS_LABELS } from '@/features/patients/status'
import { formatDate, formatFullName } from '@/lib/format'

export default function HomePage() {
  const { data: stats, error, refetch } = useDashboardStats()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {stats
            ? `${stats.total_patients} patients · ${stats.visits_last_30_days} seen in the last 30 days`
            : !error && 'Loading overview…'}
        </p>
      </header>

      {stats ? (
        <>
          <StatusTiles stats={stats} />
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <StatusChart stats={stats} />
            <RecentVisits visits={stats.recent_visits} />
          </div>
        </>
      ) : error ? (
        <ErrorState
          title="Couldn't load the dashboard"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  )
}

/** One tile per status; each opens the patient list filtered to that status. */
function StatusTiles({ stats }: { stats: DashboardStats }) {
  return (
    <section aria-labelledby="status-heading" className="flex flex-col gap-3">
      <h2 id="status-heading" className="text-sm font-medium text-muted-foreground">
        Patients by status
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.by_status.map(({ status, count }) => {
          const share = stats.total_patients ? Math.round((count / stats.total_patients) * 100) : 0
          return (
            <li key={status}>
              <Link
                to={`/patients?status=${status}`}
                className="flex h-full flex-col gap-1 rounded-xl border bg-card p-4 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="text-sm text-muted-foreground">
                  {PATIENT_STATUS_LABELS[status]}
                </span>
                <span className="text-3xl font-semibold tabular-nums">{count}</span>
                <span className="text-xs text-muted-foreground">{share}% of patients</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function RecentVisits({ visits }: { visits: DashboardStats['recent_visits'] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <h2 className="font-medium">Recent visits</h2>
        <Link
          to="/patients?sort=last_visit_at&order=desc"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {visits.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {visits.map((visit) => (
              <li key={visit.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <Link
                    to={`/patients/${visit.id}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {formatFullName(visit)}
                  </Link>
                  <time dateTime={visit.last_visit_at} className="text-xs text-muted-foreground">
                    {formatDate(visit.last_visit_at)}
                  </time>
                </div>
                <PatientStatusBadge status={visit.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading overview" className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-60 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
