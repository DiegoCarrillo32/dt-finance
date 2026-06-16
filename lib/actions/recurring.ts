'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isDueInMonth, hasEnded } from '@/lib/finance'
import type { ActionResult, Currency } from '@/lib/types'

export interface RecurringPayload {
  name: string
  account_id: string
  category_id: string
  amount_cents: number
  currency: Currency
  day_of_month: number
  frequency_months?: number
  start_date?: string | null
  end_date?: string | null
}

export async function getRecurringExpenses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('recurring_expenses')
    .select('*, account:accounts(id,name,currency), category:categories(id,name,color,icon)')
    .eq('user_id', user.id)
    .order('day_of_month', { ascending: true })

  return data ?? []
}

export async function getRecurringWithStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0]

  const { data: recurring } = await supabase
    .from('recurring_expenses')
    .select('*, account:accounts(id,name,currency), category:categories(id,name,color,icon)')
    .eq('user_id', user.id)
    .order('active', { ascending: false })
    .order('day_of_month', { ascending: true })

  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, description, amount_cents, date, type')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('date', monthStart)
    .lte('date', monthEnd)

  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return (recurring ?? []).map((r) => {
    // A recurring expense counts as "paid this month" when a matching expense
    // transaction exists. Match precisely on the transaction that
    // markRecurringPaid creates (same name + amount) so we can reliably undo it.
    const match = (transactions ?? []).find(
      (t) =>
        t.type === 'expense' &&
        t.amount_cents === r.amount_cents &&
        (t.description ?? '') === r.name,
    )
    const ended = hasEnded(r.end_date, year, month)
    const dueThisMonth = !ended && isDueInMonth(r, year, month)
    return {
      ...r,
      due_this_month: dueThisMonth,
      ended,
      paid: dueThisMonth && !!match,
      paid_transaction_id: match?.id ?? null,
    }
  })
}

export async function createRecurring(payload: RecurringPayload): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Non-monthly expenses need an anchor month so we know which months they
  // fall on. Default it to this month when the form doesn't supply one.
  const frequency = payload.frequency_months ?? 1
  const start_date =
    payload.start_date ?? (frequency > 1 ? new Date().toISOString().split('T')[0] : null)

  const { error } = await supabase
    .from('recurring_expenses')
    .insert({ ...payload, frequency_months: frequency, start_date, user_id: user.id })

  if (error) return { success: false, error: error.message }
  revalidatePath('/recurring')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateRecurring(
  id: string,
  payload: Partial<RecurringPayload>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('recurring_expenses')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/recurring')
  return { success: true }
}

export async function toggleRecurringActive(id: string, active: boolean): Promise<ActionResult> {
  return updateRecurring(id, { active } as Partial<RecurringPayload> & { active?: boolean })
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/recurring')
  return { success: true }
}

export async function markRecurringPaid(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: recurring, error: fetchError } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !recurring) return { success: false, error: 'Recurring expense not found' }

  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: recurring.account_id,
    category_id: recurring.category_id,
    type: 'expense',
    amount_cents: recurring.amount_cents,
    currency: recurring.currency,
    description: recurring.name,
    date: today,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath('/recurring')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  return { success: true }
}

export async function unmarkRecurringPaid(transactionId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', transactionId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/recurring')
  revalidatePath('/dashboard')
  revalidatePath('/transactions')
  return { success: true }
}

export async function getUpcomingRecurring(days = 7) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('recurring_expenses')
    .select('*, category:categories(name,color,icon)')
    .eq('user_id', user.id)
    .eq('active', true)

  const today = new Date()
  const todayDay = today.getDate()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  return (data ?? [])
    .filter((r) => {
      // Only items actually due this month (respecting frequency + end date)…
      if (!isDueInMonth(r, year, month)) return false
      // …and whose day falls within the upcoming window.
      const diff = r.day_of_month - todayDay
      return diff >= 0 && diff <= days
    })
    .sort((a, b) => a.day_of_month - b.day_of_month)
}
