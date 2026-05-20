import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return errorResponse('Missing required field: user_id', 400)
    }

    const { data, error } = await supabase
      .from('users')
      .select('affinity_weights, atmosphere_signals, signal_count, is_cold_start')
      .eq('id', user_id)
      .single()

    if (error) throw error

    const weights: Record<string, number> = data?.affinity_weights ?? {}
    const atmosphere: Record<string, Record<string, number>> = data?.atmosphere_signals ?? {}
    const signal_count: number = data?.signal_count ?? 0
    const is_cold_start: boolean = data?.is_cold_start ?? true

    const loved = topN(weights, 0.7, 5)
    const avoided = bottomN(weights, 0.35)
    const timePrefs = topFreq(atmosphere.time_of_day ?? {}, 2)
    const weatherPrefs = topFreq(atmosphere.weather ?? {}, 2)

    let taste_summary: string
    let identity_narrative: string
    let vibe_narrative: string

    if (is_cold_start) {
      taste_summary = 'New user — no strong preferences established yet. Recommend a balanced, crowd-pleasing mix.'
      identity_narrative = 'Someone exploring the app for the first time.'
      vibe_narrative = 'Open to discovery — provide variety across categories and price points.'
    } else {
      const lovedStr = loved.length > 0 ? loved.join(', ') : 'no strong category preferences yet'
      const avoidedStr = avoided.length > 0 ? `Tends to avoid: ${avoided.join(', ')}.` : ''
      const timeStr = timePrefs.length > 0 ? `Most active during: ${timePrefs.join(' and ')}.` : ''
      const weatherStr = weatherPrefs.length > 0 ? `Engages more in: ${weatherPrefs.join(' and ')} conditions.` : ''

      taste_summary = `Affinity profile (${signal_count} signals): Gravitates toward ${lovedStr}. ${avoidedStr} ${timeStr} ${weatherStr}`.trim()
      identity_narrative = `A user with ${signal_count} recorded signals who has shown consistent preference for ${lovedStr}.`
      vibe_narrative = loved.length > 0
        ? `Looking for ${loved.slice(0, 3).join(', ')} experiences that match their established taste.`
        : 'Open to variety — no dominant category preference established yet.'
    }

    return new Response(JSON.stringify({
      success: true,
      data: { taste_summary, identity_narrative, vibe_narrative, is_cold_start }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return errorResponse(`Failed to compute taste summary: ${error.message}`, 500)
  }
})

function topN(obj: Record<string, number>, threshold: number, maxCount: number): string[] {
  return Object.entries(obj)
    .filter(([, v]) => v >= threshold)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxCount)
    .map(([k]) => k)
}

function bottomN(obj: Record<string, number>, threshold: number): string[] {
  return Object.entries(obj)
    .filter(([, v]) => v <= threshold)
    .sort(([, a], [, b]) => a - b)
    .map(([k]) => k)
}

function topFreq(obj: Record<string, number>, maxCount: number): string[] {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxCount)
    .map(([k]) => k)
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
