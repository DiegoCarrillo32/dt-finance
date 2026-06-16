'use server'

import { createClient } from '@/lib/supabase/server'
import type { TransactionType } from '@/lib/types'

export interface ReportFilters {
  startDate: string
  endDate: string
  type?: TransactionType | 'all'
}

export interface ReportTransaction {
  id: string
  date: string
  type: TransactionType
  description: string
  amount_cents: number
  currency: string
  account_name: string
  category_name: string
}

export interface ReportSummary {
  transactions: ReportTransaction[]
  total_income_cents: number
  total_expense_cents: number
  count: number
}

export async function getReportData(filters: ReportFilters): Promise<ReportSummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { transactions: [], total_income_cents: 0, total_expense_cents: 0, count: 0 }

  let query = supabase
    .from('transactions')
    .select('id, date, type, description, amount_cents, currency, account:accounts(name), category:categories(name)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('date', filters.startDate)
    .lte('date', filters.endDate)
    .order('date', { ascending: false })

  if (filters.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }

  const { data } = await query

  const transactions: ReportTransaction[] = (data ?? []).map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type as TransactionType,
    description: t.description,
    amount_cents: t.amount_cents,
    currency: t.currency,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    account_name: (t.account as any)?.name ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category_name: (t.category as any)?.name ?? '',
  }))

  const total_income_cents = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount_cents, 0)

  const total_expense_cents = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount_cents, 0)

  return {
    transactions,
    total_income_cents,
    total_expense_cents,
    count: transactions.length,
  }
}

export function buildCsvString(transactions: ReportTransaction[]): string {
  const headers = ['Date', 'Type', 'Description', 'Amount', 'Currency', 'Account', 'Category']
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    `"${t.description.replace(/"/g, '""')}"`,
    (t.amount_cents / 100).toFixed(2),
    t.currency,
    `"${t.account_name.replace(/"/g, '""')}"`,
    `"${t.category_name.replace(/"/g, '""')}"`,
  ])
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
}
