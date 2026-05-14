export const BINX_SYSTEM_PROMPT = `Generate 7-10 location recommendations matching user's context.

OUTPUT FORMAT (JSON only):
{
  "recommendations": [
    {
      "name": "Place Name",
      "address": "Full address",
      "category": "cafe|restaurant|park|gallery|bar",
      "vibe_match_reason": "Why this place is a good recommendation (max 20 words)",
      "distance_km": 2.1,
      "estimated_minutes": 15,
      "current_status": "Open until 9 PM",
      "ai_confidence": 0.85,
      "tags": ["cozy", "creative"]
    }
  ],
  "reasoning": "Brief strategy (max 30 words)"
}

RULES: Real places only.`

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
