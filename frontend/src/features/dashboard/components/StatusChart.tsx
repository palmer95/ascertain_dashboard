import { useNavigate } from 'react-router'
import { Bar, BarChart, LabelList, XAxis, YAxis, type LabelProps } from 'recharts'

import type { DashboardStats } from '@/api/schema'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PATIENT_STATUS_LABELS } from '@/features/patients/status'

/*
 * One measure across four categories, so one hue: each column is already named on its axis, and
 * colouring them apart would add nothing to read. Blue is stepped per theme for contrast
 * against the card (both pass 3:1).
 */
const chartConfig = {
  count: { label: 'Patients', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig

const COLUMN_WIDTH = 40
const CHART_HEIGHT = 220
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Patients by status as columns; each column opens the list filtered to that status. */
export function StatusChart({ stats }: { stats: DashboardStats }) {
  const navigate = useNavigate()
  const total = stats.total_patients
  // Same order as the status tiles above, so the two read together.
  const data = stats.by_status.map(({ status, count }) => {
    const share = total ? Math.round((count / total) * 100) : 0
    return { status, label: PATIENT_STATUS_LABELS[status], count, cap: `${count} · ${share}%` }
  })

  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium">Patients by status</h2>
        <CardDescription>Select a column to see those patients.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: CHART_HEIGHT }}
        >
          <BarChart
            data={data}
            // Room above the tallest column for its value.
            margin={{ top: 24, right: 0, bottom: 0, left: 0 }}
            accessibilityLayer
            // The whole column slot is the target, not just the painted bar: short ones are tiny.
            onClick={({ activeIndex }) => {
              const row = activeIndex === undefined ? undefined : data[Number(activeIndex)]
              if (row) void navigate(`/patients?status=${row.status}`)
            }}
            className="cursor-pointer"
          >
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
              tick={{ fill: 'var(--color-foreground)' }}
            />
            {/* The value sits on each column's cap, so a number axis would only repeat it. */}
            <YAxis hide domain={[0, 'dataMax']} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              // Rounded at the data end, square at the baseline.
              radius={[4, 4, 0, 0]}
              maxBarSize={COLUMN_WIDTH}
              activeBar={{ fillOpacity: 0.8 }}
              isAnimationActive={!REDUCED_MOTION}
            >
              <LabelList dataKey="cap" content={CapLabel} />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/**
 * The value above a column, on one line. Recharts' own label wraps to the column's width,
 * which splits "97 · 65%" in two.
 */
function CapLabel({ viewBox, value }: LabelProps) {
  if (!viewBox || !('width' in viewBox)) return null
  const { x = 0, y = 0, width = 0 } = viewBox
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      className="fill-muted-foreground text-xs tabular-nums"
    >
      {value}
    </text>
  )
}
