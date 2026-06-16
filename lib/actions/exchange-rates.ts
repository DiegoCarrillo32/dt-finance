'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/lib/types'

const DEFAULT_RATE = 510 // fallback CRC per USD

export async function getLatestRate(): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('usd_to_crc')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  return data?.usd_to_crc ?? DEFAULT_RATE
}

export async function getRateForDate(date: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('usd_to_crc')
    .lte('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  return data?.usd_to_crc ?? DEFAULT_RATE
}

export async function setExchangeRate(
  date: string,
  usdToCrc: number,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('exchange_rates')
    .upsert({ date, usd_to_crc: usdToCrc }, { onConflict: 'date' })

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  revalidatePath('/statistics')
  return { success: true }
}

/**
 * Fetch all rates once and return a lookup that resolves the rate in effect on
 * a given date (latest rate on or before that date). Use this instead of
 * calling getRateForDate in a loop — it avoids one query per transaction.
 */
export async function getRateLookup(): Promise<(date: string) => number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('date, usd_to_crc')
    .order('date', { ascending: false })

  const rates = data ?? []
  return (date: string) => {
    const match = rates.find((r) => r.date <= date)
    // Fall back to the oldest known rate for dates before any record, then default.
    return match?.usd_to_crc ?? rates[rates.length - 1]?.usd_to_crc ?? DEFAULT_RATE
  }
}

export async function getRecentRates(limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)

  return data ?? []
}
