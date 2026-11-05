import { useNavigate } from 'react-router'
import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts'

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
 * One measure across four categories, so one hue: each bar is already named on its axis, and
 * colouring them apart would add nothing to read. Blue is stepped per theme for contrast
 * against the card (both pass 3:1).
 */
const chartConfig = {
  count: { label: 'Patients', theme: { light: '#2a78d6', dark: '#3987e5' } },
} satisfies ChartConfig

const BAR_THICKNESS = 24
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Patients by status as ranked bars; each bar opens the list filtered to that status. */
export function StatusChart({ stats }: { stats: DashboardStats }) {
  const navigate = useNavigate()
  const total = stats.total_patients
  // Largest first, so the ranking reads top to bottom.
  const data = stats.by_status
    .map(({ status, count }) => {
      const share = total ? Math.round((count / total) * 100) : 0
      return { status, label: PATIENT_STATUS_LABELS[status], count, tip: `${count} · ${share}%` }
    })
    .sort((a, b) => b.count - a.count)

  return (
    <Card>
      <CardHeader>
        <h2 className="font-medium">Patients by status</h2>
        <CardDescription>Select a bar to see those patients.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: data.length * (BAR_THICKNESS + 20) + 8 }}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 80, bottom: 0, left: 0 }}
            accessibilityLayer
            // The whole row is the target, not just the painted bar: short bars are tiny.
            onClick={({ activeIndex }) => {
              const row = activeIndex === undefined ? undefined : data[Number(activeIndex)]
              if (row) void navigate(`/patients?status=${row.status}`)
            }}
            className="cursor-pointer"
          >
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              axisLine={false}
              width={80}
              tick={{ fill: 'var(--color-foreground)' }}
            />
            {/* The value sits at each bar's tip, so the number axis would only repeat it. */}
            <XAxis type="number" dataKey="count" hide domain={[0, 'dataMax']} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              // Rounded at the data end, square at the baseline.
              radius={[0, 4, 4, 0]}
              maxBarSize={BAR_THICKNESS}
              activeBar={{ fillOpacity: 0.8 }}
              isAnimationActive={!REDUCED_MOTION}
            >
              <LabelList
                dataKey="tip"
                position="right"
                offset={8}
                className="fill-muted-foreground tabular-nums"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
