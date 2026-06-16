'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLatestRate } from '@/lib/actions/exchange-rates'
import { getCurrentMonthTotals } from '@/lib/actions/transactions'
import {
  sumMonthlyIncome,
  sumMonthlyRecurring,
  hasEnded,
  type MonthlyRecurringItem,
} from '@/lib/finance'
import type { ActionResult, Currency, IncomeSource } from '@/lib/types'

export async function getIncomeSources(): Promise<IncomeSource[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (data ?? []) as IncomeSource[]
}

export async function createIncomeSource(
  name: string,
  amountCents: number,
  currency: Currency,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('income_sources')
    .insert({ name, amount_cents: amountCents, currency, user_id: user.id })

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/recurring')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateIncomeSource(
  id: string,
  name: string,
  amountCents: number,
  currency: Currency,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('income_sources')
    .update({ name, amount_cents: amountCents, currency })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/recurring')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteIncomeSource(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('income_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/recurring')
  revalidatePath('/dashboard')
  return { success: true }
}

export interface MonthlySummary {
  /** Expected monthly income (from income sources). */
  income: number
  /** Monthly recurring commitment (active, in-effect, amortized by frequency). */
  recurring: number
  /** Actual spending logged this month (expense transactions). */
  spent: number
  /** Income minus recurring — the planned amount left each month. */
  leftAfterRecurring: number
  currency: Currency
}

/**
 * Headline figures for the "salary after recurring" summary, all converted to
 * the requested display currency. Income + recurring use the latest rate
 * (forward-looking planning); spent reuses the per-date conversion of
 * getCurrentMonthTotals.
 */
export async function getMonthlySummary(
  displayCurrency: Currency = 'USD',
): Promise<MonthlySummary> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { income: 0, recurring: 0, spent: 0, leftAfterRecurring: 0, currency: displayCurrency }
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [sources, { data: recurring }, rate, totals] = await Promise.all([
    getIncomeSources(),
    supabase
      .from('recurring_expenses')
      .select('amount_cents, currency, frequency_months, end_date')
      .eq('user_id', user.id)
      .eq('active', true),
    getLatestRate(),
    getCurrentMonthTotals(displayCurrency),
  ])

  // Only count recurring expenses currently in effect (not past their end date).
  const inEffect = (recurring ?? []).filter(
    (r) => !hasEnded(r.end_date, year, month),
  ) as MonthlyRecurringItem[]

  const income = sumMonthlyIncome(sources, displayCurrency, rate)
  const recurringTotal = sumMonthlyRecurring(inEffect, displayCurrency, rate)

  return {
    income,
    recurring: recurringTotal,
    spent: totals.expense,
    leftAfterRecurring: income - recurringTotal,
    currency: displayCurrency,
  }
}
