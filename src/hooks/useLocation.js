/**
 * Location Hook for BiNx React App
 * Purpose: Provide clean interface to location services and weather data
 * Author: ML
 * Date: August 8, 2025
 */

import { useLocationStore } from '../store/locationStore'
import { useUIStore } from '../store/uiStore'
import { useEffect } from 'react'

/**
 * Location Hook
 * Provides clean interface to location functionality with automatic initialization
 */
export const useLocation = (autoInitialize = true) => {
  // Store selectors
  const userLocation = useLocationStore(state => state.userLocation)
  const loading = useLocationStore(state => state.loading)
  const error = useLocationStore(state => state.error)
  const lastUpdated = useLocationStore(state => state.lastUpdated)

  // Store actions
  const initializeLocation = useLocationStore(state => state.initializeLocation)
  const updateLocation = useLocationStore(state => state.updateLocation)
  const clearLocation = useLocationStore(state => state.clearLocation)
  const clearError = useLocationStore(state => state.clearError)
  const refreshLocation = useLocationStore(state => state.refreshLocation)
  const needsLocationRefresh = useLocationStore(state => state.needsLocationRefresh)
  const getLocationSummary = useLocationStore(state => state.getLocationSummary)
  const getDistanceFromUser = useLocationStore(state => state.getDistanceFromUser)
  const formatDistance = useLocationStore(state => state.formatDistance)

  // UI store for error messaging
  const showMessage = useUIStore(state => state.showMessageModal)

  // Auto-initialize location on mount
  useEffect(() => {
    if (autoInitialize && !userLocation && !loading) {
      initializeLocation().catch(error => {
        console.error('Location initialization failed:', error)
      })
    }
  }, [autoInitialize, userLocation, loading, initializeLocation])

  /**
   * Enhanced location update with error handling
   */
  const updateLocationSafe = async (coords) => {
    clearError()

    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      const errorMsg = 'Invalid coordinates provided'
      showMessage('Location Error', errorMsg)
      return { success: false, error: errorMsg }
    }

    try {
      await updateLocation(coords)
      return { success: true }
    } catch (error) {
      showMessage('Location Update Failed', error.message)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current position with enhanced error handling
   */
  const getCurrentPosition = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const fallback = { lat: 48.8566, lng: 2.3522 } // Paris fallback
        showMessage('Location Unavailable', 'Geolocation not supported. Using default location.')
        resolve(fallback)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.warn('Geolocation error:', error)
          const fallback = { lat: 48.8566, lng: 2.3522 }

          let errorMessage = 'Location access failed. Using default location.'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Using default location.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable. Using default location.'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Using default location.'
              break
          }

          showMessage('Location Warning', errorMessage)
          resolve(fallback)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }

  /**
   * Force refresh location
   */
  const forceRefresh = async () => {
    try {
      const coords = await getCurrentPosition()
      await updateLocationSafe(coords)
      return { success: true }
    } catch (error) {
      showMessage('Refresh Failed', error.message)
      return { success: false, error: error.message }
    }
  }

  // Computed values
  const hasLocation = !!userLocation
  const isStale = needsLocationRefresh()
  const locationText = getLocationSummary()

  const coordinates = userLocation ? {
    lat: userLocation.lat,
    lng: userLocation.lng,
    formatted: `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
  } : null

  const weather = userLocation ? {
    temperature: userLocation.temperature,
    condition: userLocation.condition,
    icon: userLocation.weatherIcon,
    hasWeather: !!(userLocation.temperature && userLocation.condition)
  } : null

  const address = userLocation ? {
    full: userLocation.address,
    display: userLocation.displayLocation,
    city: userLocation.city,
    country: userLocation.country,
    locality: userLocation.locality,
    sublocality: userLocation.sublocality
  } : null

  return {
    // State
    userLocation,
    loading,
    error,
    lastUpdated,
    hasLocation,
    isStale,

    // Computed
    coordinates,
    weather,
    address,
    locationText,

    // Actions
    initializeLocation,
    updateLocation: updateLocationSafe,
    getCurrentPosition,
    refreshLocation: forceRefresh,
    clearLocation,
    clearError,

    // Utilities
    getDistanceFromUser,
    formatDistance,
    needsRefresh: needsLocationRefresh
  }
}

export default useLocation