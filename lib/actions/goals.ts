'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRateForDate } from '@/lib/actions/exchange-rates'
import { convertCurrency } from '@/lib/finance'
import type { ActionResult, Currency, GoalStatus } from '@/lib/types'

export interface GoalPayload {
  name: string
  target_amount_cents: number
  currency: Currency
  deadline?: string | null
}

export async function getSavingGoals(status?: GoalStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('saving_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('deadline', { ascending: true, nullsFirst: false })

  if (status) query = query.eq('status', status)

  const { data } = await query
  return data ?? []
}

export async function getSavingGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('saving_goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return data
}

export async function getGoalContributions(goalId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('goal_contributions')
    .select('*')
    .eq('goal_id', goalId)
    .order('date', { ascending: false })

  return data ?? []
}

export async function createGoal(payload: GoalPayload): Promise<ActionResult<string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('saving_goals')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/goals')
  revalidatePath('/dashboard')
  return { success: true, data: data.id }
}

export async function updateGoal(id: string, payload: Partial<GoalPayload>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('saving_goals')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/goals')
  return { success: true }
}

export async function addGoalContribution(
  goalId: string,
  amountCents: number,
  currency: Currency,
  date: string,
  note?: string,
  transactionId?: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error: contribError } = await supabase.from('goal_contributions').insert({
    goal_id: goalId,
    amount_cents: amountCents,
    currency,
    date,
    note: note ?? null,
    transaction_id: transactionId ?? null,
  })

  if (contribError) return { success: false, error: contribError.message }

  const { data: goal } = await supabase
    .from('saving_goals')
    .select('current_amount_cents, target_amount_cents, currency')
    .eq('id', goalId)
    .single()

  if (goal) {
    // Convert the contribution into the goal's currency before accumulating,
    // so a CRC contribution toward a USD goal counts the right amount.
    const rate = await getRateForDate(date)
    const contribution = convertCurrency(amountCents, currency, goal.currency as Currency, rate)
    const newAmount = goal.current_amount_cents + contribution
    const newStatus = newAmount >= goal.target_amount_cents ? 'completed' : undefined
    await supabase
      .from('saving_goals')
      .update({ current_amount_cents: newAmount, ...(newStatus ? { status: newStatus } : {}) })
      .eq('id', goalId)
  }

  revalidatePath('/goals')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateGoalStatus(id: string, status: GoalStatus): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('saving_goals')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/goals')
  return { success: true }
}
