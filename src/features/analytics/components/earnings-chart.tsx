import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatMoney } from '@/lib/format'

const config = { amount: { label: 'Earned', color: 'var(--chart-1)' } } satisfies ChartConfig

const WEEK_MS = 7 * 86_400_000
const IST_MS = 5.5 * 3_600_000

/** Monday 00:00 IST of the current week, as a UTC-based "IST clock" timestamp. */
function currentWeekStart() {
  const ist = new Date(Date.now() + IST_MS)
  const day = (ist.getUTCDay() + 6) % 7 // 0 = Monday
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - day)
}

/** Fills the last N weeks so the chart always has a steady x-axis. */
export function weeklySeries(rows: { week: string; amount: number }[], weeks = 8) {
  const end = currentWeekStart()
  const buckets = Array.from({ length: weeks }, (_, i) => ({ start: end - (weeks - 1 - i) * WEEK_MS, amount: 0 }))
  for (const r of rows) {
    const t = Date.parse(`${r.week}T00:00:00Z`)
    if (Number.isNaN(t)) continue
    const b = buckets.find((x) => t >= x.start && t < x.start + WEEK_MS)
    if (b) b.amount += r.amount
  }
  return buckets.map((b) => ({ label: format(new Date(b.start + new Date(b.start).getTimezoneOffset() * 60_000), 'd MMM'), amount: b.amount }))
}

export function EarningsChart({ rows }: { rows: { week: string; amount: number }[] }) {
  const data = weeklySeries(rows)
  return (
    <ChartContainer config={config} className="aspect-auto h-44 w-full">
      <BarChart data={data} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={8} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(l) => `Week of ${l}`}
              formatter={(v) => <span className="font-medium tabular">{formatMoney(Number(v))}</span>}
            />
          }
        />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  )
}
