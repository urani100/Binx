/**
 * REVISED BiNx AI Recommendation System Prompts
 * Purpose: A more general approach to prompts for the Claude AI.
 * Changes:
 * - Removed all references to 'mood' for a general-purpose recommendation system.
 */

/**
 * The system prompt provides the high-level instructions to the AI.
 * It is now more general, focusing on a broader "vibe."
 * Last updated 08-15-25
 */
//  const BINX_SYSTEM_PROMPT = `Generate 7-10 location recommendations matching user's context. Focus on places that offer a unique or high-quality experience.
 const BINX_SYSTEM_PROMPT = `Generate 7-10 location recommendations matching user's context.

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
 
 RULES: Real places only.`;


/**
 * The prompt builder takes user data and constructs a prompt for the AI.
 * It has been updated to remove all mood-based context and to be more efficient.
 * @param {object} userContext - The user's context object containing current_context, user_preferences, and pin_history.
 * @returns {string} The formatted prompt string for the AI.
 */
const buildRecommendationPrompt = (userContext) => {
  const { current_context, user_preferences, pin_history } = userContext;

  // Use a more descriptive summary of recent pins with safer property access
  const recentPinsSummary = pin_history.slice(0, 2).map(pin => {
    const pinName = pin.location?.name ?? 'Unknown Location';
    const pinNote = (pin.note ?? '').substring(0, 30);
    return `${pinName} (${pinNote})`;
  }).join('; ');

  // Create a single preferences block
  const preferencesSummary = Object.entries(user_preferences)
    .filter(([key, value]) => Array.isArray(value) ? value.length > 0 : value)
    .map(([key, value]) => {
      let label = '';
      let content = '';

      switch (key) {
        case 'cuisinePreferences':
          label = 'Cuisines';
          content = value.join(', ');
          break;
        case 'activityTypes':
          label = 'Activities';
          content = value.join(', ');
          break;
        case 'avoidancePreferences':
          label = 'Avoid';
          content = value.join(', ');
          break;
        case 'discoveryStyle':
          label = 'Discovery Style';
          content = value;
          break;
        case 'priceComfort':
          label = 'Price Comfort';
          content = value;
          break;
        case 'socialPreference':
          label = 'Social Preference';
          content = value;
          break;
        default:
          return '';
      }
      return `${label}: ${content}`;
    })
    .filter(Boolean)
    .join('; ');


  return `Current Context:
Location: ${current_context.location?.address ?? 'Unknown Location'}
Weather: ${current_context.weather?.condition ?? 'Clear'}, ${current_context.weather?.temperature ?? '20'}°C
Time: ${current_context.weather?.time_of_day ?? 'Unknown'}

User History and Preferences:
Recent Pins: ${recentPinsSummary || 'None'}
Preferences: ${preferencesSummary || 'None'}

Generate a variety of recommendations based on the provided context and preferences.`;
};


module.exports = {
  BINX_SYSTEM_PROMPT,
  buildRecommendationPrompt,
};