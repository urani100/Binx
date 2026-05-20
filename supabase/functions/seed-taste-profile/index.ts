import { createClient } from 'npm:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const VENUE_CATEGORIES = [
  'cafe', 'restaurant', 'park', 'gallery', 'bar', 'cocktail-bar',
  'museum', 'bookshop', 'market', 'live-music', 'rooftop', 'bakery',
  'spa', 'cinema', 'jazz-club', 'wine-bar', 'gelateria', 'late-night'
]

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, preferences } = await req.json()

    if (!user_id) {
      return errorResponse('Missing required field: user_id', 400)
    }

    const initial_weights: Record<string, number> = {}
    VENUE_CATEGORIES.forEach(cat => { initial_weights[cat] = 0.5 })

    // Bias weights from declared preferences
    if (preferences?.activityTypes?.length) {
      for (const activity of preferences.activityTypes as string[]) {
        const mapped = mapActivityToCategory(activity)
        if (mapped && initial_weights[mapped] !== undefined) {
          initial_weights[mapped] = 0.65
        }
      }
    }

    const { error } = await supabase
      .from('users')
      .update({
        affinity_weights: initial_weights,
        atmosphere_signals: {},
        signal_count: 0,
        is_cold_start: true
      })
      .eq('id', user_id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true, data: { seeded: true } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return errorResponse(`Failed to seed taste profile: ${error.message}`, 500)
  }
})

function mapActivityToCategory(activity: string): string | null {
  const map: Record<string, string> = {
    cultural: 'museum', outdoors: 'park', nightlife: 'bar',
    'food-focused': 'restaurant', artistic: 'gallery', wellness: 'spa'
  }
  return map[activity] ?? null
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
