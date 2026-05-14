/**
 * RE-ARCHITECTED BiNx AI Recommendation System Prompts
 * Purpose: Geospatial-priority prompts with enhanced onboarding integration
 * Data Sources: EnhancedOnboardingModal.jsx + OnboardingModal.jsx ONLY
 * Exclusions: NO Mood, Guides, or Pin History references
 */

// RE-ARCHITECTED SYSTEM PROMPT - Geospatial Priority
const BINX_SYSTEM_PROMPT = `You are BiNx's intelligent recommendation concierge. Generate 7-10 personalized location recommendations based on user preferences and geospatial context.

PRIORITY ORDER:
1. Geospatial context (neighborhood/district characteristics)
2. Time-of-day and weather appropriateness  
3. User preference hierarchy
4. Travel mode accessibility

OUTPUT FORMAT (JSON only):
{
  "recommendations": [
    {
      "name": "Venue Name",
      "address": "Complete street address",
      "category": "cafe|restaurant|park|gallery|bar|cultural|nightlife|shopping|wellness",
      "vibe_match_reason": "Why this matches user preferences (max 25 words)",
      "distance_km": 1.2,
      "estimated_minutes": 8,
      "current_status": "Open until 10 PM",
      "ai_confidence": 0.87,
      "tags": ["cozy", "local-favorite"],
      "neighborhood_context": "Brief area description",
      "best_experienced": "Timing/approach suggestion"
    }
  ],
  "reasoning": "Strategy for these selections (max 40 words)"
}

STRICT REQUIREMENTS:
- Exactly 7-10 recommendations
- Real venues only with accurate addresses
- AI confidence clamped to [0, 1] range
- All categories must use valid enum values
- Consider weather and time-of-day impact
- Prioritize walkable distances when travel_mode is walking`;

// RE-ARCHITECTED PROMPT BUILDER - Enhanced Onboarding Focus
const buildRecommendationPrompt = (userContext) => {
  const { current_context, user_preferences, enhanced_preferences } = userContext;
  
  // Build hierarchical preference string
  const preferenceHierarchy = [];
  
  // Primary preferences (Enhanced Onboarding)
  if (enhanced_preferences?.cuisinePreferences?.length) {
    preferenceHierarchy.push(`Cuisine: ${enhanced_preferences.cuisinePreferences.join(', ')}`);
  }
  if (enhanced_preferences?.activityTypes?.length) {
    preferenceHierarchy.push(`Activities: ${enhanced_preferences.activityTypes.join(', ')}`);
  }
  if (enhanced_preferences?.discoveryStyle) {
    preferenceHierarchy.push(`Discovery: ${enhanced_preferences.discoveryStyle}`);
  }
  if (enhanced_preferences?.socialPreference) {
    preferenceHierarchy.push(`Social: ${enhanced_preferences.socialPreference}`);
  }
  if (enhanced_preferences?.priceComfort) {
    preferenceHierarchy.push(`Budget: ${enhanced_preferences.priceComfort}`);
  }
  
  // Secondary preferences (Basic Onboarding)
  if (user_preferences?.favoriteVibe) {
    preferenceHierarchy.push(`Vibe: ${user_preferences.favoriteVibe}`);
  }
  if (user_preferences?.idealSunday) {
    preferenceHierarchy.push(`Sunday Style: ${user_preferences.idealSunday}`);
  }
  
  // Aesthetic preferences
  if (enhanced_preferences?.aestheticPreferences?.length) {
    preferenceHierarchy.push(`Aesthetics: ${enhanced_preferences.aestheticPreferences.join(', ')}`);
  }
  
  // Avoidance preferences
  const avoidances = enhanced_preferences?.avoidancePreferences?.length 
    ? `AVOID: ${enhanced_preferences.avoidancePreferences.join(', ')}`
    : '';

  return `LOCATION CONTEXT:
Address: ${current_context.location.address}
Neighborhood: ${current_context.location.neighborhood || 'Unknown district'}
Coordinates: ${current_context.location.lat}, ${current_context.location.lng}

TEMPORAL CONTEXT:
Time: ${current_context.weather.time_of_day}
Weather: ${current_context.weather.condition}, ${current_context.weather.temperature}°C
Day: ${current_context.day_of_week || 'Unknown'}

USER PREFERENCES (Hierarchical):
${preferenceHierarchy.join(' | ')}
${avoidances ? '\n' + avoidances : ''}

TRAVEL MODE: ${current_context.travel_mode || 'walking'}

Generate recommendations prioritizing neighborhood character and user preference hierarchy.`;
};

// ENHANCED USER CONTEXT BUILDER
const buildEnhancedUserContext = (requestData) => {
  const { currentLocation, userId, user_preferences = {}, enhanced_preferences = {} } = requestData;
  
  return {
    current_context: {
      location: {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: currentLocation.address || `${currentLocation.lat}, ${currentLocation.lng}`,
        neighborhood: currentLocation.neighborhood || extractNeighborhood(currentLocation.address)
      },
      weather: {
        condition: requestData.weather_data?.condition || 'Clear',
        temperature: requestData.weather_data?.temperature || 20,
        time_of_day: determineTimeOfDay()
      },
      day_of_week: getCurrentDayOfWeek(),
      travel_mode: requestData.travel_mode || 'walking',
      timestamp: new Date().toISOString()
    },
    user_preferences: {
      // Basic onboarding data
      alterEgo: user_preferences.alterEgo || '',
      currentResidence: user_preferences.currentResidence || '',
      occupation: user_preferences.occupation || '',
      favoriteVibe: user_preferences.favoriteVibe || '',
      idealSunday: user_preferences.idealSunday || '',
      favoriteAuthors: user_preferences.favoriteAuthors || '',
      currentlyReading: user_preferences.currentlyReading || ''
    },
    enhanced_preferences: {
      // Enhanced onboarding data (PRIMARY DATA SOURCE)
      cuisinePreferences: enhanced_preferences.cuisinePreferences || [],
      activityTypes: enhanced_preferences.activityTypes || [],
      priceComfort: enhanced_preferences.priceComfort || 'mid-range',
      discoveryStyle: enhanced_preferences.discoveryStyle || 'hidden-gems',
      socialPreference: enhanced_preferences.socialPreference || 'intimate-pairs',
      aestheticPreferences: enhanced_preferences.aestheticPreferences || [],
      avoidancePreferences: enhanced_preferences.avoidancePreferences || []
    }
  };
};

// UTILITY FUNCTIONS
const determineTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 6) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
};

const getCurrentDayOfWeek = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

const extractNeighborhood = (address) => {
  if (!address) return 'Unknown district';
  // Simple neighborhood extraction from address
  const parts = address.split(',');
  return parts.length > 1 ? parts[1].trim() : 'Unknown district';
};

// CATEGORY VALIDATION
const VALID_CATEGORIES = [
  'cafe', 'restaurant', 'park', 'gallery', 'bar', 'cultural', 
  'nightlife', 'shopping', 'wellness', 'entertainment', 'outdoor'
];

const validateAndClampRecommendations = (recommendations) => {
  if (!recommendations || !Array.isArray(recommendations)) {
    throw new Error('Invalid recommendations format');
  }
  
  return recommendations.map(rec => ({
    ...rec,
    // Clamp AI confidence to [0, 1]
    ai_confidence: Math.max(0, Math.min(1, rec.ai_confidence || 0.5)),
    // Validate category
    category: VALID_CATEGORIES.includes(rec.category) ? rec.category : 'restaurant'
  }));
};

module.exports = {
  BINX_SYSTEM_PROMPT,
  buildRecommendationPrompt,
  buildEnhancedUserContext,
  validateAndClampRecommendations,
  determineTimeOfDay,
  getCurrentDayOfWeek
};