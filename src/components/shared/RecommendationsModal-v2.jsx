/**
 * Recommendations Modal Component for BiNx React App - FIXED
 * Purpose: Display AI-generated location recommendations with proper loading validation
 * Author: ML
 * Date: August 22, 2025
 * 
 * FIXES:
 * - Added loading state validation
 * - Added data completeness checks
 * - Added proper error handling for missing data
 * - Added retry mechanisms
 */

import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from '../../hooks/useLocation'
import { usePins } from '../../hooks/usePins'
import { useUIStore } from '../../store/uiStore'
import { LoadingSpinner } from '../ui'
import { useLocationStore } from '../../store/locationStore'
import { API_ENDPOINTS } from '../../utils/constants'

/**
 * RecommendationsModal Component - Enhanced with Loading Validation
 */
const RecommendationsModal = ({ isOpen, onClose }) => {
    const { user } = useAuth()
    const { userLocation, loading: locationLoading } = useLocation()
    const { pins } = usePins()

    // Refs for scrolling behavior
    const currentScrollRef = useRef(null)
    const savedScrollRef = useRef(null)

    // Store selectors
    const recommendationsModal = useUIStore(state => state.recommendationsModal)
    const showMessage = useUIStore(state => state.showMessageModal)

    // Store actions
    const setRecommendationsLoading = useUIStore(state => state.setRecommendationsLoading)
    const setRecommendationsError = useUIStore(state => state.setRecommendationsError)
    const setCurrentRecommendations = useUIStore(state => state.setCurrentRecommendations)
    const addToSavedRecommendations = useUIStore(state => state.addToSavedRecommendations)
    const removeFromSavedRecommendations = useUIStore(state => state.removeFromSavedRecommendations)
    const clearRecommendations = useUIStore(state => state.clearRecommendations)

    // NEW: Internal state for data readiness
    const [dataValidation, setDataValidation] = useState({
        locationReady: false,
        userReady: false,
        weatherReady: false,
        allReady: false,
        retryCount: 0
    })

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && onClose) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            return () => document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = 'unset'
            }
        }
    }, [isOpen])

    // NEW: Validate data readiness whenever dependencies change
    useEffect(() => {
        if (!isOpen) return

        console.log('🔍 Validating data readiness...')
        console.log('User:', user?.id, user?.profile)
        console.log('Location:', userLocation)
        console.log('Location Loading:', locationLoading)

        const validation = validateDataReadiness()
        setDataValidation(validation)

        console.log('📊 Data validation result:', validation)

        // If all data is ready and we haven't generated recommendations yet
        if (validation.allReady && 
            !recommendationsModal.loading && 
            recommendationsModal.currentRecommendations.length === 0) {
            console.log('✅ All data ready - generating recommendations')
            generateRecommendations()
        }
    }, [
        isOpen, 
        user, 
        userLocation, 
        locationLoading, 
        recommendationsModal.loading, 
        recommendationsModal.currentRecommendations.length
    ])

    /**
     * NEW: Comprehensive data validation function
     */
    const validateDataReadiness = () => {
        // Check user data
        const userReady = !!(
            user && 
            user.id && 
            user.profile
            // Note: We don't require enhanced onboarding completion for basic recommendations
        )

        // Check location data
        const locationReady = !!(
            userLocation && 
            userLocation.lat && 
            userLocation.lng && 
            !locationLoading
        )

        // Check weather data (nice to have, but not blocking)
        const weatherReady = !!(
            userLocation && 
            userLocation.condition && 
            userLocation.temperature !== undefined
        )

        const allReady = userReady && locationReady

        return {
            locationReady,
            userReady,
            weatherReady,
            allReady,
            retryCount: dataValidation.retryCount || 0
        }
    }

    /**
     * NEW: Enhanced data waiting with retry mechanism
     */
    const ensureDataReadiness = async (maxRetries = 3) => {
        console.log('🔄 Ensuring data readiness...')
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`📍 Attempt ${attempt}/${maxRetries}`)
            
            const validation = validateDataReadiness()
            
            if (validation.allReady) {
                console.log('✅ Data ready!')
                return true
            }

            // If location is missing and not loading, try to refresh it
            if (!validation.locationReady && !locationLoading) {
                console.log('🌍 Refreshing location data...')
                try {
                    const { refreshLocation } = useLocationStore.getState()
                    await refreshLocation()
                } catch (error) {
                    console.warn('Failed to refresh location:', error)
                }
            }

            // Wait before next attempt (except on last attempt)
            if (attempt < maxRetries) {
                console.log('⏳ Waiting before retry...')
                await new Promise(resolve => setTimeout(resolve, 1500))
            }
        }

        console.log('❌ Data not ready after retries')
        return false
    }

    /**
     * Enhanced generateRecommendations with validation
     */
    const generateRecommendations = async () => {
        console.log('🚀 Starting recommendation generation...')
        
        setRecommendationsLoading(true)
        setRecommendationsError(null)

        try {
            // First, ensure we have the minimum required data
            const isDataReady = await ensureDataReadiness()
            
            if (!isDataReady) {
                throw new Error(getDataReadinessError())
            }

            // Double-check after waiting
            const validation = validateDataReadiness()
            if (!validation.allReady) {
                throw new Error(getDataReadinessError())
            }

            // Get user's recent pins for context
            const recentPins = pins.slice(-5).map(pin => ({
                location: pin.location.name,
                note: pin.note || '',
                timestamp: pin.timestamp
            }))

            // Ensure coordinates are valid numbers
            const lat = Number(userLocation.lat)
            const lng = Number(userLocation.lng)

            if (isNaN(lat) || isNaN(lng)) {
                throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`)
            }

            // Build request data with enhanced validation and fallbacks
            const requestData = {
                current_location: {
                    lat: lat,
                    lng: lng,
                    address: userLocation.address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                    neighborhood: userLocation.neighborhood || 
                                userLocation.locality || 
                                userLocation.displayLocation || 
                                'Unknown area'
                },
                user_id: user.id,
                weather_data: {
                    condition: userLocation?.condition || 'Clear',
                    temperature: userLocation?.temperature ?? 20,
                    weatherIcon: userLocation?.weatherIcon || null,
                    hasRealWeather: validation.weatherReady
                },
                user_preferences: {
                    // Enhanced onboarding preferences (if available)
                    cuisinePreferences: user.profile?.cuisinePreferences || [],
                    activityTypes: user.profile?.activityTypes || [],
                    priceComfort: user.profile?.priceComfort || 'mid-range',
                    discoveryStyle: user.profile?.discoveryStyle || 'hidden-gems',
                    socialPreference: user.profile?.socialPreference || 'intimate-pairs',
                    aestheticPreferences: user.profile?.aestheticPreferences || [],
                    avoidancePreferences: user.profile?.avoidancePreferences || [],
                    
                    // Basic onboarding preferences (fallback)
                    favoriteVibe: user.profile?.favoriteVibe || '',
                    idealSunday: user.profile?.idealSunday || '',
                    
                    // Meta information
                    hasEnhancedPreferences: user.profile?.enhancedOnboardingCompleted || false,
                    hasBasicProfile: user.profile?.onboardingCompleted || false
                },
                pin_history: recentPins,
                
                // NEW: Metadata for backend processing
                data_quality: {
                    location_accuracy: validation.locationReady ? 'high' : 'low',
                    weather_accuracy: validation.weatherReady ? 'real' : 'estimated',
                    profile_completeness: user.profile?.enhancedOnboardingCompleted ? 'complete' : 'basic'
                }
            }

            console.log('📤 Sending request to backend:', {
                location: requestData.current_location,
                weather: requestData.weather_data,
                preferences: requestData.user_preferences,
                quality: requestData.data_quality
            })

            // Call recommendations API
            const response = await fetch(API_ENDPOINTS.RECOMMENDATIONS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `API error: ${response.status}`)
            }

            const data = await response.json()

            if (data.success && data.data.recommendations) {
                setCurrentRecommendations(data.data.recommendations, data.data.cache_key)
                console.log('✅ Recommendations generated successfully')
            } else {
                throw new Error('Invalid API response format')
            }

        } catch (error) {
            console.error('❌ Failed to generate recommendations:', error)
            setRecommendationsError(`Failed to generate recommendations: ${error.message}`)
        } finally {
            setRecommendationsLoading(false)
        }
    }

    /**
     * NEW: Get specific error message based on what data is missing
     */
    const getDataReadinessError = () => {
        const validation = validateDataReadiness()
        
        if (!validation.userReady) {
            return 'User profile is still loading. Please wait a moment and try again.'
        }
        
        if (!validation.locationReady) {
            return 'Location data is not available. Please ensure location access is enabled and try again.'
        }
        
        return 'Required data is not ready. Please try again in a moment.'
    }

    /**
     * NEW: Manual retry function
     */
    const handleRetry = async () => {
        console.log('🔄 Manual retry triggered')
        setDataValidation(prev => ({ ...prev, retryCount: prev.retryCount + 1 }))
        clearRecommendations()
        
        // Reset error state
        setRecommendationsError(null)
        
        // Try to generate recommendations again
        await generateRecommendations()
    }

    /**
     * Handle saving recommendation
     */
    const handleSaveRecommendation = (recommendation) => {
        addToSavedRecommendations(recommendation)
        showMessage('Saved', `${recommendation.name} added to your saved recommendations`)
    }

    /**
     * Handle removing saved recommendation
     */
    const handleRemoveSaved = (recommendationName) => {
        removeFromSavedRecommendations(recommendationName)
        showMessage('Removed', 'Recommendation removed from saved list')
    }

    /**
     * Handle get directions
     */
    const handleGetDirections = (recommendation) => {
        const address = encodeURIComponent(recommendation.address)
        const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`
        window.open(url, '_blank')
    }

    /**
     * Handle refresh recommendations
     */
    const handleRefresh = () => {
        clearRecommendations()
        generateRecommendations()
    }

    if (!isOpen) return null

    const { currentRecommendations, savedRecommendations, loading, error } = recommendationsModal

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left max-h-[90vh] overflow-y-auto">

                {/* Header - BiNx Standard Pattern */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={handleRefresh}
                        className="text-customPurpleText transition-colors"
                        aria-label="Refresh recommendations"
                        disabled={loading || !dataValidation.allReady}
                    >
                        {loading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fas fa-sync-alt"></i>
                        )}
                    </button>

                    <h2 className="text-xl font-medium text-gray-900">Recommendations</h2>

                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Close recommendations"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* NEW: Data Loading Status */}
                {!dataValidation.allReady && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
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
                                <span>Weather data {!dataValidation.weatherReady && '(optional)'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State with Enhanced Messaging */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                            <i className="fas fa-exclamation-triangle text-red-500"></i>
                            <span className="text-sm font-medium text-red-800">Unable to Generate Recommendations</span>
                        </div>
                        <p className="text-xs text-red-600 mb-3">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <LoadingSpinner size="lg" />
                        <p className="mt-4 text-gray-600 text-center">
                            Generating personalized recommendations...
                        </p>
                    </div>
                )}

                {/* Current Recommendations */}
                {!loading && currentRecommendations.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">For You Now</h3>
                        <div ref={currentScrollRef} className="space-y-4 max-h-96 overflow-y-auto">
                            {currentRecommendations.map((recommendation, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900">{recommendation.name}</h4>
                                        <button
                                            onClick={() => handleSaveRecommendation(recommendation)}
                                            className="text-gray-400 hover:text-customPurpleText transition-colors"
                                            aria-label="Save recommendation"
                                        >
                                            <i className="fas fa-heart"></i>
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                                    <p className="text-xs text-gray-500 mb-3">{recommendation.address}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                            {recommendation.category}
                                        </span>
                                        <button
                                            onClick={() => handleGetDirections(recommendation)}
                                            className="text-xs text-customPurpleText hover:underline"
                                        >
                                            Get Directions
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Saved Recommendations */}
                {savedRecommendations.length > 0 && (
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Saved</h3>
                        <div ref={savedScrollRef} className="space-y-4 max-h-96 overflow-y-auto">
                            {savedRecommendations.map((recommendation, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-medium text-gray-900">{recommendation.name}</h4>
                                        <button
                                            onClick={() => handleRemoveSaved(recommendation.name)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                            aria-label="Remove saved recommendation"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{recommendation.description}</p>
                                    <p className="text-xs text-gray-500 mb-3">{recommendation.address}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                            {recommendation.category}
                                        </span>
                                        <button
                                            onClick={() => handleGetDirections(recommendation)}
                                            className="text-xs text-customPurpleText hover:underline"
                                        >
                                            Get Directions
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && currentRecommendations.length === 0 && !error && dataValidation.allReady && (
                    <div className="text-center py-12">
                        <i className="fas fa-map-marker-alt text-4xl text-gray-300 mb-4"></i>
                        <p className="text-gray-600 mb-4">Ready to discover amazing places around you!</p>
                        <button
                            onClick={generateRecommendations}
                            className="bg-customPurpleText text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            Get Recommendations
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

RecommendationsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
}

export default RecommendationsModal