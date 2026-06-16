import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Mirrors isDueInMonth in lib/finance.ts. Kept inline because edge functions
// run on Deno and can't import the app's modules.
function monthOrdinal(dateStr: string): number {
  const year = Number(dateStr.slice(0, 4))
  const month = Number(dateStr.slice(5, 7)) // 1-12
  return year * 12 + (month - 1)
}

interface Schedule {
  frequency_months: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

function isDueInMonth(r: Schedule, year: number, month: number): boolean {
  const target = year * 12 + (month - 1)
  if (r.end_date && target > monthOrdinal(r.end_date)) return false
  const anchor = monthOrdinal(r.start_date ?? r.created_at)
  if (target < anchor) return false
  const freq = r.frequency_months || 1
  return (target - anchor) % freq === 0
}

Deno.serve(async () => {
  const today = new Date()
  // Convert to Costa Rica time (UTC-6)
  const crDate = new Date(today.getTime() - 6 * 60 * 60 * 1000)
  const dayOfMonth = crDate.getDate()
  const dateStr = crDate.toISOString().split('T')[0]
  const year = crDate.getFullYear()
  const month = crDate.getMonth() + 1
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`

  const { data: recurring, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('day_of_month', dayOfMonth)
    .eq('active', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let created = 0

  for (const r of recurring ?? []) {
    // Respect frequency (e.g. quarterly) and end date (e.g. a debt that ends).
    if (!isDueInMonth(r, year, month)) continue

    // Check if we already created a transaction for this recurring expense this month
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', r.user_id)
      .eq('account_id', r.account_id)
      .eq('category_id', r.category_id)
      .eq('amount_cents', r.amount_cents)
      .eq('currency', r.currency)
      .gte('date', monthStart)
      .is('deleted_at', null)
      .limit(1)

    if (existing?.length) continue

    await supabase.from('transactions').insert({
      user_id: r.user_id,
      account_id: r.account_id,
      category_id: r.category_id,
      type: 'expense',
      amount_cents: r.amount_cents,
      currency: r.currency,
      description: r.name,
      date: dateStr,
    })

    created++
  }

  return new Response(
    JSON.stringify({ processed: recurring?.length ?? 0, created, date: dateStr }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
