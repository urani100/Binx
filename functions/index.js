

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const express = require('express');
const cors = require('cors');
const https = require('https');
const Anthropic = require('@anthropic-ai/sdk');
const { BINX_SYSTEM_PROMPT, buildRecommendationPrompt } = require('./binx-prompts'); 

// Define secrets
const weatherApiKey = defineSecret('WEATHER_API_KEY');
const googleMapsApiKey = defineSecret('GOOGLE_MAPS_API_KEY');
const claudeApiKey = defineSecret('CLAUDE_API_KEY');

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5000',
    'http://localhost:5001',
    'http://localhost:5002',
    'http://localhost:5173',
    'https://binx-3a213.web.app',
    'https://binx-3a213.firebaseapp.com'
  ],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({
    message: 'Firebase Functions v2 is working!',
    timestamp: new Date().toISOString(),
    region: 'us-east1'
  });
});

// Claude test endpoint
app.get('/test-claude', async (req, res) => {
  console.log('Claude test endpoint called');

  try {
    const apiKey = claudeApiKey.value();

    if (!apiKey) {
      console.error('Claude API key not found');
      return res.status(500).json({ error: 'Claude API key not configured' });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 20,
      messages: [{ role: "user", content: "Hi Claude." }]
    });

    console.log('Claude API response received successfully');
    res.json({
      success: true,
      message: 'Claude integration working',
      claude_response: message.content[0].text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Claude API test failed:', error);
    res.status(500).json({
      error: 'Claude API test failed',
      details: error.message
    });
  }
});


// BiNx AI Recommendations endpoint - PRODUCTION
// FIXED BiNx AI Recommendations endpoint - Updated for functions/index.js
// Replace the existing app.post('/recommendations', ...) with this fixed version

app.post('/recommendations', async (req, res) => {
  console.log('Recommendations endpoint called');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  const startTime = Date.now();

  try {
    const {
      current_location,
      user_id,
      weather_data,
      user_preferences = {},
      pin_history = [],
      data_quality = {},
      cache_key
    } = req.body;

    // Enhanced validation
    if (!current_location || !current_location.lat || !current_location.lng) {
      console.error('Missing current_location with lat/lng');
      return res.status(400).json({
        error: 'Missing required field: current_location with lat/lng'
      });
    }
    
    if (!user_id) {
      console.error('Missing user_id');
      return res.status(400).json({
        error: 'Missing required field: user_id'
      });
    }
    
    // Validate coordinates
    const lat = parseFloat(current_location.lat);
    const lng = parseFloat(current_location.lng);

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      console.error('Invalid coordinates:', { lat, lng });
      return res.status(400).json({
        error: `Invalid coordinates: lat=${lat}, lng=${lng}`
      });
    }

    // Access Claude API key
    const apiKey = claudeApiKey.value();
    if (!apiKey) {
      console.error('Claude API key not found');
      return res.status(500).json({ error: 'Claude API key not configured' });
    }

    // **NEW: Transform frontend data structure to match binx-prompts expectations**
    const userContext = transformToUserContext({
      current_location,
      weather_data,
      user_preferences,
      pin_history,
      data_quality
    });

    console.log('Transformed user context:', JSON.stringify(userContext, null, 2));

    // Build the prompt using the existing function
    const prompt = buildRecommendationPrompt(userContext);
    console.log('Generated prompt:', prompt);

    // Create Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Set up timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Claude API timeout')), 100000)
    );

    // Make Claude API call
    const claudePromise = anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      temperature: 0.7,
      system: BINX_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    console.log('Calling Claude API...');
    const response = await Promise.race([claudePromise, timeoutPromise]);
    console.log('Claude API response received');

    // Parse Claude's response
    const claudeContent = response.content[0].text;
    console.log('Claude response content:', claudeContent);

    let recommendations;
    try {
      // Try to parse as JSON first
      recommendations = JSON.parse(claudeContent);
    } catch (parseError) {
      console.log('Claude response is not JSON, parsing as text...');
      // If not JSON, parse the text format
      recommendations = parseTextRecommendations(claudeContent);
    }

    // Validate recommendations format
    if (!recommendations || !Array.isArray(recommendations.recommendations)) {
      console.error('Invalid recommendations format:', recommendations);
      throw new Error('Generated recommendations could not be processed. Please try again.');
    }

    // **NEW: Enrich recommendations with Google Places data (optional enhancement)**
    const enrichedRecommendations = await enrichRecommendationsWithPlaces(
      recommendations.recommendations, 
      { lat, lng },
      googleMapsApiKey.value()
    );

    const processingTime = Date.now() - startTime;
    console.log(`Recommendations generated successfully in ${processingTime}ms`);

    // Return successful response
    res.json({
      success: true,
      data: {
        recommendations: enrichedRecommendations,
        cache_key: cache_key || generateCacheKey(userContext),
        processing_time: processingTime,
        data_quality: data_quality
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recommendation generation failed:', error);
    console.error('Error stack:', error.stack);
    
    // Enhanced error handling
    if (error.message.includes('timeout')) {
      return res.status(504).json({ 
        error: 'Claude API request timeout',
        message: 'The recommendation service is taking longer than expected. Please try again.'
      });
    }
    
    if (error.message.includes('usage limit')) {
      return res.status(429).json({ 
        error: 'Monthly usage limit exceeded',
        message: 'The recommendation service has reached its usage limit. Please try again later.'
      });
    }

    if (error.message.includes('could not be processed')) {
      return res.status(500).json({
        error: 'Generated recommendations could not be processed. Please try again.',
        message: 'The AI service returned an unexpected format. Please try again.'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate recommendations: ' + error.message,
      message: 'An unexpected error occurred while generating recommendations.'
    });
  }
});

// **NEW: Helper function to transform frontend data to backend expected format**
function transformToUserContext({
  current_location,
  weather_data = {},
  user_preferences = {},
  pin_history = [],
  data_quality = {}
}) {
  // Determine current time of day
  const now = new Date();
  const hour = now.getHours();
  let time_of_day;
  if (hour >= 5 && hour < 12) time_of_day = 'morning';
  else if (hour >= 12 && hour < 17) time_of_day = 'afternoon';
  else if (hour >= 17 && hour < 21) time_of_day = 'evening';
  else time_of_day = 'night';

  // Transform to expected structure
  return {
    current_context: {
      location: {
        lat: current_location.lat,
        lng: current_location.lng,
        address: current_location.address || `${current_location.lat}, ${current_location.lng}`,
        neighborhood: current_location.neighborhood || 'Unknown area'
      },
      weather: {
        condition: weather_data.condition || 'Clear',
        temperature: weather_data.temperature ?? 20,
        time_of_day: time_of_day,
        hasRealWeather: data_quality.weather_accuracy === 'real'
      },
      // Map user preferences to a general mood/style
      current_mood: determineMoodFromPreferences(user_preferences),
      timestamp: new Date().toISOString()
    },
    user_preferences: {
      // Transform enhanced preferences to simple arrays expected by prompt
      favorite_places: [
        ...(user_preferences.cuisinePreferences || []),
        ...(user_preferences.activityTypes || [])
      ].slice(0, 5), // Limit to top 5 to save tokens
      
      avoid_places: user_preferences.avoidancePreferences || [],
      
      // Include other relevant preferences
      price_comfort: user_preferences.priceComfort || 'mid-range',
      discovery_style: user_preferences.discoveryStyle || 'hidden-gems',
      social_preference: user_preferences.socialPreference || 'intimate-pairs',
      aesthetic_preferences: user_preferences.aestheticPreferences || [],
      
      // Include profile completeness info
      profile_completeness: data_quality.profile_completeness || 'basic'
    },
    pin_history: pin_history
  };
}

// **NEW: Helper to determine mood from user preferences**
function determineMoodFromPreferences(preferences) {
  // Use discovery style or activity types to infer mood
  if (preferences.discoveryStyle === 'hidden-gems') return 'Contemplative';
  if (preferences.discoveryStyle === 'popular-spots') return 'Social';
  if (preferences.discoveryStyle === 'trending-new') return 'Adventurous';
  
  // Use activity types
  const activities = preferences.activityTypes || [];
  if (activities.includes('cultural')) return 'Contemplative';
  if (activities.includes('nightlife')) return 'Social';
  if (activities.includes('outdoors')) return 'Energetic';
  if (activities.includes('wellness')) return 'Peaceful';
  
  // Default mood
  return 'Curious';
}

// **NEW: Helper to extract mood from pin data**
function extractMoodFromPin(pin) {
  // If pin has explicit mood, use it
  if (pin.mood) return pin.mood;
  
  // Try to infer from note
  const note = (pin.note || '').toLowerCase();
  if (note.includes('peaceful') || note.includes('calm')) return 'Peaceful';
  if (note.includes('fun') || note.includes('social')) return 'Social';
  if (note.includes('inspired') || note.includes('creative')) return 'Creative';
  if (note.includes('energetic') || note.includes('active')) return 'Energetic';
  
  // Default
  return 'Contemplative';
}

// **NEW: Helper to parse text-based recommendations from Claude**
function parseTextRecommendations(text) {
  try {
    // Look for JSON within the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no JSON found, create structured response from text
    const lines = text.split('\n').filter(line => line.trim());
    const recommendations = [];
    
    let currentRec = null;
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for recommendation names (often numbered or bulleted)
      if (trimmed.match(/^\d+\.|\*\*|^-/) && trimmed.length > 10) {
        if (currentRec) recommendations.push(currentRec);
        
        currentRec = {
          name: trimmed.replace(/^\d+\.\s*|\*\*|\s*-\s*/, '').split(':')[0].trim(),
          description: trimmed.includes(':') ? trimmed.split(':').slice(1).join(':').trim() : 'A recommended location for you',
          category: 'Local Spot',
          address: 'Address not specified'
        };
      } else if (currentRec && trimmed.length > 20) {
        // Add additional description
        currentRec.description += ' ' + trimmed;
      }
    }
    
    if (currentRec) recommendations.push(currentRec);
    
    return { recommendations };
  } catch (error) {
    console.error('Failed to parse text recommendations:', error);
    throw new Error('Could not parse recommendation response');
  }
}

// **NEW: Optional enhancement - enrich with Google Places data**
async function enrichRecommendationsWithPlaces(recommendations, location, mapsApiKey) {
  if (!mapsApiKey) {
    console.log('No Google Maps API key, skipping enrichment');
    return recommendations;
  }

  const enrichedResults = [];
  
  for (const recommendation of recommendations) {
    try {
      // Simple enrichment - try to find the place
      const query = `${recommendation.name} near ${location.lat},${location.lng}`;
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${mapsApiKey}`;
      
      // Note: In production, you'd want to use the Node.js HTTPS module like in your other endpoints
      // For now, we'll just return the original recommendation with potential address enhancement
      
      enrichedResults.push({
        ...recommendation,
        placeId: null, // Would be populated if Places API call succeeds
        aiScore: recommendation.confidence || 0.8
      });
    } catch (error) {
      console.error('Places enrichment error for', recommendation.name, ':', error);
      // Keep recommendation without enrichment
      enrichedResults.push({
        ...recommendation,
        placeId: null,
        aiScore: recommendation.confidence || 0.8
      });
    }
  }
  
  return enrichedResults;
}

// **NEW: Generate cache key for caching recommendations**
function generateCacheKey(userContext) {
  const { current_context } = userContext;
  const locationKey = `${current_context.location.lat.toFixed(3)},${current_context.location.lng.toFixed(3)}`;
  const timeKey = current_context.weather.time_of_day;
  const weatherKey = current_context.weather.condition;
  
  return `${locationKey}-${timeKey}-${weatherKey}`;
}

function determineTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 6) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

const enrichWithGooglePlaces = async (recommendations) => {
  const apiKey = googleMapsApiKey.value();
  const weatherApiKeyValue = weatherApiKey.value();
  const enrichedResults = [];

  for (const recommendation of recommendations) {
    try {
      const query = `${recommendation.name} ${recommendation.address}`;
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

      const placesResponse = await new Promise((resolve, reject) => {
        const request = https.get(placesUrl, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (parseError) {
              reject(parseError);
            }
          });
        });
        request.on('error', reject);
        request.setTimeout(5000, () => {
          request.destroy();
          reject(new Error('Places API timeout'));
        });
      });

      let venueWeather = null;
      let place = null;

      if (placesResponse.results && placesResponse.results.length > 0) {
        place = placesResponse.results[0];

        if (place.geometry && place.geometry.location) {
          const venueLat = place.geometry.location.lat;
          const venueLng = place.geometry.location.lng;

          try {
            const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${weatherApiKeyValue}&q=${venueLat},${venueLng}`;

            const weatherResponse = await new Promise((resolve, reject) => {
              const request = https.get(weatherUrl, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                  try {
                    resolve(JSON.parse(data));
                  } catch (parseError) {
                    reject(parseError);
                  }
                });
              });
              request.on('error', reject);
              request.setTimeout(5000, () => {
                request.destroy();
                reject(new Error('Weather API timeout'));
              });
            });

            if (weatherResponse && weatherResponse.current) {
              venueWeather = {
                condition: weatherResponse.current.condition.text,
                temperature: Math.round(weatherResponse.current.temp_c),
                icon: weatherResponse.current.condition.icon
              };
            }
          } catch (weatherError) {
            console.warn('Weather fetch failed for venue:', recommendation.name);
          }
        }
      }

      enrichedResults.push({
        ...recommendation,
        venueWeather: venueWeather
      });

    } catch (error) {
      console.error('Enrichment error for', recommendation.name, ':', error);
      enrichedResults.push({
        ...recommendation,
        venueWeather: null
      });
    }
  }

  return enrichedResults;
};

// Weather API endpoint
app.get('/weather', (req, res) => {
  console.log('Weather endpoint called with query:', req.query);

  const { lat, lng } = req.query;

  if (!lat || !lng) {
    console.error('Missing lat or lng parameters');
    return res.status(400).json({ error: 'Missing lat or lng parameters' });
  }

  const apiKey = weatherApiKey.value();

  if (!apiKey) {
    console.error('Weather API key not found');
    return res.status(500).json({ error: 'Weather API key not configured' });
  }

  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lng}`;
  console.log('Making request to weather API for coordinates:', lat, lng);

  const request = https.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      console.log('Weather API response received');
      try {
        const weatherData = JSON.parse(data);

        if (weatherData.error) {
          console.error('Weather API error:', weatherData.error);
          return res.status(400).json({ error: weatherData.error.message });
        }

        res.json(weatherData);
      } catch (error) {
        console.error('Failed to parse weather data:', error);
        res.status(500).json({ error: 'Failed to parse weather data' });
      }
    });
  });

  request.on('error', (error) => {
    console.error('Weather API request error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data: ' + error.message });
  });

  request.setTimeout(10000, () => {
    request.destroy();
    console.error('Weather API request timeout');
    res.status(504).json({ error: 'Weather API request timeout' });
  });
});

// Geocoding API endpoint
app.get('/geocode', (req, res) => {
  console.log('Geocoding endpoint called with query:', req.query);

  // const { lat, lng } = req.query;
  const { address, lat, lng } = req.query;

  if (address) {
    // Forward geocoding path - address to coordinates
    console.log('Forward geocoding requested for address:', address);
  } else if (lat && lng) {
    // Existing reverse geocoding path - coordinates to address  
    console.log('Reverse geocoding requested for coordinates:', lat, lng);
  } else {
    console.error('Missing required parameters: need either address OR lat/lng');
    return res.status(400).json({ error: 'Missing required parameters: provide either address OR lat/lng' });
  }

  const apiKey = googleMapsApiKey.value();

  if (!apiKey) {
    console.error('Google Maps API key not found');
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }

  const url = address 
  ? `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
  : `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  
  console.log('Making request to Google Geocoding API:', address ? `address: ${address}` : `coordinates: ${lat}, ${lng}`);

  const request = https.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      console.log('Geocoding API response received');
      try {
        const geocodeData = JSON.parse(data);

        if (geocodeData.error_message) {
          console.error('Geocoding API error:', geocodeData.error_message);
          return res.status(400).json({ error: geocodeData.error_message });
        }

        res.json(geocodeData);
      } catch (error) {
        console.error('Failed to parse geocoding data:', error);
        res.status(500).json({ error: 'Failed to parse geocoding data' });
      }
    });
  });

  request.on('error', (error) => {
    console.error('Geocoding API request error:', error);
    res.status(500).json({ error: 'Failed to fetch geocoding data: ' + error.message });
  });

  request.setTimeout(10000, () => {
    request.destroy();
    console.error('Geocoding API request timeout');
    res.status(504).json({ error: 'Geocoding API request timeout' });
  });
});

exports.api = onRequest(
  {
    region: 'us-east1',
    secrets: [weatherApiKey, googleMapsApiKey, claudeApiKey]
  },
  app
);