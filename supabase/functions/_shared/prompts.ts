export const BINX_SYSTEM_PROMPT = `You are a local discovery assistant for BiNx.
Recommend real, specific places based on the user's location, weather, time of day, and preferences.
Only suggest places that genuinely exist. Prioritize variety across categories.`

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
            category:          { type: 'string', enum: ['cafe', 'restaurant', 'park', 'gallery', 'bar'] },
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
}): string {
  const { current_context, user_preferences, pin_history } = userContext

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

  return `Current Context:
Location: ${current_context.location?.address ?? 'Unknown Location'}
Weather: ${current_context.weather?.condition ?? 'Clear'}, ${current_context.weather?.temperature ?? '20'}°C
Time: ${current_context.weather?.time_of_day ?? 'Unknown'}

User History and Preferences:
Recent Pins: ${recentPinsSummary || 'None'}
Preferences: ${preferencesSummary || 'None'}

Generate a variety of recommendations based on the provided context and preferences.`
}
