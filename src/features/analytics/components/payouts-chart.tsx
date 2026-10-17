import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { formatCompact, formatMoney } from '@/lib/format'

const config = { amount: { label: 'Paid', color: 'var(--chart-1)' } } satisfies ChartConfig

export function PayoutsChart({ data }: { data: { week: string; amount: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-60 w-full">
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fillPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-amount)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-amount)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
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
              labelFormatter={(d) => `Week of ${new Date(String(d)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              formatter={(v) => formatMoney(Number(v))}
            />
          }
        />
        <Area dataKey="amount" type="monotone" stroke="var(--color-amount)" strokeWidth={2} fill="url(#fillPaid)" />
      </AreaChart>
    </ChartContainer>
  )
}
