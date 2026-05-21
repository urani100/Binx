import Anthropic from 'npm:@anthropic-ai/sdk'
import { corsHeaders } from '../_shared/cors.ts'
import { BINX_SYSTEM_PROMPT, buildRecommendationPrompt } from '../_shared/prompts.ts'

// Module scope — instantiated once per cold start, reused across requests
const anthropic = new Anthropic({ apiKey: Deno.env.get('CLAUDE_API_KEY')! })

// Extracts complete recommendation objects from Claude's streaming text output.
// Activates once the <recommendations> tag is seen, then uses brace-depth
// tracking to emit each complete JSON object as it arrives.
class TextExtractor {
  private accumulated = ''
  private scanPos = 0
  private inRecsBlock = false
  private inArray = false
  private depth = 0
  private objStart = -1
  private inStr = false
  private escape = false

  feed(chunk: string): Record<string, unknown>[] {
    this.accumulated += chunk
    const results: Record<string, unknown>[] = []

    if (!this.inRecsBlock) {
      const tagPos = this.accumulated.indexOf('<recommendations>')
      if (tagPos === -1) return results
      this.inRecsBlock = true
      this.scanPos = tagPos + '<recommendations>'.length
    }

    while (this.scanPos < this.accumulated.length) {
      if (this.accumulated.startsWith('</recommendations>', this.scanPos)) break

      const ch = this.accumulated[this.scanPos]

      if (this.escape) { this.escape = false; this.scanPos++; continue }
      if (ch === '\\' && this.inStr) { this.escape = true; this.scanPos++; continue }
      if (ch === '"') { this.inStr = !this.inStr; this.scanPos++; continue }
      if (this.inStr) { this.scanPos++; continue }

      if (!this.inArray) {
        if (ch === '[' && this.accumulated.slice(0, this.scanPos).includes('"recommendations"')) {
          this.inArray = true
        }
      } else {
        if (ch === '{') {
          if (this.depth === 0) this.objStart = this.scanPos
          this.depth++
        } else if (ch === '}') {
          this.depth--
          if (this.depth === 0 && this.objStart !== -1) {
            const objStr = this.accumulated.slice(this.objStart, this.scanPos + 1)
            try { results.push(JSON.parse(objStr)) } catch { /* skip malformed */ }
            this.objStart = -1
          }
        }
      }

      this.scanPos++
    }

    return results
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const hour = new Date().getHours()
  const time_of_day =
    hour >= 5  && hour < 12 ? 'morning' :
    hour >= 12 && hour < 17 ? 'afternoon' :
    hour >= 17 && hour < 21 ? 'evening' : 'night'

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const {
    current_location,
    user_id,
    weather_data = {},
    taste_summary = '',
    identity_narrative = '',
    vibe_narrative = '',
    is_cold_start = true,
    avoided_categories = [],
    excluded_places = [],
    refinement_context,
  } = body as {
    current_location: { lat: number; lng: number; address?: string; neighborhood?: string }
    user_id: string
    weather_data: { condition?: string; temperature?: number; is_real?: boolean }
    taste_summary: string
    identity_narrative: string
    vibe_narrative: string
    is_cold_start: boolean
    avoided_categories: string[]
    excluded_places: string[]
    refinement_context?: string
  }

  if (!current_location?.lat || !current_location?.lng) {
    return errorResponse('Missing required field: current_location with lat/lng', 400)
  }
  if (!user_id) {
    return errorResponse('Missing required field: user_id', 400)
  }

  const lat = parseFloat(String(current_location.lat))
  const lng = parseFloat(String(current_location.lng))

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
      condition: (weather_data.condition as string) ?? 'Clear',
      temperature: (weather_data.temperature as number) ?? 20,
      is_real: (weather_data.is_real as boolean) ?? false
    },
    time_of_day,
    taste_summary: taste_summary as string,
    identity_narrative: identity_narrative as string,
    vibe_narrative: vibe_narrative as string,
    is_cold_start: is_cold_start as boolean,
    avoided_categories: Array.isArray(avoided_categories) ? avoided_categories : [],
    excluded_places: Array.isArray(excluded_places) ? excluded_places : [],
    refinement_context: refinement_context as string | undefined
  })

  const session_id = crypto.randomUUID()
  const encoder = new TextEncoder()

  const responseBody = new ReadableStream({
    async start(controller) {
      const extractor = new TextExtractor()

      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 8192,
          stream: true,
          system: [{ type: 'text', text: BINX_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: prompt }],
        })

        let fullText = ''

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = event.delta.text
            fullText += chunk
            const recs = extractor.feed(chunk)
            for (const rec of recs) {
              const enriched = { ...rec, lat: (rec.lat as number) ?? null, lng: (rec.lng as number) ?? null }
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'recommendation', data: enriched }) + '\n')
              )
            }
          }
        }

        let reasoning = ''
        try {
          const match = fullText.match(/<recommendations>([\s\S]*?)<\/recommendations>/)
          if (match) {
            const parsed = JSON.parse(match[1].trim())
            reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : ''
          }
        } catch { /* reasoning is optional */ }

        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'done', session_id, reasoning }) + '\n')
        )
        controller.close()

      } catch (error) {
        let message = `Failed to generate recommendations: ${error.message}`
        if (error instanceof Anthropic.APIError) {
          if (error.status === 429) message = 'Monthly usage limit exceeded — please try again later.'
          else message = `Claude API error: ${error.message}`
        }
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'error', message }) + '\n')
        )
        controller.close()
      }
    }
  })

  return new Response(responseBody, {
    headers: { ...corsHeaders, 'Content-Type': 'application/x-ndjson' }
  })
})

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message, message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
