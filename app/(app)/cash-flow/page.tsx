'use client'

import { useEffect, useState, useTransition } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { getCashFlowForecast } from '@/lib/actions/cash-flow'
import { formatCurrency } from '@/lib/utils'
import type { CashFlowMonth } from '@/lib/actions/cash-flow'

export default function CashFlowPage() {
  const [months, setMonths] = useState<CashFlowMonth[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [openMonths, setOpenMonths] = useState<Set<number>>(new Set())

  async function load() {
    const data = await getCashFlowForecast(3)
    setMonths(data)
    setLoaded(true)
  }

  useEffect(() => {
    startTransition(() => { load() })
  }, [])

  function toggleMonth(index: number) {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Calculate max value across all months for proportional bar widths
  const maxValue = months.reduce((max, m) => {
    return Math.max(max, m.total_income_usd, m.total_expenses_usd)
  }, 1)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-expresso">Cash Flow Forecast</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Projected income and expenses for the next 3 months based on your income sources and
          recurring expenses.
        </p>
      </div>

      {pending && !loaded ? (
        <SkeletonCards count={3} />
      ) : months.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            No income sources or recurring expenses set up yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {months.map((month, index) => {
            const incomeWidth =
              month.total_income_usd > 0
                ? Math.round((month.total_income_usd / maxValue) * 100)
                : 0
            const expenseWidth =
              month.total_expenses_usd > 0
                ? Math.round((month.total_expenses_usd / maxValue) * 100)
                : 0
            const isOpen = openMonths.has(index)
            const incomeItems = month.items.filter((i) => i.type === 'income')
            const expenseItems = month.items.filter((i) => i.type === 'expense')

            return (
              <Card key={`${month.year}-${month.month}`} className="space-y-3">
                {/* Month header */}
                <h2 className="font-bold text-expresso">{month.label}</h2>

                {/* Bar visualization */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Income</span>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 bg-green-500 rounded-full transition-all"
                        style={{ width: `${incomeWidth}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Expenses</span>
                    <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className="h-3 bg-red-500 rounded-full transition-all"
                        style={{ width: `${expenseWidth}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Totals row */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <p className="text-xs text-muted-foreground">Income</p>
                    <p className="font-bold text-sm text-green-600">
                      {formatCurrency(month.total_income_usd, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="font-bold text-sm text-red-500">
                      {formatCurrency(month.total_expenses_usd, 'USD')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p
                      className={`font-bold text-sm ${
                        month.net_usd >= 0 ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {month.net_usd < 0 && '-'}
                      {formatCurrency(Math.abs(month.net_usd), 'USD')}
                    </p>
                  </div>
                </div>

                {/* Toggle button */}
                {month.items.length > 0 && (
                  <div className="pt-1 border-t border-warm-roast/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMonth(index)}
                      className="w-full justify-between"
                    >
                      <span>{isOpen ? 'Hide' : 'Show'} line items</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>

                    {isOpen && (
                      <ul className="mt-3 space-y-2">
                        {incomeItems.length > 0 && (
                          <>
                            <li>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                                Income
                              </p>
                            </li>
                            {incomeItems.map((item, i) => (
                              <li
                                key={`income-${i}`}
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                                  <span className="text-sm text-foreground">{item.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium text-green-600">
                                    {formatCurrency(item.amount_cents, item.currency)}
                                  </span>
                                  {item.currency !== 'USD' && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatCurrency(item.amount_usd, 'USD')}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </>
                        )}

                        {expenseItems.length > 0 && (
                          <>
                            <li className={incomeItems.length > 0 ? 'pt-2' : ''}>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                                Expenses
                              </p>
                            </li>
                            {expenseItems.map((item, i) => (
                              <li
                                key={`expense-${i}`}
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                                  <span className="text-sm text-foreground">{item.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium text-red-500">
                                    {formatCurrency(item.amount_cents, item.currency)}
                                  </span>
                                  {item.currency !== 'USD' && (
                                    <p className="text-xs text-muted-foreground">
                                      {formatCurrency(item.amount_usd, 'USD')}
                                    </p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
