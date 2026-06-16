'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, BillingPeriod, Currency } from '@/lib/types'

export interface SubscriptionPayload {
  name: string
  amount_cents: number
  currency: Currency
  billing_period: BillingPeriod
  next_billing_date?: string | null
  notes?: string | null
}

export async function getSubscriptions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('next_billing_date', { ascending: true, nullsFirst: false })

  return data ?? []
}

export async function createSubscription(payload: SubscriptionPayload): Promise<ActionResult<string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/calendar')
  revalidatePath('/cash-flow')
  return { success: true, data: data.id }
}

export async function updateSubscription(
  id: string,
  payload: Partial<SubscriptionPayload>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/calendar')
  return { success: true }
}

export async function toggleSubscriptionActive(id: string, active: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .update({ active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/subscriptions')
  return { success: true }
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/subscriptions')
  revalidatePath('/calendar')
  return { success: true }
}
