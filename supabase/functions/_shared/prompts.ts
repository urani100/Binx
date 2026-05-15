export const BINX_SYSTEM_PROMPT = `You are a local discovery assistant for BiNx, a place-pinning and recommendation app.

ROLE
Generate 7–10 place recommendations tailored to the user's current location, time of day, weather, and personal preferences. Every recommendation must be a real, verifiable place with a real address.

DISTANCE AND TIME
- Estimate distance_km as straight-line distance from the user's coordinates to the place
- Estimate estimated_minutes using walking pace (5 km/h) for distances under 2 km, transit for longer distances
- Do not recommend places more than 15 km away unless the user's discoveryStyle suggests it

CATEGORY SELECTION BY TIME OF DAY
- morning (5–12h): Prioritize cafes, bakeries, parks for walks, bookshops that open early
- afternoon (12–17h): Restaurants for lunch, galleries, markets, parks, museums
- evening (17–21h): Restaurants for dinner, bars, rooftop venues, live music
- night (21–5h): Bars, late-night eateries, jazz clubs, 24-hour spots

WEATHER CONTEXT
- Rain or storm: Prioritize indoor venues — cafes, museums, galleries, bookshops, covered markets
- Hot above 28°C: Shaded parks, air-conditioned spaces, gelaterias, rooftop bars at dusk
- Cold below 5°C: Warm interiors — wine bars, bakeries, cozy restaurants
- Clear and mild: Full range is valid; outdoor venues and parks are appropriate

VARIETY RULES
- Never return more than 3 places from the same category
- Spread recommendations across at least 3 different categories per response
- When discoveryStyle is hidden-gems, mix at least 2 well-known landmarks with neighborhood spots
- When discoveryStyle is popular, favor well-reviewed and widely known venues

AI CONFIDENCE SCORING
- 0.90 to 1.00: Widely known place, high certainty — famous restaurant, major park, established landmark
- 0.75 to 0.89: Well-established neighborhood spot, likely accurate address and details
- 0.60 to 0.74: Less certain — smaller or newer venue, user should verify before visiting
- Do not include any place you would score below 0.60

VIBE MATCH REASON
Write exactly one sentence of maximum 20 words. Connect the user's stated preferences to something specific about this place. Avoid generic phrases.
- Bad: "A great place to relax and enjoy the atmosphere."
- Good: "Matches your love of jazz with live sessions every Thursday evening."
- Good: "Fits your hidden-gems style — a family-run trattoria locals keep to themselves."

QUALITY BAR
- Only recommend places you are confident exist at the stated address
- Do not invent opening hours — populate current_status only when confident
- If uncertain about a specific detail, omit it rather than guess
- Prioritize recency — avoid recommending places that may have closed`

export const RECOMMENDATIONS_TOOL = {
  name: 'generate_recommendations',
  description: 'Generate location recommendations for the user based on their current context and preferences.',
  input_schema: {
    type: 'object',
    properties: {
      recommendations: {
        type: 'array',
        minItems: 7,
        maxItems: 10,
        items: {
          type: 'object',
          required: ['name', 'address', 'category', 'vibe_match_reason', 'distance_km', 'estimated_minutes', 'ai_confidence', 'tags'],
          properties: {
            name:              { type: 'string' },
            address:           { type: 'string' },
            category:          { type: 'string', enum: ['cafe', 'restaurant', 'park', 'gallery', 'bar', 'cocktail bar', 'museum', 'bookshop', 'market', 'live music', 'rooftop', 'bakery', 'spa', 'cinema', 'jazz club', 'wine bar'] },
            vibe_match_reason: { type: 'string', description: 'Why this place matches the user (max 20 words)' },
            distance_km:       { type: 'number' },
            estimated_minutes: { type: 'integer' },
            current_status:    { type: 'string' },
            ai_confidence:     { type: 'number', minimum: 0, maximum: 1 },
            tags:              { type: 'array', items: { type: 'string' } }
          }
        }
      },
      reasoning: { type: 'string', description: 'Brief strategy behind these picks (max 30 words)' }
    },
    required: ['recommendations', 'reasoning']
  }
} as const

export function buildRecommendationPrompt(userContext: {
  current_context: {
    location: { lat: number; lng: number; address: string; neighborhood: string }
    weather: { condition: string; temperature: number; time_of_day: string }
  }
  user_preferences: Record<string, unknown>
  pin_history: Array<{ location?: { name?: string }; note?: string }>
  refinement_context?: string
}): string {
  const { current_context, user_preferences, pin_history, refinement_context } = userContext

  const recentPinsSummary = pin_history.slice(0, 2).map(pin => {
    const pinName = pin.location?.name ?? 'Unknown Location'
    const pinNote = (pin.note ?? '').substring(0, 30)
    return `${pinName} (${pinNote})`
  }).join('; ')

  const preferencesSummary = Object.entries(user_preferences)
    .filter(([, value]) => Array.isArray(value) ? (value as unknown[]).length > 0 : value)
    .map(([key, value]) => {
      switch (key) {
        case 'cuisinePreferences': return `Cuisines: ${(value as string[]).join(', ')}`
        case 'activityTypes': return `Activities: ${(value as string[]).join(', ')}`
        case 'avoidancePreferences': return `Avoid: ${(value as string[]).join(', ')}`
        case 'discoveryStyle': return `Discovery Style: ${value}`
        case 'priceComfort': return `Price Comfort: ${value}`
        case 'socialPreference': return `Social Preference: ${value}`
        default: return ''
      }
    })
    .filter(Boolean)
    .join('; ')

  const refinementNote = refinement_context
    ? `\nUser Refinement — RANKED FIRST, HIGH PRIORITY:\nThe user has explicitly requested: ${refinement_context}\nInstructions: (1) Place all venues matching the requested types at the TOP of the recommendations list. (2) Assign matching venues an ai_confidence of 0.85 or higher regardless of profile fit. (3) Fill remaining slots with contextually appropriate alternatives. Do not let profile preferences override this refinement.`
    : ''

  return `Current Context:
Location: ${current_context.location?.address ?? 'Unknown Location'}
Weather: ${current_context.weather?.condition ?? 'Clear'}, ${current_context.weather?.temperature ?? '20'}°C
Time: ${current_context.weather?.time_of_day ?? 'Unknown'}

User History and Preferences:
Recent Pins: ${recentPinsSummary || 'None'}
Preferences: ${preferencesSummary || 'None'}
${refinementNote}
Generate a variety of recommendations based on the provided context and preferences.`
}
