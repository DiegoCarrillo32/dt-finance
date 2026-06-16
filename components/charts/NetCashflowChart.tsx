'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/lib/types'

interface NetCashflowChartProps {
  data: { date: string; income: number; expense: number }[]
  currency: Currency
}

export function NetCashflowChart({ data, currency }: NetCashflowChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    net: d.income - d.expense,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(value: number) => formatCurrency(value, currency)}
          contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }}
        />
        <Bar dataKey="net" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.net >= 0 ? '#16a34a' : '#dc2626'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
