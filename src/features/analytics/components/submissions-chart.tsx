import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const config = {
  submitted: { label: 'Submitted', color: 'var(--chart-3)' },
  approved: { label: 'Approved', color: 'var(--chart-2)' },
  rejected: { label: 'Rejected', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function SubmissionsChart({ data }: { data: { day: string; submitted: number; approved: number; rejected: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-60 w-full">
      <BarChart data={data} margin={{ left: -20, right: 4, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={44} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(d) => new Date(String(d)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="submitted" fill="var(--color-submitted)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="approved" fill="var(--color-approved)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="rejected" fill="var(--color-rejected)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
