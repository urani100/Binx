export const BINX_SYSTEM_PROMPT = `You are a local discovery assistant for BiNx, a place-pinning and recommendation app.

ROLE
Generate 7–10 place recommendations tailored to the user's current location, time of day, weather, and learned taste profile. Every recommendation must be a real, verifiable place with a real address.

DISTANCE AND TIME
- Estimate distance_km as straight-line distance from the user's coordinates to the place
- Estimate estimated_minutes and set travel_mode: use 'walking' (5 km/h pace) for distances under 2 km; use 'transit' for 2 km and above
- Do not recommend places more than 15 km away
- Always provide lat and lng as decimal degrees for every place — use your knowledge of the city to estimate coordinates as accurately as possible

CATEGORY SELECTION BY TIME OF DAY
- morning (5–12h): cafes, bakeries, parks, bookshops that open early
- afternoon (12–17h): restaurants, galleries, markets, parks, museums
- evening (17–21h): restaurants, bars, rooftop venues, live music
- night (21–5h): bars, late-night eateries, jazz clubs, gelaterias open late

WEATHER CONTEXT
- Rain or storm: indoor venues — cafes, museums, galleries, bookshops, covered markets
- Hot above 28°C: shaded parks, air-conditioned spaces, gelaterias, rooftop bars at dusk
- Cold below 5°C: warm interiors — wine bars, bakeries, cozy restaurants
- Clear and mild: full range valid; outdoor venues appropriate

VARIETY RULES
- Never return more than 3 places from the same category
- Spread recommendations across at least 3 different categories per response
- Excluded places must not appear in the response under any name or alias

AI CONFIDENCE SCORING
- 0.90 to 1.00: widely known place, high certainty
- 0.75 to 0.89: well-established neighbourhood spot, likely accurate
- 0.60 to 0.74: less certain — smaller or newer venue, user should verify
- Do not include any place you would score below 0.60

VIBE MATCH REASON
Write exactly one sentence of maximum 20 words. Connect the user's taste profile to something specific about this place. Avoid generic phrases.
- Bad: "A great place to relax and enjoy the atmosphere."
- Good: "Matches your love of jazz with live sessions every Thursday evening."

QUALITY BAR
- Only recommend places you are confident exist at the stated address
- Do not invent opening hours — populate current_status only when confident
- If uncertain about a specific detail, omit it rather than guess
- Prioritize recency — avoid recommending places that may have closed`

export function buildRecommendationsTool(hasRefinement = false) {
  return {
  name: 'generate_recommendations',
  description: 'Generate location recommendations for the user based on their current context and learned taste profile.',
  input_schema: {
    type: 'object',
    properties: {
      recommendations: {
        type: 'array',
        minItems: hasRefinement ? 1 : 7,
        maxItems: 10,
        items: {
          type: 'object',
          required: ['name', 'address', 'category', 'vibe_match_reason', 'distance_km', 'estimated_minutes', 'travel_mode', 'ai_confidence', 'tags'],
          properties: {
            name:              { type: 'string' },
            address:           { type: 'string' },
            category:          {
              type: 'string',
              enum: [
                'cafe', 'restaurant', 'park', 'gallery', 'bar', 'cocktail-bar',
                'museum', 'bookshop', 'market', 'live-music', 'rooftop', 'bakery',
                'spa', 'cinema', 'jazz-club', 'wine-bar', 'gelateria', 'late-night'
              ]
            },
            vibe_match_reason: { type: 'string', description: 'Why this place matches the user — max 20 words' },
            distance_km:       { type: 'number' },
            estimated_minutes: { type: 'integer' },
            travel_mode:       { type: 'string', enum: ['walking', 'transit'] },
            current_status:    { type: 'string' },
            ai_confidence:     { type: 'number', minimum: 0.60, maximum: 1.0 },
            tags:              { type: 'array', items: { type: 'string' } },
            lat:               { type: 'number', description: 'Estimated decimal latitude of the place' },
            lng:               { type: 'number', description: 'Estimated decimal longitude of the place' }
          }
        }
      },
      reasoning: { type: 'string', description: 'Brief strategy behind these picks — max 30 words' }
    },
    required: ['recommendations', 'reasoning']
  }
  }
}

export function buildRecommendationPrompt(params: {
  current_location: { lat: number; lng: number; address: string; neighborhood: string }
  weather_data: { condition: string; temperature: number; is_real: boolean }
  time_of_day: string
  taste_summary: string
  identity_narrative: string
  vibe_narrative: string
  is_cold_start: boolean
  excluded_places: string[]
  refinement_context?: string
}): string {
  const {
    current_location, weather_data, time_of_day,
    taste_summary, identity_narrative, vibe_narrative,
    is_cold_start, excluded_places, refinement_context
  } = params

  const weatherNote = weather_data.is_real ? '' : ' (estimated)'
  const coldStartNote = is_cold_start
    ? '\nNote: This user is new — lean toward crowd-pleasing, well-known venues over niche picks.'
    : ''

  const excludeBlock = excluded_places.length > 0
    ? `\nExcluded places (do not recommend under any name or alias): ${excluded_places.join(', ')}`
    : ''

  const refinementBlock = refinement_context
    ? `\nUser refinement — STRICT FILTER, HIGH PRIORITY:\nThe user has explicitly requested: ${refinement_context}\nReturn ONLY venues that strictly match ALL of the requested criteria. Do not include any venues outside these constraints.`
    : ''

  return `Current Context:
Location: ${current_location.address} (${current_location.neighborhood})
Coordinates: ${current_location.lat.toFixed(5)}, ${current_location.lng.toFixed(5)}
Weather: ${weather_data.condition}${weatherNote}, ${weather_data.temperature}°C
Time: ${time_of_day}
${coldStartNote}
User Taste Profile:
${taste_summary}

Who they are: ${identity_narrative}
What they're after: ${vibe_narrative}
${excludeBlock}${refinementBlock}

Generate a variety of recommendations that honour this taste profile and the current context.`
}
