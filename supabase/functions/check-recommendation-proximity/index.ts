import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { updateWeight } from '../_shared/weights.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

const PROXIMITY_THRESHOLD_M = 150
const SESSION_WINDOW_HOURS = 48
const SIGNAL_WEIGHTS: Record<string, number> = {
  pin_created: 1.0,
  pin_anywhere: 0.6,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, pin_lat, pin_lng, time_of_day, weather_condition } = await req.json()

    if (!user_id || pin_lat == null || pin_lng == null) {
      return errorResponse('Missing required fields: user_id, pin_lat, pin_lng', 400)
    }

    const cutoff = new Date(Date.now() - SESSION_WINDOW_HOURS * 3600 * 1000).toISOString()
    const { data: sessions } = await supabase
      .from('recommendation_sessions')
      .select('session_id, places')
      .eq('user_id', user_id)
      .gte('created_at', cutoff)

    let matchedPlace: { place_name: string; category: string; session_id: string } | null = null

    for (const session of (sessions ?? [])) {
      const places: Array<{ name: string; category: string; address: string }> = session.places ?? []
      for (const place of places) {
        // Proximity check uses stored lat/lng populated by the recommendations edge fn
        const placeLat: number | undefined = (place as Record<string, unknown>).lat as number
        const placeLng: number | undefined = (place as Record<string, unknown>).lng as number
        if (placeLat == null || placeLng == null) continue

        const dist = haversineMeters(pin_lat, pin_lng, placeLat, placeLng)
        if (dist <= PROXIMITY_THRESHOLD_M) {
          matchedPlace = {
            place_name: place.name,
            category: place.category,
            session_id: session.session_id
          }
          break
        }
      }
      if (matchedPlace) break
    }

    const action = matchedPlace ? 'pin_created' : 'pin_anywhere'
    const signal_weight = SIGNAL_WEIGHTS[action]
    const category = matchedPlace?.category ?? null
    const session_id = matchedPlace?.session_id ?? null
    const place_name = matchedPlace?.place_name ?? `pin@${pin_lat.toFixed(4)},${pin_lng.toFixed(4)}`

    // Insert feedback row
    await supabase.from('recommendation_feedback').insert({
      user_id,
      session_id,
      place_name,
      category,
      action,
      time_of_day: time_of_day ?? null,
      weather_condition: weather_condition ?? null
    })

    // Update affinity weight if category known
    if (category) {
      await updateWeight(supabase, user_id, category, signal_weight)
    }

    return new Response(JSON.stringify({
      success: true,
      data: { action, matched: !!matchedPlace }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return errorResponse(`Proximity check failed: ${error.message}`, 500)
  }
})

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
