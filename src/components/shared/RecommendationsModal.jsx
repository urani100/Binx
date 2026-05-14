/**
 * Recommendations Modal Component for BiNx React App
 * Purpose: Display AI-generated location recommendations following BiNx design standards
 * Author: ML
 * Date: August 13, 2025
 */

 import React, { useEffect, useRef } from 'react'
 import PropTypes from 'prop-types'
 import { useAuth } from '../../hooks/useAuth'
 import { useLocation } from '../../hooks/useLocation'
 import { usePins } from '../../hooks/usePins'
 import { useUIStore } from '../../store/uiStore'
 import { LoadingSpinner } from '../ui'
 import { useLocationStore } from '../../store/locationStore'
 import { API_ENDPOINTS } from '../../utils/constants'
 
 /**
  * RecommendationsModal Component
  * Follows BiNx modal design patterns exactly
  */
 const RecommendationsModal = ({ isOpen, onClose }) => {
     const { user } = useAuth()
     const { userLocation } = useLocation()
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
 
     // Generate recommendations when modal opens
     useEffect(() => {
         if (isOpen && !recommendationsModal.loading && recommendationsModal.currentRecommendations.length === 0) {
             const initializeRecommendations = async () => {
                 await ensureWeatherData()
                 generateRecommendations()
             }
             initializeRecommendations()
         }
     }, [isOpen, userLocation, recommendationsModal.loading, recommendationsModal.currentRecommendations.length])
     
 
     /**
      * Generate AI recommendations
      */
     const generateRecommendations = async () => {
         if (!userLocation || !user) {
             setRecommendationsError('Location or user information not available')
             return
         }
 
         setRecommendationsLoading(true)
 
         try {
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
 
             const requestData = {
                 current_location: {
                     lat: lat,
                     lng: lng,
                     address: userLocation.address || `${lat}, ${lng}`,
                     neighborhood: userLocation.neighborhood || userLocation.locality || 'Unknown'
                 },
                 user_id: user.id,
                 weather_data: {
                     condition: userLocation?.condition || 'Clear',
                     temperature: userLocation?.temperature || 20,
                     weatherIcon: userLocation?.weatherIcon || null
                 },
                 user_preferences: {
                     cuisinePreferences: user.profile?.cuisinePreferences || [],
                     activityTypes: user.profile?.activityTypes || [],
                     priceComfort: user.profile?.priceComfort || 'Unknown',
                     discoveryStyle: user.profile?.discoveryStyle || 'Unknowns',
                     socialPreference: user.profile?.socialPreference || 'Unknown',
                     aestheticPreferences: user.profile?.aestheticPreferences || [],
                     avoidancePreferences: user.profile?.avoidancePreferences || [],
                 },
                 pin_history: recentPins
             }
             // ADD THIS DEBUG LOG
             console.log(' Sending to backend - User object:', user)
             console.log('Sending to backend - User preferences:', requestData.user_preferences)
 
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
             } else {
                 throw new Error('Invalid API response format')
             }
 
         } catch (error) {
            //  console.error('Failed to generate recommendations:', error)
             setRecommendationsError(`Failed to generate recommendations: ${error.message}`)
         }
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
     // Validate and refresh weather data if needed
     const ensureWeatherData = async () => {
         if (!userLocation?.condition || !userLocation?.temperature) {
             console.log('Weather data missing, refreshing location...')
             const { refreshLocation } = useLocationStore.getState()
             await refreshLocation()
         }
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
                         disabled={loading}
                     >
                         {loading ? (
                             <i className="fas fa-spinner fa-spin text-base"></i>
                         ) : (
                             <i className="fas fa-sync-alt text-base"></i>
                         )}
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
 
                 {/* Current Recommendations Section - Following Change Vibe Pattern */}
                 <div className="mb-6">
 
 
                     {loading && (
                         <div className="text-center py-8">
                             <LoadingSpinner size="lg" color="primary" text="Hang Tight, curating picks you’ll love..." />
                         </div>
                     )}
 
                     {error && (
                         <div className="text-center py-8">
                             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                 <i className="fas fa-exclamation-triangle text-red-600"></i>
                             </div>
                             <p className="text-red-600 text-sm mb-4">{error}</p>
                             <button
                                 onClick={generateRecommendations}
                                 className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
                             >
                                 Try Again
                             </button>
                         </div>
                     )}
 
                     {!loading && !error && currentRecommendations.length === 0 && (
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
 
                     {/* Current Recommendations List - Following BiNx Section Pattern */}
                     {currentRecommendations.length > 0 && (
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
                     )}
                 </div>
 
                 {/* Saved Recommendations Section - Following Pick Your Guide Pattern */}
                 {savedRecommendations.length > 0 && (
                     <div className="mb-6">
                         <h3 className="text-xl font-semibold text-customPurpleText  mb-4 pl-6">Saved Recommendations</h3>
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
 
 /**
  * Recommendation Card Component - BiNx Compliant
  */
 const RecommendationCard = ({
     recommendation,
     onSave,
     onRemove,
     onDirections,
     isSaved,
     showSavedDate
 }) => {
     return (
         <div className="cursor-pointer rounded-xl p-4 transition-all snap-center flex-shrink-0 bg-gray-50 w-72">
             <div className="flex justify-between items-start mb-2">
                 <h4 className="font-medium text-gray-900 text-sm">{recommendation.name}</h4>
                 <div className="flex items-center space-x-1">
                     <span className="text-xs text-gray-500">
                         {Math.round(recommendation.ai_confidence * 100)}%
                     </span>
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
 
 
             {/* NEW: Venue Weather Display */}
             {recommendation.venueWeather && (
                 <div className="flex items-center space-x-1 mb-2">
                     <span className="text-xs text-gray-600">{recommendation.venueWeather.temperature}°C</span>
                     {recommendation.venueWeather.icon && (
                         <img
                             src={`https:${recommendation.venueWeather.icon}`}
                             alt={recommendation.venueWeather.condition}
                             className="w-4 h-4"
                             title={recommendation.venueWeather.condition}
                         />
                     )}
                     <span className="text-xs text-gray-500">{recommendation.venueWeather.condition}</span>
                 </div>
             )}
 
             <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                 <span>{recommendation.estimated_minutes} min {recommendation.distance_km}km</span>
                 <span className="text-gray-500">{recommendation.current_status}</span>
             </div>
 
 
             {showSavedDate && recommendation.saved_at && (
                 <p className="text-xs text-gray-400 mb-3">
                     Saved {new Date(recommendation.saved_at).toLocaleDateString()}
                 </p>
             )}
 
             {/* BiNx Button Styling - Matching R and V buttons */}
             <div className="flex space-x-3">
                 {!isSaved && onSave && (
                     <button
                         onClick={onSave}
                         className="flex-1 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                     >
                         Save
                     </button>
                 )}
 
                 <button
                     onClick={onDirections}
                     className="flex-1 py-3 px-4 bg-customPurpleText text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                 >
                     Directions
                 </button>
             </div>
         </div>
     )
 }
 
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