import { TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar, Target } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getCurrentMonthTotals } from '@/lib/actions/transactions'
import { getUpcomingRecurring } from '@/lib/actions/recurring'
import { getSavingGoals } from '@/lib/actions/goals'
import { getBudgetLimits } from '@/lib/actions/budgets'
import { formatCurrency, getDayOfMonthSuffix } from '@/lib/utils'

export default async function DashboardPage() {
  const [totals, upcoming, goals, budgets] = await Promise.all([
    getCurrentMonthTotals(),
    getUpcomingRecurring(7),
    getSavingGoals('active'),
    getBudgetLimits(),
  ])

  const net = totals.income - totals.expense
  const alertBudgets = budgets.filter(
    (b) => b.spent_cents !== undefined && b.limit_cents > 0 && (b.spent_cents / b.limit_cents) >= 0.8,
  )
  const topGoals = goals.slice(0, 3)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-heading text-3xl text-expresso">Dashboard</h1>
        <p className="text-xs text-muted-foreground">
          Totals converted to {totals.currency}
        </p>
      </div>

      {/* Month totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="font-bold text-green-600">{formatCurrency(totals.income, totals.currency)}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="font-bold text-red-500">{formatCurrency(totals.expense, totals.currency)}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${net >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            <Minus className={`h-5 w-5 ${net >= 0 ? 'text-green-600' : 'text-red-500'}`} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`font-bold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(Math.abs(net), totals.currency)}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming recurring */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-warm-roast" />
            <h2 className="font-bold text-expresso">Upcoming (7 days)</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due in the next 7 days.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Due {getDayOfMonthSuffix(r.day_of_month)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-500">
                    {formatCurrency(r.amount_cents, r.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Budget alerts */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-warm-roast" />
            <h2 className="font-bold text-expresso">Budget Alerts</h2>
          </div>
          {alertBudgets.length === 0 ? (
            <p className="text-sm text-muted-foreground">All budgets looking good.</p>
          ) : (
            <ul className="space-y-3">
              {alertBudgets.map((b) => {
                const pct = Math.round(((b.spent_cents ?? 0) / b.limit_cents) * 100)
                return (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <p className="text-sm font-medium truncate">{(b.category as any)?.name}</p>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant={pct >= 100 ? 'danger' : 'warning'}>{pct}%</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Saving goals */}
      {topGoals.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-warm-roast" />
            <h2 className="font-bold text-expresso">Saving Goals</h2>
          </div>
          <ul className="space-y-4">
            {topGoals.map((g) => {
              const pct = Math.min(
                Math.round((g.current_amount_cents / g.target_amount_cents) * 100),
                100,
              )
              return (
                <li key={g.id}>
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(g.current_amount_cents, g.currency)} /{' '}
                      {formatCurrency(g.target_amount_cents, g.currency)}
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warm-roast rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{pct}% saved</p>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
