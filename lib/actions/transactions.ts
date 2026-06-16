'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRateLookup } from '@/lib/actions/exchange-rates'
import { sumConvertedToCurrency, type AmountTxn } from '@/lib/finance'
import type { ActionResult, Currency, TransactionType } from '@/lib/types'

export interface TransactionPayload {
  account_id: string
  category_id: string
  type: TransactionType
  amount_cents: number
  currency: Currency
  description: string
  date: string
}

export async function createTransaction(
  payload: TransactionPayload,
): Promise<ActionResult<string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  revalidatePath('/statistics')
  return { success: true, data: data.id }
}

export async function updateTransaction(
  id: string,
  payload: Partial<TransactionPayload>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/statistics')
  return { success: true }
}

export async function softDeleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
  revalidatePath('/statistics')
  return { success: true }
}

export async function getTransactions({
  page = 1,
  pageSize = 20,
  startDate,
  endDate,
  categoryId,
  accountId,
  type,
}: {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
  categoryId?: string
  accountId?: string
  type?: TransactionType
} = {}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], count: 0 }

  let query = supabase
    .from('transactions')
    .select('*, account:accounts(id,name,currency), category:categories(id,name,color,icon,type)', {
      count: 'exact',
    })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (accountId) query = query.eq('account_id', accountId)
  if (type) query = query.eq('type', type)

  const { data, count } = await query
  return { data: data ?? [], count: count ?? 0 }
}

export async function getTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('transactions')
    .select('*, account:accounts(id,name,currency), category:categories(id,name,color,icon,type)')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  return data
}

export async function getCurrentMonthTotals(displayCurrency: Currency = 'USD') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { income: 0, expense: 0, currency: displayCurrency }

  const now = new Date()
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const { data } = await supabase
    .from('transactions')
    .select('type, amount_cents, currency, date')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('date', start)
    .lte('date', end)

  const rateForDate = await getRateLookup()
  const rows = (data ?? []) as (AmountTxn & { type: TransactionType })[]
  const income = sumConvertedToCurrency(
    rows.filter((t) => t.type === 'income'),
    displayCurrency,
    rateForDate,
  )
  const expense = sumConvertedToCurrency(
    rows.filter((t) => t.type === 'expense'),
    displayCurrency,
    rateForDate,
  )
  return { income, expense, currency: displayCurrency }
}

export async function exportTransactionsCsv(startDate: string, endDate: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return ''

  const { data } = await supabase
    .from('transactions')
    .select('date, type, category:categories(name), account:accounts(name), description, amount_cents, currency')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  const header = 'date,type,category,account,description,amount,currency'
  const rows = (data ?? []).map((t) => {
    const amount = (t.amount_cents / 100).toFixed(2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = (t.category as any)?.name ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acc = (t.account as any)?.name ?? ''
    const desc = `"${(t.description ?? '').replace(/"/g, '""')}"`
    return [t.date, t.type, cat, acc, desc, amount, t.currency].join(',')
  })

  return [header, ...rows].join('\n')
}
