'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/lib/types'

interface DonutChartProps {
  data: { name: string; color: string; total: number }[]
  currency: Currency
}

export function DonutChart({ data, currency }: DonutChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color || '#7a1318'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
