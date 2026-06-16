import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async () => {
  const today = new Date().toISOString().split('T')[0]

  // Check if we already have today's rate
  const { data: existing } = await supabase
    .from('exchange_rates')
    .select('id')
    .eq('date', today)
    .single()

  if (existing) {
    return new Response(JSON.stringify({ skipped: true, date: today }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch from open.er-api.com (free, no key required)
  const res = await fetch('https://open.er-api.com/v6/latest/USD')
  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch rates' }), { status: 502 })
  }

  const json = await res.json()
  const usdToCrc: number = json?.rates?.CRC

  if (!usdToCrc) {
    return new Response(JSON.stringify({ error: 'CRC rate not found' }), { status: 502 })
  }

  const { error } = await supabase
    .from('exchange_rates')
    .upsert({ date: today, usd_to_crc: usdToCrc }, { onConflict: 'date' })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ synced: true, date: today, usd_to_crc: usdToCrc }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
