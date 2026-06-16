'use server'

import { createClient } from '@/lib/supabase/server'
import { getAccountsWithBalances } from '@/lib/actions/accounts'
import { getLatestRate } from '@/lib/actions/exchange-rates'
import { convertCurrency } from '@/lib/finance'
import type { Currency } from '@/lib/types'

export interface NetWorthAccount {
  id: string
  name: string
  currency: Currency
  balance_cents: number
  balance_usd: number
}

export interface NetWorthGoal {
  id: string
  name: string
  currency: Currency
  current_amount_cents: number
  current_amount_usd: number
  target_amount_cents: number
}

export interface NetWorthDebt {
  id: string
  name: string
  type: string
  currency: Currency
  current_balance_cents: number
  current_balance_usd: number
}

export interface NetWorthSummary {
  accounts: NetWorthAccount[]
  goals: NetWorthGoal[]
  debts: NetWorthDebt[]
  total_assets_usd: number
  total_liabilities_usd: number
  net_worth_usd: number
  rate: number
}

export async function getNetWorth(): Promise<NetWorthSummary | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [accountsRaw, rate, { data: goalsRaw }, { data: debtsRaw }] = await Promise.all([
    getAccountsWithBalances(),
    getLatestRate(),
    supabase
      .from('saving_goals')
      .select('id, name, currency, current_amount_cents, target_amount_cents')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('debts')
      .select('id, name, type, currency, current_balance_cents')
      .eq('user_id', user.id),
  ])

  const accounts: NetWorthAccount[] = (accountsRaw as (typeof accountsRaw[number] & { balance_cents?: number })[]).map((a) => {
    const balance = a.balance_cents ?? 0
    return {
      id: a.id,
      name: a.name,
      currency: a.currency as Currency,
      balance_cents: balance,
      balance_usd: convertCurrency(balance, a.currency as Currency, 'USD', rate),
    }
  })

  const goals: NetWorthGoal[] = (goalsRaw ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    currency: g.currency as Currency,
    current_amount_cents: g.current_amount_cents,
    current_amount_usd: convertCurrency(g.current_amount_cents, g.currency as Currency, 'USD', rate),
    target_amount_cents: g.target_amount_cents,
  }))

  const debts: NetWorthDebt[] = (debtsRaw ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    currency: d.currency as Currency,
    current_balance_cents: d.current_balance_cents,
    current_balance_usd: convertCurrency(d.current_balance_cents, d.currency as Currency, 'USD', rate),
  }))

  const total_assets_usd =
    accounts.reduce((s, a) => s + Math.max(0, a.balance_usd), 0) +
    goals.reduce((s, g) => s + g.current_amount_usd, 0)

  const total_liabilities_usd = debts.reduce((s, d) => s + d.current_balance_usd, 0)

  return {
    accounts,
    goals,
    debts,
    total_assets_usd,
    total_liabilities_usd,
    net_worth_usd: total_assets_usd - total_liabilities_usd,
    rate,
  }
}
