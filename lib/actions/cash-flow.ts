'use server'

import { createClient } from '@/lib/supabase/server'
import { getLatestRate } from '@/lib/actions/exchange-rates'
import { convertCurrency, isDueInMonth } from '@/lib/finance'
import type { Currency } from '@/lib/types'

export interface CashFlowItem {
  name: string
  amount_cents: number
  currency: Currency
  amount_usd: number
  type: 'income' | 'expense'
}

export interface CashFlowMonth {
  year: number
  month: number
  label: string
  items: CashFlowItem[]
  total_income_usd: number
  total_expenses_usd: number
  net_usd: number
}

export async function getCashFlowForecast(months = 3): Promise<CashFlowMonth[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [rate, { data: incomeSources }, { data: recurring }] = await Promise.all([
    getLatestRate(),
    supabase
      .from('income_sources')
      .select('name, amount_cents, currency')
      .eq('user_id', user.id),
    supabase
      .from('recurring_expenses')
      .select('name, amount_cents, currency, frequency_months, start_date, end_date, active, created_at')
      .eq('user_id', user.id)
      .eq('active', true),
  ])

  const now = new Date()
  const result: CashFlowMonth[] = []

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    const items: CashFlowItem[] = []

    for (const src of incomeSources ?? []) {
      const amount_usd = convertCurrency(src.amount_cents, src.currency as Currency, 'USD', rate)
      items.push({
        name: src.name,
        amount_cents: src.amount_cents,
        currency: src.currency as Currency,
        amount_usd,
        type: 'income',
      })
    }

    for (const r of recurring ?? []) {
      if (!isDueInMonth(r as Parameters<typeof isDueInMonth>[0], year, month)) continue
      const amount_usd = convertCurrency(r.amount_cents, r.currency as Currency, 'USD', rate)
      items.push({
        name: r.name,
        amount_cents: r.amount_cents,
        currency: r.currency as Currency,
        amount_usd,
        type: 'expense',
      })
    }

    const total_income_usd = items.filter((i) => i.type === 'income').reduce((s, i) => s + i.amount_usd, 0)
    const total_expenses_usd = items.filter((i) => i.type === 'expense').reduce((s, i) => s + i.amount_usd, 0)

    result.push({
      year,
      month,
      label,
      items,
      total_income_usd,
      total_expenses_usd,
      net_usd: total_income_usd - total_expenses_usd,
    })
  }

  return result
}
