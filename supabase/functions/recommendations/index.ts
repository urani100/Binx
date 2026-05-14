import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders } from '../_shared/cors.ts'
import { BINX_SYSTEM_PROMPT, RECOMMENDATIONS_TOOL, buildRecommendationPrompt } from '../_shared/prompts.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const body = await req.json()
    const {
      current_location,
      user_id,
      weather_data = {},
      user_preferences = {},
      pin_history = [],
      data_quality = {},
      cache_key,
    } = body

    if (!current_location?.lat || !current_location?.lng) {
      return new Response(JSON.stringify({ error: 'Missing required field: current_location with lat/lng' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const lat = parseFloat(current_location.lat)
    const lng = parseFloat(current_location.lng)

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return new Response(JSON.stringify({ error: `Invalid coordinates: lat=${lat}, lng=${lng}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('CLAUDE_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Claude API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userContext = transformToUserContext({ current_location, weather_data, user_preferences, pin_history, data_quality })
    const prompt = buildRecommendationPrompt(userContext)

    const anthropic = new Anthropic({ apiKey })

    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: BINX_SYSTEM_PROMPT,
        tools: [RECOMMENDATIONS_TOOL],
        tool_choice: { type: 'tool', name: 'generate_recommendations' },
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Claude API timeout')), 100000)
      ),
    ])

    const toolBlock = (response as Anthropic.Message).content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Generated recommendations could not be processed. Please try again.')
    }

    const result = toolBlock.input as { recommendations: Record<string, unknown>[]; reasoning: string }

    if (!Array.isArray(result.recommendations)) {
      throw new Error('Generated recommendations could not be processed. Please try again.')
    }

    const enriched = result.recommendations.map((r: Record<string, unknown>) => ({
      ...r,
      placeId: null,
      aiScore: (r.ai_confidence as number) || 0.8,
    }))

    const processingTime = Date.now() - startTime

    return new Response(JSON.stringify({
      success: true,
      data: {
        recommendations: enriched,
        reasoning: result.reasoning,
        cache_key: cache_key || generateCacheKey(userContext),
        processing_time: processingTime,
        data_quality,
      },
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const message = error.message ?? 'Unknown error'

    if (message.includes('timeout')) {
      return new Response(JSON.stringify({
        error: 'Claude API request timeout',
        message: 'The recommendation service is taking longer than expected. Please try again.',
      }), { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (message.includes('usage limit')) {
      return new Response(JSON.stringify({
        error: 'Monthly usage limit exceeded',
        message: 'The recommendation service has reached its usage limit. Please try again later.',
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({
      error: 'Failed to generate recommendations: ' + message,
      message: 'An unexpected error occurred while generating recommendations.',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

function transformToUserContext({ current_location, weather_data, user_preferences, pin_history, data_quality }: {
  current_location: { lat: number; lng: number; address?: string; neighborhood?: string }
  weather_data: { condition?: string; temperature?: number }
  user_preferences: Record<string, unknown>
  pin_history: unknown[]
  data_quality: { weather_accuracy?: string }
}) {
  const hour = new Date().getHours()
  const time_of_day =
    hour >= 5 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 17 ? 'afternoon' :
    hour >= 17 && hour < 21 ? 'evening' : 'night'

  return {
    current_context: {
      location: {
        lat: current_location.lat,
        lng: current_location.lng,
        address: current_location.address ?? `${current_location.lat}, ${current_location.lng}`,
        neighborhood: current_location.neighborhood ?? 'Unknown area',
      },
      weather: {
        condition: weather_data.condition ?? 'Clear',
        temperature: weather_data.temperature ?? 20,
        time_of_day,
        hasRealWeather: data_quality.weather_accuracy === 'real',
      },
      timestamp: new Date().toISOString(),
    },
    user_preferences: {
      ...user_preferences,
      favorite_places: [
        ...((user_preferences.cuisinePreferences as string[]) || []),
        ...((user_preferences.activityTypes as string[]) || []),
      ].slice(0, 5),
    },
    pin_history: pin_history as Array<{ location?: { name?: string }; note?: string }>,
  }
}


function generateCacheKey(userContext: ReturnType<typeof transformToUserContext>) {
  const { current_context } = userContext
  const locationKey = `${current_context.location.lat.toFixed(3)},${current_context.location.lng.toFixed(3)}`
  return `${locationKey}-${current_context.weather.time_of_day}-${current_context.weather.condition}`
}
