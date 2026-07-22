"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"

interface EloChartProps {
  data: { match: number; elo: number; label: string }[]
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { value: number; payload: { label: string } }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-xl">
      <p className="text-muted-foreground text-xs">{payload[0].payload.label}</p>
      <p className="font-bold text-primary font-display">{payload[0].value} Elo</p>
    </div>
  )
}

export default function EloChart({ data }: EloChartProps) {
  const min = Math.min(...data.map((d) => d.elo)) - 30
  const max = Math.max(...data.map((d) => d.elo)) + 30

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.01 240)" vertical={false} />
        <XAxis
          dataKey="match"
          tick={{ fontSize: 11, fill: "oklch(0.58 0.02 230)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v === 0 ? "Start" : `#${v}`)}
        />
        <YAxis
          domain={[min, max]}
          tick={{ fontSize: 11, fill: "oklch(0.58 0.02 230)" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={1000} stroke="oklch(0.22 0.01 240)" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="elo"
          stroke="oklch(0.72 0.18 145)"
          strokeWidth={2}
          dot={{ r: 3, fill: "oklch(0.72 0.18 145)", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "oklch(0.72 0.18 145)", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
