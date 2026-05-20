import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { updateWeight } from '../_shared/weights.ts'

const SIGNAL_WEIGHTS: Record<string, number> = {
  pin_created:     1.0,
  directions:      0.9,
  like:            0.8,
  pin_anywhere:    0.6,
  dismiss:        -0.4,
  batch_dismissed: -0.1,
}

const LEARNING_RATE = 0.15  // used by updateAtmosphereSignal below

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // batch_dismissed accepts an array of items; all others are single
    if (body.action === 'batch_dismissed' && Array.isArray(body.items)) {
      return await handleBatchDismiss(body)
    }

    return await handleSingle(body)

  } catch (error) {
    return errorResponse(`Failed to update taste profile: ${error.message}`, 500)
  }
})

async function handleSingle(body: {
  user_id: string
  action: string
  category?: string | null
  session_id?: string | null
  place_name: string
  ai_confidence?: number | null
  distance_km?: number | null
  time_of_day?: string | null
  weather_condition?: string | null
}) {
  const {
    user_id, action, category, session_id, place_name,
    ai_confidence, distance_km, time_of_day, weather_condition
  } = body

  if (!user_id || !action || !place_name) {
    return errorResponse('Missing required fields: user_id, action, place_name', 400)
  }

  const signal_weight = SIGNAL_WEIGHTS[action]
  if (signal_weight === undefined) {
    return errorResponse(`Unknown action: ${action}`, 400)
  }

  // Insert feedback row
  const { error: fbError } = await supabase
    .from('recommendation_feedback')
    .insert({
      user_id, session_id: session_id ?? null, place_name,
      category: category ?? null, action,
      ai_confidence: ai_confidence ?? null,
      distance_km: distance_km ?? null,
      time_of_day: time_of_day ?? null,
      weather_condition: weather_condition ?? null
    })

  if (fbError) throw fbError

  // Update affinity weight only when category is known
  if (category) {
    await updateWeight(supabase, user_id, category, signal_weight)
  }

  // Update atmosphere signals
  if (time_of_day) {
    await updateAtmosphereSignal(user_id, 'time_of_day', time_of_day, signal_weight)
  }
  if (weather_condition) {
    await updateAtmosphereSignal(user_id, 'weather', weather_condition, signal_weight)
  }

  return new Response(JSON.stringify({ success: true, data: { recorded: true } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleBatchDismiss(body: {
  user_id: string
  session_id?: string | null
  time_of_day?: string | null
  weather_condition?: string | null
  items: Array<{ place_name: string; category?: string | null }>
}) {
  const { user_id, session_id, time_of_day, weather_condition, items } = body

  if (!user_id || !items?.length) {
    return errorResponse('Missing required fields: user_id, items', 400)
  }

  const feedbackRows = items.map(item => ({
    user_id,
    session_id: session_id ?? null,
    place_name: item.place_name,
    category: item.category ?? null,
    action: 'batch_dismissed',
    time_of_day: time_of_day ?? null,
    weather_condition: weather_condition ?? null
  }))

  const { error: fbError } = await supabase
    .from('recommendation_feedback')
    .insert(feedbackRows)

  if (fbError) throw fbError

  // Apply weak negative signal to each category.
  // countSignal = false — batch_dismissed is a passive non-engagement signal;
  // it must not advance the user toward cold-start exit.
  const sw = SIGNAL_WEIGHTS['batch_dismissed']
  for (const item of items) {
    if (item.category) {
      await updateWeight(supabase, user_id, item.category, sw, false)
    }
  }

  return new Response(JSON.stringify({ success: true, data: { recorded: items.length } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function updateAtmosphereSignal(
  user_id: string, domain: string, key: string, signal_weight: number
) {
  const { data } = await supabase
    .from('users')
    .select('atmosphere_signals')
    .eq('id', user_id)
    .single()

  const atmosphere: Record<string, Record<string, number>> = data?.atmosphere_signals ?? {}
  if (!atmosphere[domain]) atmosphere[domain] = {}
  const current = atmosphere[domain][key] ?? 0.5
  const distance = signal_weight >= 0 ? (1.0 - current) : current
  const delta = signal_weight * LEARNING_RATE * distance
  atmosphere[domain][key] = Math.min(1.0, Math.max(0.0, current + delta))

  await supabase
    .from('users')
    .update({ atmosphere_signals: atmosphere })
    .eq('id', user_id)
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
