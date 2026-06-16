'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, Currency, DebtType } from '@/lib/types'

export interface DebtPayload {
  name: string
  type: DebtType
  creditor?: string | null
  original_amount_cents: number
  current_balance_cents: number
  interest_rate_bps: number
  minimum_payment_cents: number
  due_day_of_month?: number | null
  currency: Currency
}

export async function getDebts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function createDebt(payload: DebtPayload): Promise<ActionResult<string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('debts')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/debt-tracker')
  revalidatePath('/net-worth')
  revalidatePath('/calendar')
  return { success: true, data: data.id }
}

export async function updateDebt(id: string, payload: Partial<DebtPayload>): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/debt-tracker')
  revalidatePath('/net-worth')
  return { success: true }
}

export async function deleteDebt(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/debt-tracker')
  revalidatePath('/net-worth')
  return { success: true }
}

export async function makeDebtPayment(id: string, amountCents: number): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: debt, error: fetchError } = await supabase
    .from('debts')
    .select('current_balance_cents')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !debt) return { success: false, error: 'Debt not found' }

  const newBalance = Math.max(0, debt.current_balance_cents - amountCents)

  const { error } = await supabase
    .from('debts')
    .update({ current_balance_cents: newBalance })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/debt-tracker')
  revalidatePath('/net-worth')
  return { success: true }
}
