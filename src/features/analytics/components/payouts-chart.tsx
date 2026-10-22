import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatCompact, formatMoney } from '@/lib/format'

const config = { amount: { label: 'Paid', color: 'var(--chart-2)' } } satisfies ChartConfig

export function PayoutsChart({ data }: { data: { week: string; amount: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-60 w-full">
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--ruling)" strokeOpacity={1} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        />
        <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => `₹${formatCompact(v / 100)}`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(d) =>
                `Week of ${new Date(String(d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
              }
              formatter={(v) => formatMoney(Number(v))}
            />
          }
        />
        <Area
          dataKey="amount"
          type="step"
          stroke="var(--color-amount)"
          strokeWidth={1.5}
          fill="var(--color-amount)"
          fillOpacity={0.08}
        />
      </AreaChart>
    </ChartContainer>
  )
}
