import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from '../../hooks/useLocation'
import { usePins } from '../../hooks/usePins'
import { useUIStore } from '../../store/uiStore'
import { useLocationStore } from '../../store/locationStore'
import { LoadingSpinner } from '../ui'
import { API_ENDPOINTS } from '../../utils/constants'

const RecommendationsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth()
    const { userLocation, loading: locationLoading } = useLocation()
    const { pins } = usePins()

    const currentScrollRef = useRef(null)
    const savedScrollRef = useRef(null)

    const recommendationsModal = useUIStore(state => state.recommendationsModal)
    const showMessage = useUIStore(state => state.showMessageModal)
    const setRecommendationsLoading = useUIStore(state => state.setRecommendationsLoading)
    const setRecommendationsError = useUIStore(state => state.setRecommendationsError)
    const setCurrentRecommendations = useUIStore(state => state.setCurrentRecommendations)
    const addToSavedRecommendations = useUIStore(state => state.addToSavedRecommendations)
    const removeFromSavedRecommendations = useUIStore(state => state.removeFromSavedRecommendations)
    const clearRecommendations = useUIStore(state => state.clearRecommendations)

    const [dataValidation, setDataValidation] = useState({
        locationReady: false,
        userReady: false,
        weatherReady: false,
        allReady: false
    })

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

    // Validate data readiness and auto-generate when all required data is present
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

    const generateRecommendations = async () => {
        const validation = validateDataReadiness()

        if (!validation.allReady) {
            // Try refreshing location once before giving up
            if (!validation.locationReady && !locationLoading) {
                try {
                    await useLocationStore.getState().refreshLocation()
                } catch (_) {}
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

            const recentPins = pins.slice(-5).map(pin => ({
                location: pin.location,
                note: pin.note || '',
                timestamp: pin.timestamp
            }))

            const validation = validateDataReadiness()

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
                    weatherIcon: userLocation.weatherIcon || null,
                    hasRealWeather: validation.weatherReady
                },
                user_preferences: {
                    cuisinePreferences: user.profile.cuisinePreferences || [],
                    activityTypes: user.profile.activityTypes || [],
                    priceComfort: user.profile.priceComfort || 'mid-range',
                    discoveryStyle: user.profile.discoveryStyle || 'hidden-gems',
                    socialPreference: user.profile.socialPreference || 'intimate-pairs',
                    aestheticPreferences: user.profile.aestheticPreferences || [],
                    avoidancePreferences: user.profile.avoidancePreferences || []
                },
                pin_history: recentPins,
                data_quality: {
                    location_accuracy: validation.locationReady ? 'high' : 'low',
                    weather_accuracy: validation.weatherReady ? 'real' : 'estimated',
                    profile_completeness: user.profile.enhancedOnboardingCompleted ? 'complete' : 'basic'
                }
            }

            const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `API error: ${response.status}`)
            }

            const data = await response.json()

            if (data.success && data.data.recommendations) {
                setCurrentRecommendations(data.data.recommendations, data.data.cache_key)
            } else {
                throw new Error('Invalid API response format')
            }

        } catch (error) {
            setRecommendationsError(`Failed to generate recommendations: ${error.message}`)
        } finally {
            setRecommendationsLoading(false)
        }
    }

    const handleSaveRecommendation = (recommendation) => {
        addToSavedRecommendations(recommendation)
        showMessage('Saved', `${recommendation.name} added to your saved recommendations`)
    }

    const handleRemoveSaved = (recommendationName) => {
        removeFromSavedRecommendations(recommendationName)
        showMessage('Removed', 'Recommendation removed from saved list')
    }

    const handleGetDirections = (recommendation) => {
        const address = encodeURIComponent(recommendation.address)
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
    }

    const handleRefresh = () => {
        clearRecommendations()
        generateRecommendations()
    }

    if (!isOpen) return null

    const { currentRecommendations, savedRecommendations, loading, error } = recommendationsModal

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
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
                    <h3 className="text-xl font-semibold text-customPurpleText mb-4 pl-6">Recommendations</h3>
                    <button
                        onClick={onClose}
                        className="text-customPurpleText transition-colors"
                        aria-label="Close recommendations"
                    >
                        ✕
                    </button>
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
                        <LoadingSpinner size="lg" color="primary" text="Hang Tight, curating picks you'll love..." />
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
                            onClick={() => { clearRecommendations(); generateRecommendations() }}
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
                            onClick={generateRecommendations}
                            className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
                        >
                            Generate Recommendations
                        </button>
                    </div>
                )}

                {/* Current Recommendations */}
                {currentRecommendations.length > 0 && (
                    <div className="mb-6">
                        <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory">
                            <div className="flex gap-4 px-6" ref={currentScrollRef}>
                                {currentRecommendations.map((rec, index) => (
                                    <RecommendationCard
                                        key={index}
                                        recommendation={rec}
                                        onSave={() => handleSaveRecommendation(rec)}
                                        onDirections={() => handleGetDirections(rec)}
                                        isSaved={savedRecommendations.some(saved => saved.name === rec.name)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Saved Recommendations */}
                {savedRecommendations.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xl font-semibold text-customPurpleText mb-4 pl-6">Saved</h3>
                        <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory">
                            <div className="flex gap-4 px-6" ref={savedScrollRef}>
                                {savedRecommendations.map((rec, index) => (
                                    <RecommendationCard
                                        key={`saved-${index}`}
                                        recommendation={rec}
                                        onRemove={() => handleRemoveSaved(rec.name)}
                                        onDirections={() => handleGetDirections(rec)}
                                        isSaved={true}
                                        showSavedDate={true}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const RecommendationCard = ({ recommendation, onSave, onRemove, onDirections, isSaved, showSavedDate }) => (
    <div className="cursor-pointer rounded-xl p-4 transition-all snap-center flex-shrink-0 bg-gray-50 w-72">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-gray-900 text-sm">{recommendation.name}</h4>
            <div className="flex items-center space-x-1">
                {recommendation.ai_confidence !== undefined && (
                    <span className="text-xs text-gray-500">
                        {Math.round(recommendation.ai_confidence * 100)}%
                    </span>
                )}
                {isSaved && onRemove && (
                    <button
                        onClick={onRemove}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-customBackground text-customPurpleText transition-colors ml-2"
                        title="Remove from saved"
                    >
                        <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                )}
            </div>
        </div>

        <p className="text-xs text-gray-500 mb-2">{recommendation.address}</p>
        <p className="text-sm text-gray-700 mb-3 line-clamp-3">{recommendation.vibe_match_reason}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>
                {recommendation.estimated_minutes != null ? `${recommendation.estimated_minutes} min` : ''}
                {recommendation.distance_km != null ? ` · ${recommendation.distance_km}km` : ''}
            </span>
            <span>{recommendation.current_status}</span>
        </div>

        {showSavedDate && recommendation.saved_at && (
            <p className="text-xs text-gray-400 mb-3">
                Saved {new Date(recommendation.saved_at).toLocaleDateString()}
            </p>
        )}

        <div className="flex space-x-3">
            {!isSaved && onSave && (
                <button
                    onClick={onSave}
                    className="flex-1 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
                >
                    Save
                </button>
            )}
            <button
                onClick={onDirections}
                className="flex-1 py-3 px-4 bg-customPurpleText text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
            >
                Directions
            </button>
        </div>
    </div>
)

RecommendationsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
}

RecommendationCard.propTypes = {
    recommendation: PropTypes.object.isRequired,
    onSave: PropTypes.func,
    onRemove: PropTypes.func,
    onDirections: PropTypes.func.isRequired,
    isSaved: PropTypes.bool,
    showSavedDate: PropTypes.bool
}

export default RecommendationsModal
