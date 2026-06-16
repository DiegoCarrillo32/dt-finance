'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { SkeletonCards } from '@/components/ui/Skeleton'
import { getNetWorth } from '@/lib/actions/net-worth'
import { formatCurrency } from '@/lib/utils'
import { queryKeys } from '@/lib/queryKeys'

export default function NetWorthPage() {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.netWorth,
    queryFn: () => getNetWorth(),
  })

  const hasNoData =
    !isPending &&
    data != null &&
    data.accounts.length === 0 &&
    data.goals.length === 0 &&
    data.debts.length === 0

  const isEmpty = !isPending && data == null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="font-heading text-3xl text-expresso">Net Worth</h1>

      {isPending ? (
        <SkeletonCards count={4} />
      ) : isEmpty || hasNoData ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Start by adding accounts, saving goals, and debts to see your net worth.
          </p>
        </Card>
      ) : data ? (
        <>
          {/* Summary card */}
          <Card className="space-y-3">
            <div className="flex items-center gap-3">
              {data.net_worth_usd >= 0 ? (
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Net Worth</p>
                <p
                  className={`text-3xl font-bold ${
                    data.net_worth_usd >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {data.net_worth_usd < 0 && '-'}
                  {formatCurrency(Math.abs(data.net_worth_usd), 'USD')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-warm-roast/10">
              <div>
                <p className="text-xs text-muted-foreground">Total Assets</p>
                <p className="font-bold text-green-600">
                  {formatCurrency(data.total_assets_usd, 'USD')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Liabilities</p>
                <p className="font-bold text-red-500">
                  {formatCurrency(data.total_liabilities_usd, 'USD')}
                </p>
              </div>
            </div>
          </Card>

          {/* Assets section */}
          {(data.accounts.length > 0 || data.goals.length > 0) && (
            <div className="space-y-3">
              <h2 className="font-bold text-expresso text-lg">Assets</h2>

              {/* Accounts */}
              {data.accounts.length > 0 && (
                <Card className="space-y-3">
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
                    Accounts
                  </h3>
                  <ul className="space-y-2">
                    {data.accounts.map((account) => (
                      <li key={account.id} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-expresso">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.currency}</p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold text-sm ${
                              account.balance_cents >= 0 ? 'text-green-600' : 'text-red-500'
                            }`}
                          >
                            {formatCurrency(account.balance_cents, account.currency)}
                          </p>
                          {account.currency !== 'USD' && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(account.balance_usd, 'USD')}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Saving Goals */}
              {data.goals.length > 0 && (
                <Card className="space-y-3">
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
                    Saving Goals
                  </h3>
                  <ul className="space-y-2">
                    {data.goals.map((goal) => (
                      <li key={goal.id} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-expresso">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">{goal.currency}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-green-600">
                            {formatCurrency(goal.current_amount_cents, goal.currency)}
                          </p>
                          {goal.currency !== 'USD' && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(goal.current_amount_usd, 'USD')}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {/* Liabilities section */}
          {data.debts.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-bold text-expresso text-lg">Liabilities</h2>
              <Card className="space-y-3">
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
                  Debts
                </h3>
                <ul className="space-y-2">
                  {data.debts.map((debt) => (
                    <li key={debt.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-expresso">{debt.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {debt.type.replace(/_/g, ' ')} · {debt.currency}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-red-500">
                          {formatCurrency(debt.current_balance_cents, debt.currency)}
                        </p>
                        {debt.currency !== 'USD' && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(debt.current_balance_usd, 'USD')}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
