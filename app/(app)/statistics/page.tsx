'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { CurrencyToggle } from '@/components/CurrencyToggle'
import { DonutChart } from '@/components/charts/DonutChart'
import { NetCashflowChart } from '@/components/charts/NetCashflowChart'
import { MonthComparisonChart } from '@/components/charts/MonthComparisonChart'
import { getMonthlyStats, getLastSixMonthsTotals } from '@/lib/actions/statistics'
import { formatCurrency } from '@/lib/utils'
import type { Currency } from '@/lib/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type MonthStats = Awaited<ReturnType<typeof getMonthlyStats>>

export default function StatisticsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [stats, setStats] = useState<MonthStats>(null)
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getLastSixMonthsTotals>>>([])
  const [pending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      const [s, h] = await Promise.all([
        getMonthlyStats(year, month, currency),
        getLastSixMonthsTotals(currency),
      ])
      setStats(s)
      setHistory(h)
    })
  }

  useEffect(() => { load() }, [year, month, currency])

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-heading text-3xl text-expresso">Statistics</h1>
        <CurrencyToggle value={currency} onChange={setCurrency} />
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-warm-roast/10">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-bold text-expresso min-w-36 text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-warm-roast/10">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {!stats && pending && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><Skeleton className="h-48 w-full" /></Card>
            <Card><Skeleton className="h-48 w-full" /></Card>
          </div>
          <Card><Skeleton className="h-40 w-full" /></Card>
        </div>
      )}

      {stats && (
        <>
          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(stats.income, currency)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-lg font-bold text-red-500">
                {formatCurrency(stats.expense, currency)}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-muted-foreground">Net</p>
              <p className={`text-lg font-bold ${stats.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(Math.abs(stats.net), currency)}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <DonutChart data={stats.expenseByCategory} currency={currency} />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Income by Category</CardTitle>
              </CardHeader>
              <DonutChart data={stats.incomeByCategory} currency={currency} />
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Net Cashflow</CardTitle>
            </CardHeader>
            <NetCashflowChart data={stats.dailyCashflow} currency={currency} />
          </Card>
        </>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Last 6 Months</CardTitle>
          </CardHeader>
          <MonthComparisonChart data={history} currency={currency} />
        </Card>
      )}
    </div>
  )
}
