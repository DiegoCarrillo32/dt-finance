'use server'

import { createClient } from '@/lib/supabase/server'
import { getRateForDate } from '@/lib/actions/exchange-rates'
import { convertCurrency } from '@/lib/utils'
import type { Currency } from '@/lib/types'

export async function getMonthlyStats(year: number, month: number, displayCurrency: Currency) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: transactions } = await supabase
    .from('transactions')
    .select('type, amount_cents, currency, date, category_id, category:categories(name,color)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('date', start)
    .lte('date', end)

  let income = 0
  let expense = 0
  const expenseByCategory: Record<string, { name: string; color: string; total: number }> = {}
  const incomeByCategory: Record<string, { name: string; color: string; total: number }> = {}
  const dailyCashflow: Record<string, { income: number; expense: number }> = {}

  for (const t of transactions ?? []) {
    const rate = await getRateForDate(t.date)
    const converted = convertCurrency(t.amount_cents, t.currency as Currency, displayCurrency, rate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = t.category as any

    if (t.type === 'income') {
      income += converted
      if (cat?.name) {
        incomeByCategory[t.category_id] ??= { name: cat.name, color: cat.color, total: 0 }
        incomeByCategory[t.category_id].total += converted
      }
    } else {
      expense += converted
      if (cat?.name) {
        expenseByCategory[t.category_id] ??= { name: cat.name, color: cat.color, total: 0 }
        expenseByCategory[t.category_id].total += converted
      }
    }

    dailyCashflow[t.date] ??= { income: 0, expense: 0 }
    if (t.type === 'income') dailyCashflow[t.date].income += converted
    else dailyCashflow[t.date].expense += converted
  }

  return {
    income,
    expense,
    net: income - expense,
    expenseByCategory: Object.values(expenseByCategory).sort((a, b) => b.total - a.total),
    incomeByCategory: Object.values(incomeByCategory).sort((a, b) => b.total - a.total),
    dailyCashflow: Object.entries(dailyCashflow)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export async function getLastSixMonthsTotals(displayCurrency: Currency) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })

  const results = await Promise.all(
    months.map(async ({ year, month }) => {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = new Date(year, month, 0).toISOString().split('T')[0]
      const label = new Date(year, month - 1).toLocaleString('en-US', { month: 'short' })

      const { data } = await supabase
        .from('transactions')
        .select('type, amount_cents, currency, date')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('date', start)
        .lte('date', end)

      let income = 0
      let expense = 0

      for (const t of data ?? []) {
        const rate = await getRateForDate(t.date)
        const converted = convertCurrency(t.amount_cents, t.currency as Currency, displayCurrency, rate)
        if (t.type === 'income') income += converted
        else expense += converted
      }

      return { label, income, expense, net: income - expense }
    }),
  )

  return results
}
