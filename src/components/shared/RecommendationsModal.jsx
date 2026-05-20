import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from '../../hooks/useLocation'
import { usePins } from '../../hooks/usePins'
import { useUIStore } from '../../store/uiStore'
import { useLocationStore } from '../../store/locationStore'
import { LoadingSpinner } from '../ui'
import { API_ENDPOINTS } from '../../utils/constants'
import { edgeFunctionHeaders } from '../../services/supabase'
import { getCurrentTimeOfDay } from '../../utils/helpers'
import RecommendationCard from './RecommendationCard'
import RefineSearchModal from './RefineSearchModal'
import SavedLocationsModal from './SavedLocationsModal'

const REC_CATEGORY_OPTIONS = [
  'restaurant', 'café', 'bar', 'cocktail-bar',
  'museum', 'gallery', 'park', 'bookshop',
  'market', 'live-music', 'rooftop', 'bakery',
  'spa', 'cinema', 'jazz-club', 'wine-bar',
  'gelateria', 'late-night'
]
const REC_PRICE_OPTIONS = [1, 2, 3, 4]

const buildRefinementContext = (filters) => {
  const parts = []
  if (filters.types?.length) parts.push(`Venue types: ${filters.types.join(', ')}`)
  if (filters.prices?.length) parts.push(`Price levels: ${filters.prices.map(p => '$'.repeat(p)).join(', ')}`)
  if (filters.radius) parts.push(`Maximum distance: ${filters.radius < 1000 ? `${filters.radius}m` : `${filters.radius / 1000}km`}`)
  return parts.join('. ')
}

const RecommendationsModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth()
  const { userLocation, loading: locationLoading } = useLocation()
  const { pins } = usePins()

  const currentScrollRef = useRef(null)

  const recommendationsModal = useUIStore(state => state.recommendationsModal)
  const showMessage = useUIStore(state => state.showMessageModal)
  const setRecommendationsLoading = useUIStore(state => state.setRecommendationsLoading)
  const setRecommendationsError = useUIStore(state => state.setRecommendationsError)
  const setCurrentRecommendations = useUIStore(state => state.setCurrentRecommendations)
  const addToSavedRecommendations = useUIStore(state => state.addToSavedRecommendations)
  const removeFromSavedRecommendations = useUIStore(state => state.removeFromSavedRecommendations)
  const clearRecommendations = useUIStore(state => state.clearRecommendations)
  const setSessionId = useUIStore(state => state.setSessionId)
  const setCurrentSessionPlaces = useUIStore(state => state.setCurrentSessionPlaces)
  const incrementInteractionCount = useUIStore(state => state.incrementInteractionCount)
  const resetSession = useUIStore(state => state.resetSession)

  const [dataValidation, setDataValidation] = useState({
    locationReady: false,
    userReady: false,
    weatherReady: false,
    allReady: false
  })
  const [showRefine, setShowRefine] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [activeFilters, setActiveFilters] = useState(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const validation = validateDataReadiness()
    setDataValidation(validation)
    if (
      validation.allReady &&
      !recommendationsModal.loading &&
      recommendationsModal.currentRecommendations.length === 0
    ) {
      generateRecommendations()
    }
  }, [isOpen, user, userLocation, locationLoading, recommendationsModal.loading, recommendationsModal.currentRecommendations.length])

  const validateDataReadiness = () => {
    const userReady = !!(user?.id && user?.profile)
    const locationReady = !!(userLocation?.lat && userLocation?.lng && !locationLoading)
    const weatherReady = !!(userLocation?.condition && userLocation?.temperature !== undefined)
    return { userReady, locationReady, weatherReady, allReady: userReady && locationReady }
  }

  const generateRecommendations = async ({ filtersOverride = null, excluded_places = [] } = {}) => {
    const filtersToUse = filtersOverride !== null ? filtersOverride : activeFilters
    const validation = validateDataReadiness()

    if (!validation.allReady) {
      if (!validation.locationReady && !locationLoading) {
        try { await useLocationStore.getState().refreshLocation() } catch (_) {}
      }
      const retry = validateDataReadiness()
      if (!retry.allReady) {
        setRecommendationsError(
          !retry.userReady
            ? 'User profile is still loading. Please wait a moment and try again.'
            : 'Location data is not available. Please ensure location access is enabled.'
        )
        return
      }
    }

    setRecommendationsLoading(true)
    setRecommendationsError(null)

    try {
      const lat = Number(userLocation.lat)
      const lng = Number(userLocation.lng)
      if (isNaN(lat) || isNaN(lng)) throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`)

      // Step 1: get taste summary
      const tasteRes = await fetch(API_ENDPOINTS.COMPUTE_TASTE_SUMMARY, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({ user_id: user.id })
      })

      let tasteData = { taste_summary: '', identity_narrative: '', vibe_narrative: '', is_cold_start: true }
      if (tasteRes.ok) {
        const tasteJson = await tasteRes.json()
        if (tasteJson.success) tasteData = tasteJson.data
      }

      // Step 2: get recommendations
      const requestData = {
        current_location: {
          lat,
          lng,
          address: userLocation.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          neighborhood: userLocation.locality || userLocation.displayLocation || 'Unknown area'
        },
        user_id: user.id,
        weather_data: {
          condition: userLocation.condition || 'Clear',
          temperature: userLocation.temperature ?? 20,
          is_real: !!(userLocation.condition && userLocation.temperature !== undefined)
        },
        taste_summary:      tasteData.taste_summary,
        identity_narrative: tasteData.identity_narrative,
        vibe_narrative:     tasteData.vibe_narrative,
        is_cold_start:      tasteData.is_cold_start,
        excluded_places:    Array.isArray(excluded_places) ? excluded_places : [],
        ...(filtersToUse && { refinement_context: buildRefinementContext(filtersToUse) })
      }

      const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify(requestData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data.recommendations) {
        const recommendations = data.data.recommendations
        const sessionId = data.data.session_id

        setCurrentRecommendations(recommendations, null)
        setSessionId(sessionId)
        setCurrentSessionPlaces(
          recommendations.map(r => ({
            name: r.name,
            category: r.category,
            address: r.address,
            ai_confidence: r.ai_confidence,
            lat: r.lat ?? null,
            lng: r.lng ?? null
          }))
        )

        // Step 3: persist session to DB (fire-and-forget)
        fetch(API_ENDPOINTS.RECOMMENDATION_SESSION, {
          method: 'POST',
          headers: edgeFunctionHeaders,
          body: JSON.stringify({
            user_id: user.id,
            session_id: sessionId,
            places: recommendations.map(r => ({
              name: r.name,
              category: r.category,
              address: r.address,
              ai_confidence: r.ai_confidence,
              lat: r.lat ?? null,
              lng: r.lng ?? null
            }))
          })
        }).catch(console.error)

      } else {
        throw new Error('Invalid API response format')
      }

    } catch (error) {
      setRecommendationsError(`Failed to generate recommendations: ${error.message}`)
    } finally {
      setRecommendationsLoading(false)
    }
  }

  const writeFeedback = (recommendation, actionType) => {
    incrementInteractionCount()
    fetch(API_ENDPOINTS.UPDATE_TASTE_PROFILE, {
      method: 'POST',
      headers: edgeFunctionHeaders,
      body: JSON.stringify({
        user_id: user.id,
        action: actionType,
        category: recommendation.category ?? null,
        session_id: recommendationsModal.sessionId ?? null,
        place_name: recommendation.name,
        ai_confidence: recommendation.ai_confidence ?? null,
        distance_km: recommendation.distance_km ?? null,
        time_of_day: getCurrentTimeOfDay(),
        weather_condition: userLocation?.condition ?? null
      })
    }).catch(console.error)
  }

  const handleSaveRecommendation = async (recommendation) => {
    const alreadySaved = savedRecommendations.find(r => r.name === recommendation.name)
    if (alreadySaved) return
    const savedRec = { ...recommendation, saved_at: new Date().toISOString(), original_cache_key: recommendationsModal.cacheKey }
    const updatedSaved = [...savedRecommendations, savedRec]
    addToSavedRecommendations(recommendation)
    await updateProfile({ savedLocations: updatedSaved })
    showMessage('Saved', `${recommendation.name} added to your saved recommendations`)
  }

  const handleRemoveSaved = async (recommendationName) => {
    const updatedSaved = savedRecommendations.filter(r => r.name !== recommendationName)
    removeFromSavedRecommendations(recommendationName)
    await updateProfile({ savedLocations: updatedSaved })
    showMessage('Removed', 'Recommendation removed from saved list')
  }

  const handleGetDirections = (recommendation) => {
    writeFeedback(recommendation, 'directions')
    const address = encodeURIComponent(recommendation.address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
  }

  const handleRefresh = () => {
    const { currentRecommendations, sessionId, interactionCount, currentSessionPlaces } = recommendationsModal

    // Batch dismiss all places that received zero interactions in this session
    if (sessionId && currentRecommendations.length > 0 && interactionCount === 0) {
      fetch(API_ENDPOINTS.UPDATE_TASTE_PROFILE, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({
          user_id: user.id,
          action: 'batch_dismissed',
          session_id: sessionId,
          time_of_day: getCurrentTimeOfDay(),
          weather_condition: userLocation?.condition ?? null,
          items: currentSessionPlaces.map(p => ({ place_name: p.name, category: p.category }))
        })
      }).catch(console.error)
    }

    // Build exclusion list from the old session's place names
    const excluded = currentRecommendations.map(r => r.name)

    // Reset session state and fetch fresh recommendations
    clearRecommendations()
    resetSession()
    generateRecommendations({ excluded_places: excluded })
  }

  if (!isOpen) return null

  const { currentRecommendations, savedRecommendations, loading, error } = recommendationsModal

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handleRefresh}
              className="text-customPurpleText transition-colors"
              aria-label="Refresh recommendations"
              disabled={loading}
            >
              {loading
                ? <i className="fas fa-spinner fa-spin text-base"></i>
                : <i className="fas fa-sync-alt text-base"></i>
              }
            </button>
            <h3 className="text-xl font-semibold text-customPurpleText pl-6">Recommendations</h3>
            <button
              onClick={onClose}
              className="text-customPurpleText transition-colors"
              aria-label="Close recommendations"
            >
              ✕
            </button>
          </div>

          {/* Refine button */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setShowRefine(true)}
              className="py-3 px-6 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90"
            >
              Refine Recommendations
            </button>
            {activeFilters && (
              <button
                onClick={() => {
                  setActiveFilters(null)
                  clearRecommendations()
                  resetSession()
                  generateRecommendations()
                }}
                className="text-customPurpleText font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Data readiness indicator */}
          {!dataValidation.allReady && !error && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm font-medium text-blue-800">Preparing recommendations...</span>
              </div>
              <div className="text-xs text-blue-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <i className={`fas ${dataValidation.userReady ? 'fa-check text-green-500' : 'fa-clock text-blue-500'}`}></i>
                  <span>User profile</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className={`fas ${dataValidation.locationReady ? 'fa-check text-green-500' : 'fa-clock text-blue-500'}`}></i>
                  <span>Location data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className={`fas ${dataValidation.weatherReady ? 'fa-check text-green-500' : 'fa-clock text-orange-500'}`}></i>
                  <span>Weather data (optional)</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <p className="text-customPurpleText font-medium">Hang Tight...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-red-600"></i>
              </div>
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={() => { clearRecommendations(); resetSession(); generateRecommendations() }}
                className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && currentRecommendations.length === 0 && dataValidation.allReady && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-compass text-gray-400"></i>
              </div>
              <p className="text-gray-500 text-sm mb-4">No recommendations yet</p>
              <button
                onClick={() => generateRecommendations()}
                className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              >
                Generate Recommendations
              </button>
            </div>
          )}

          {/* Current Recommendations */}
          {currentRecommendations.length > 0 && (
            <div className="mb-6">
              {activeFilters?.types?.length > 0 && (() => {
                const selectedTypes = activeFilters.types.map(t => t.toLowerCase())
                const hasMatch = currentRecommendations.some(rec => {
                  const haystack = [rec.category, ...(rec.tags || [])].join(' ').toLowerCase()
                  return selectedTypes.some(t => haystack.includes(t))
                })
                return !hasMatch ? (
                  <div className="mb-4 p-3 bg-customBackground rounded-xl">
                    <p className="text-sm text-customPurpleText">
                      No <span className="font-medium">{activeFilters.types.join(', ')}</span> found nearby. Showing the best alternatives in your area.
                    </p>
                  </div>
                ) : null
              })()}

              <div className="overflow-y-auto scroll-smooth">
                <div className="flex flex-col gap-4" ref={currentScrollRef}>
                  {currentRecommendations.map((rec, index) => (
                    <RecommendationCard
                      key={index}
                      recommendation={rec}
                      onSave={() => handleSaveRecommendation(rec)}
                      onDirections={() => handleGetDirections(rec)}
                      onLike={() => writeFeedback(rec, 'like')}
                      onDismiss={() => writeFeedback(rec, 'dismiss')}
                      isSaved={savedRecommendations.some(saved => saved.name === rec.name)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Saved Locations button */}
          {savedRecommendations.length > 0 && (
            <div className="flex items-center justify-center mb-6">
              <button
                onClick={() => setShowSaved(true)}
                className="py-3 px-6 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90"
              >
                Saved Locations
              </button>
            </div>
          )}
        </div>
      </div>

      {showSaved && (
        <SavedLocationsModal
          isOpen={showSaved}
          onClose={() => setShowSaved(false)}
        />
      )}

      {showRefine && (
        <RefineSearchModal
          onClose={() => setShowRefine(false)}
          initial={activeFilters || {}}
          categoryOptions={REC_CATEGORY_OPTIONS}
          priceOptions={REC_PRICE_OPTIONS}
          onApply={(filters) => {
            setActiveFilters(filters)
            setShowRefine(false)
            clearRecommendations()
            resetSession()
            generateRecommendations({ filtersOverride: filters })
          }}
        />
      )}
    </>
  )
}

RecommendationsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default RecommendationsModal
