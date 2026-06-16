'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getRateLookup } from '@/lib/actions/exchange-rates'
import { computeAccountBalances, type BalanceTxn } from '@/lib/finance'
import type { ActionResult, Currency } from '@/lib/types'

export async function getAccounts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function getAccountsWithBalances() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!accounts) return []

  const { data: transactions } = await supabase
    .from('transactions')
    .select('account_id, type, amount_cents, currency, date')
    .eq('user_id', user.id)
    .is('deleted_at', null)

  // Each balance is expressed in its account's own currency; transactions in a
  // different currency are converted at the rate for their date.
  const rateForDate = await getRateLookup()
  const balances = computeAccountBalances(
    accounts as { id: string; currency: Currency }[],
    (transactions ?? []) as BalanceTxn[],
    rateForDate,
  )

  return accounts.map((a) => ({ ...a, balance_cents: balances[a.id] ?? 0 }))
}

export async function createAccount(name: string, currency: Currency): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('accounts')
    .insert({ name, currency, user_id: user.id })

  if (error) return { success: false, error: error.message }
  revalidatePath('/accounts')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateAccount(
  id: string,
  name: string,
  currency: Currency,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('accounts')
    .update({ name, currency })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/accounts')
  return { success: true }
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/accounts')
  return { success: true }
}
