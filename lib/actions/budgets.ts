'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRateLookup } from '@/lib/actions/exchange-rates'
import { spentByCategoryConverted, type CategoryTxn } from '@/lib/finance'
import type { ActionResult, Currency } from '@/lib/types'
import { getFirstDayOfMonth } from '@/lib/utils'

export async function getBudgetLimits(month?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const targetMonth = month ?? getFirstDayOfMonth()

  const { data: limits } = await supabase
    .from('budget_limits')
    .select('*, category:categories(id,name,color,icon)')
    .eq('user_id', user.id)
    .eq('month', targetMonth)

  if (!limits) return []

  const now = new Date()
  const start = targetMonth
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const { data: transactions } = await supabase
    .from('transactions')
    .select('category_id, amount_cents, currency, date')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)

  // Spend is converted into each budget's own currency before comparing.
  const limitCurrency = new Map<string, Currency>(
    limits.map((l) => [l.category_id, l.currency as Currency]),
  )
  const rateForDate = await getRateLookup()
  const spent = spentByCategoryConverted(
    (transactions ?? []) as CategoryTxn[],
    (categoryId) => limitCurrency.get(categoryId),
    rateForDate,
  )

  return limits.map((l) => ({ ...l, spent_cents: spent[l.category_id] ?? 0 }))
}

export async function setBudgetLimit(
  categoryId: string,
  limitCents: number,
  currency: Currency,
  month?: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const targetMonth = month ?? getFirstDayOfMonth()

  const { error } = await supabase.from('budget_limits').upsert(
    {
      user_id: user.id,
      category_id: categoryId,
      month: targetMonth,
      limit_cents: limitCents,
      currency,
    },
    { onConflict: 'user_id,category_id,month' },
  )

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/statistics')
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteBudgetLimit(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('budget_limits')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function copyLastMonthBudgets(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const now = new Date()
  const thisMonth = getFirstDayOfMonth(now)
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = getFirstDayOfMonth(lastMonthDate)

  const { data: lastLimits } = await supabase
    .from('budget_limits')
    .select('category_id, limit_cents, currency')
    .eq('user_id', user.id)
    .eq('month', lastMonth)

  if (!lastLimits?.length) return { success: false, error: 'No budgets found for last month' }

  const inserts = lastLimits.map((l) => ({
    user_id: user.id,
    category_id: l.category_id,
    month: thisMonth,
    limit_cents: l.limit_cents,
    currency: l.currency,
  }))

  const { error } = await supabase
    .from('budget_limits')
    .upsert(inserts, { onConflict: 'user_id,category_id,month' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}
