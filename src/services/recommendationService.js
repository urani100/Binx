import { useUIStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useLocationStore } from '../store/locationStore'
import { edgeFunctionHeaders } from './supabase'
import { API_ENDPOINTS } from '../utils/constants'
import { getCurrentTimeOfDay } from '../utils/helpers'

const RATE_LIMIT_MS = 5000
const INITIAL_BUFFER_SIZE = 3
const REQUEST_TIMEOUT_MS = 32000

let activeController = null
let lastGenerateTime = 0
const tasteCache = { data: null, signalCount: null, userId: null }

export function invalidateCache() {
  tasteCache.data = null
  tasteCache.signalCount = null
  tasteCache.userId = null
}

export function abort() {
  if (activeController) {
    activeController.abort()
    activeController = null
  }
  useUIStore.getState().setRecommendationsLoading(false)
}

function buildRefinementContext(filters) {
  const parts = []
  if (filters.types?.length) parts.push(`Venue types: ${filters.types.join(', ')}`)
  if (filters.prices?.length) parts.push(`Price levels: ${filters.prices.map(p => '$'.repeat(p)).join(', ')}`)
  if (filters.radius) parts.push(`Maximum distance: ${filters.radius < 1000 ? `${filters.radius}m` : `${filters.radius / 1000}km`}`)
  return parts.join('. ')
}

async function fetchTasteSummary(userId, signal) {
  const signalCount = useAuthStore.getState().user?.signal_count ?? 0

  if (
    tasteCache.data &&
    tasteCache.userId === userId &&
    tasteCache.signalCount === signalCount
  ) {
    return tasteCache.data
  }

  const res = await fetch(API_ENDPOINTS.COMPUTE_TASTE_SUMMARY, {
    method: 'POST',
    headers: edgeFunctionHeaders,
    body: JSON.stringify({ user_id: userId }),
    signal
  })

  const fallback = { taste_summary: '', identity_narrative: '', vibe_narrative: '', is_cold_start: true, avoided_categories: [] }
  if (!res.ok) return fallback

  const json = await res.json()
  if (!json.success) return fallback

  tasteCache.data = json.data
  tasteCache.userId = userId
  tasteCache.signalCount = signalCount
  return json.data
}

export async function generate({ filters = null, excludedPlaces = [] } = {}) {
  // Rate limit check first — no store mutations if blocked
  const now = Date.now()
  if (now - lastGenerateTime < RATE_LIMIT_MS) return
  lastGenerateTime = now

  // Abort any in-flight request
  if (activeController) activeController.abort()

  const controller = new AbortController()
  activeController = controller
  let isTimeout = false
  const timeoutId = setTimeout(() => {
    isTimeout = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  const store = useUIStore.getState()
  store.setRecommendationsLoading(true)
  store.setRecommendationsError(null)
  store.clearRecommendations()

  try {
    const user = useAuthStore.getState().user
    const location = useLocationStore.getState().userLocation

    if (!user?.id) throw new Error('User not authenticated')
    if (!location?.lat || !location?.lng) throw new Error('Location not available')

    const lat = Number(location.lat)
    const lng = Number(location.lng)
    if (isNaN(lat) || isNaN(lng)) throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`)

    const tasteData = await fetchTasteSummary(user.id, controller.signal)
    if (controller.signal.aborted) return

    const requestBody = {
      current_location: {
        lat,
        lng,
        address: location.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        neighborhood: location.locality || location.displayLocation || 'Unknown area'
      },
      user_id: user.id,
      weather_data: {
        condition: location.condition || 'Clear',
        temperature: location.temperature ?? 20,
        is_real: !!(location.condition && location.temperature !== undefined)
      },
      taste_summary:      tasteData.taste_summary,
      identity_narrative: tasteData.identity_narrative,
      vibe_narrative:     tasteData.vibe_narrative,
      is_cold_start:      tasteData.is_cold_start,
      avoided_categories: tasteData.avoided_categories ?? [],
      excluded_places:    Array.isArray(excludedPlaces) ? excludedPlaces : [],
      ...(filters && { refinement_context: buildRefinementContext(filters) })
    }

    const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS, {
      method: 'POST',
      headers: { ...edgeFunctionHeaders, Accept: 'application/x-ndjson' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `API error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let lineBuffer = ''
    const localBuffer = []
    let sessionId = null
    const allPlaces = []

    outer: while (true) {
      if (controller.signal.aborted) break

      const { done, value } = await reader.read()
      if (done) break

      lineBuffer += decoder.decode(value, { stream: true })
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop()

      for (const line of lines) {
        if (!line.trim()) continue
        if (controller.signal.aborted) break outer

        let event
        try { event = JSON.parse(line) } catch { continue }

        if (event.type === 'recommendation') {
          const rec = event.data
          allPlaces.push({
            name:          rec.name,
            category:      rec.category,
            address:       rec.address,
            ai_confidence: rec.ai_confidence,
            lat:           rec.lat ?? null,
            lng:           rec.lng ?? null
          })

          localBuffer.push(rec)
          if (localBuffer.length === INITIAL_BUFFER_SIZE) {
            // Flush initial buffer so first render shows 3 cards at once
            const s = useUIStore.getState()
            for (const buffered of localBuffer) s.appendRecommendation(buffered)
          } else if (localBuffer.length > INITIAL_BUFFER_SIZE) {
            useUIStore.getState().appendRecommendation(rec)
          }

        } else if (event.type === 'done') {
          sessionId = event.session_id
        } else if (event.type === 'error') {
          throw new Error(event.message)
        }
      }
    }

    if (controller.signal.aborted) return

    // Stream ended with fewer than INITIAL_BUFFER_SIZE cards (partial or short response)
    if (localBuffer.length > 0 && localBuffer.length < INITIAL_BUFFER_SIZE) {
      const s = useUIStore.getState()
      for (const buffered of localBuffer) s.appendRecommendation(buffered)
    }

    useUIStore.getState().setSessionComplete(sessionId, allPlaces)

    if (sessionId && allPlaces.length > 0) {
      const userId = useAuthStore.getState().user?.id
      fetch(API_ENDPOINTS.RECOMMENDATION_SESSION, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ user_id: userId, session_id: sessionId, places: allPlaces })
      }).catch(() => {})
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      if (isTimeout) {
        useUIStore.getState().setRecommendationsError('Request timed out. Please try again.')
      }
      return
    }
    useUIStore.getState().setRecommendationsError(`Failed to generate recommendations: ${error.message}`)
  } finally {
    clearTimeout(timeoutId)
    if (activeController === controller) activeController = null
  }
}

export async function refresh({ filters = null } = {}) {
  const { currentRecommendations, sessionId, interactionCount, currentSessionPlaces } =
    useUIStore.getState().recommendationsModal

  if (sessionId && currentRecommendations.length > 0 && interactionCount === 0) {
    const user = useAuthStore.getState().user
    const location = useLocationStore.getState().userLocation
    if (user?.id) {
      fetch(API_ENDPOINTS.UPDATE_TASTE_PROFILE, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({
          user_id:           user.id,
          action:            'batch_dismissed',
          session_id:        sessionId,
          time_of_day:       getCurrentTimeOfDay(),
          weather_condition: location?.condition ?? null,
          items:             currentSessionPlaces.map(p => ({ place_name: p.name, category: p.category }))
        })
      }).catch(() => {})
    }
  }

  const excluded = currentRecommendations.map(r => r.name)
  useUIStore.getState().resetSession()
  await generate({ filters, excludedPlaces: excluded })
}

export function writeFeedback(recommendation, actionType) {
  const user = useAuthStore.getState().user
  const location = useLocationStore.getState().userLocation
  const { sessionId } = useUIStore.getState().recommendationsModal

  fetch(API_ENDPOINTS.UPDATE_TASTE_PROFILE, {
    method: 'POST',
    headers: edgeFunctionHeaders,
    body: JSON.stringify({
      user_id:           user.id,
      action:            actionType,
      category:          recommendation.category ?? null,
      session_id:        sessionId ?? null,
      place_name:        recommendation.name,
      ai_confidence:     recommendation.ai_confidence ?? null,
      distance_km:       recommendation.distance_km ?? null,
      time_of_day:       getCurrentTimeOfDay(),
      weather_condition: location?.condition ?? null
    })
  }).catch(() => {})

  useUIStore.getState().incrementInteractionCount()

  if (['like', 'pin_created', 'directions'].includes(actionType)) {
    invalidateCache()
  }
}
