'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/lib/types'

interface MonthComparisonChartProps {
  data: { label: string; income: number; expense: number; net: number }[]
  currency: Currency
}

export function MonthComparisonChart({ data, currency }: MonthComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#16a34a"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#dc2626"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke="#7a1318"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
