import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders } from '../_shared/cors.ts'
import { BINX_SYSTEM_PROMPT, buildRecommendationsTool, buildRecommendationPrompt } from '../_shared/prompts.ts'

// Module scope — instantiated once per cold start, reused across requests
const anthropic = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY')! })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Computed per request — must not be at module scope or it freezes at cold-start time
  const hour = new Date().getHours()
  const time_of_day =
    hour >= 5  && hour < 12 ? 'morning' :
    hour >= 12 && hour < 17 ? 'afternoon' :
    hour >= 17 && hour < 21 ? 'evening' : 'night'

  const startTime = Date.now()

  try {
    const body = await req.json()
    const {
      current_location,
      user_id,
      weather_data = {},
      taste_summary = '',
      identity_narrative = '',
      vibe_narrative = '',
      is_cold_start = true,
      excluded_places = [],
      refinement_context,
    } = body

    if (!current_location?.lat || !current_location?.lng) {
      return errorResponse('Missing required field: current_location with lat/lng', 400)
    }
    if (!user_id) {
      return errorResponse('Missing required field: user_id', 400)
    }

    const lat = parseFloat(current_location.lat)
    const lng = parseFloat(current_location.lng)

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return errorResponse(`Invalid coordinates: lat=${lat}, lng=${lng}`, 400)
    }

    const prompt = buildRecommendationPrompt({
      current_location: {
        lat,
        lng,
        address: current_location.address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        neighborhood: current_location.neighborhood ?? 'Unknown area'
      },
      weather_data: {
        condition: weather_data.condition ?? 'Clear',
        temperature: weather_data.temperature ?? 20,
        is_real: weather_data.is_real ?? false
      },
      time_of_day,
      taste_summary,
      identity_narrative,
      vibe_narrative,
      is_cold_start,
      excluded_places: Array.isArray(excluded_places) ? excluded_places : [],
      refinement_context
    })

    const session_id = crypto.randomUUID()

    const response = await Promise.race([
      anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: [{ type: 'text', text: BINX_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        tools: [{ ...buildRecommendationsTool(!!refinement_context), cache_control: { type: 'ephemeral' } }],
        tool_choice: { type: 'tool', name: 'generate_recommendations' },
        messages: [{ role: 'user', content: prompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Claude API timeout')), 28000)
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
      lat: (r.lat as number) ?? null,
      lng: (r.lng as number) ?? null,
    }))

    const processingTime = Date.now() - startTime

    return new Response(JSON.stringify({
      success: true,
      data: {
        recommendations: enriched,
        reasoning: result.reasoning,
        session_id,
        is_cold_start,
        processing_time: processingTime,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return errorResponse('Monthly usage limit exceeded — please try again later.', 429)
      }
      return errorResponse(`Claude API error: ${error.message}`, 502)
    }

    if (error.message?.includes('timeout')) {
      return errorResponse('The recommendation service is taking longer than expected. Please try again.', 504)
    }

    return errorResponse(`Failed to generate recommendations: ${error.message}`, 500)
  }
})

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
