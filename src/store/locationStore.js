/**
 * Location Store for BiNx React App
 * Purpose: Manage user location and weather data with secure API integration
 * Author: ML
 * Date: August 8, 2025
 */

 import { create } from 'zustand'
 import { API_ENDPOINTS, APP_CONFIG } from '../utils/constants'
 import { getCurrentLocation } from '../utils/helpers'
 import { handleApiError, handleLocationError, withErrorHandling } from '../services/errorInterceptor'
 
 /**
  * Location Store
  * Manages user location, weather data, and geocoding
  */
 export const useLocationStore = create((set, get) => ({
   // State
   userLocation: null,
   loading: false,
   error: null,
   lastUpdated: null,
 
   // Actions
 
   /**
    * Initialize location
    * Get user's current location and weather data
    */
   initializeLocation: withErrorHandling(async () => {
     const { userLocation, lastUpdated } = get()
     
     // Don't refetch if location is recent (within 5 minutes)
     if (userLocation && lastUpdated && (Date.now() - lastUpdated) < 5 * 60 * 1000) {
       return
     }
 
     set({ loading: true, error: null })
 
     try {
       // Get coordinates
       const coords = await getCurrentLocation()
 
       let locationData = { ...coords }
 
       // Fetch weather data from secure endpoint
       try {
         const weatherResponse = await fetch(
           `${API_ENDPOINTS.WEATHER}?lat=${coords.lat}&lng=${coords.lng}`
         )
 
         if (!weatherResponse.ok) {
           throw new Error(`Weather API error: ${weatherResponse.status}`)
         }
 
         const weatherData = await weatherResponse.json()
         
         locationData.temperature = Math.round(weatherData.current.temp_c)
         locationData.condition = weatherData.current.condition.text
         locationData.weatherIcon = weatherData.current.condition.icon
         
       } catch (error) {
         console.warn('Weather fetch failed:', error)
         // Continue without weather data
       }
 
       // Reverse geocode to get location info from secure endpoint
       try {
         const geocodeResponse = await fetch(
           `${API_ENDPOINTS.GEOCODE}?lat=${coords.lat}&lng=${coords.lng}`
         )
 
         if (!geocodeResponse.ok) {
           throw new Error(`Geocoding API error: ${geocodeResponse.status}`)
         }
 
         const geocodeData = await geocodeResponse.json()
         
         if (geocodeData.results && geocodeData.results.length > 0) {
           const components = geocodeData.results[0].address_components
           
           let city = ''
           let state = ''
           let country = ''
           let locality = ''
           let sublocality = ''
           let displayLocation = ''
 
           // Extract specific components
           components.forEach(component => {
             if (component.types.includes('locality')) {
               city = component.long_name
               locality = component.long_name
             }
             if (component.types.includes('sublocality')) {
               sublocality = component.long_name
             }
             if (component.types.includes('administrative_area_level_1')) {
               state = component.long_name
             }
             if (component.types.includes('country')) {
               country = component.long_name
             }
           })
 
           // International-friendly display location with priority system
           const locationPriority = [
             'locality',
             'sublocality',
             'administrative_area_level_2',
             'administrative_area_level_1',
             'country'
           ]
 
           for (const priority of locationPriority) {
             const component = components.find(comp => comp.types.includes(priority))
             if (component) {
               displayLocation = component.long_name
               break
             }
           }
 
           // Add location details
           locationData.city = city
           locationData.locality = locality
           locationData.sublocality = sublocality
           locationData.state = state
           locationData.country = country
           locationData.displayLocation = displayLocation
           locationData.address = displayLocation && country 
             ? `${displayLocation}, ${country}` 
             : geocodeData.results[0].formatted_address
 
         }
       } catch (error) {
         console.warn('Geocoding failed:', error)
         // Continue without detailed location info
       }
 
       set({ 
         userLocation: locationData, 
         loading: false, 
         error: null,
         lastUpdated: Date.now()
       })
 
     } catch (error) {
       const errorMessage = error.code ? handleLocationError(error) : handleApiError(error, 'Location')
       set({ error: errorMessage, loading: false })
     }
   }, 'Location Initialization'),
 
   /**
    * Update location manually
    */
   updateLocation: withErrorHandling(async (coords) => {
     if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
       throw new Error('Invalid coordinates provided')
     }
 
     set({ loading: true, error: null })
 
     try {
       let locationData = { ...coords }
 
       // Fetch weather for new coordinates
       try {
         const weatherResponse = await fetch(
           `${API_ENDPOINTS.WEATHER}?lat=${coords.lat}&lng=${coords.lng}`
         )
 
         if (weatherResponse.ok) {
           const weatherData = await weatherResponse.json()
           locationData.temperature = Math.round(weatherData.current.temp_c)
           locationData.condition = weatherData.current.condition.text
           locationData.weatherIcon = weatherData.current.condition.icon
         }
       } catch (error) {
         console.warn('Weather update failed:', error)
       }
 
       // Reverse geocode new coordinates
       try {
         const geocodeResponse = await fetch(
           `${API_ENDPOINTS.GEOCODE}?lat=${coords.lat}&lng=${coords.lng}`
         )
 
         if (geocodeResponse.ok) {
           const geocodeData = await geocodeResponse.json()
           
           if (geocodeData.results && geocodeData.results.length > 0) {
             locationData.address = geocodeData.results[0].formatted_address
           }
         }
       } catch (error) {
         console.warn('Geocoding update failed:', error)
       }
 
       set({ 
         userLocation: locationData, 
         loading: false,
         lastUpdated: Date.now()
       })
 
     } catch (error) {
       const errorMessage = handleApiError(error, 'Location Update')
       set({ error: errorMessage, loading: false })
     }
   }, 'Location Update'),
 
   /**
    * Get distance between two locations
    */
   getDistanceFromUser: (targetLocation) => {
     const { userLocation } = get()
     if (!userLocation || !targetLocation) return null
 
     // Use Haversine formula
     const R = 6371e3 // Earth's radius in meters
     const φ1 = userLocation.lat * Math.PI / 180
     const φ2 = targetLocation.lat * Math.PI / 180
     const Δφ = (targetLocation.lat - userLocation.lat) * Math.PI / 180
     const Δλ = (targetLocation.lng - userLocation.lng) * Math.PI / 180
 
     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
             Math.cos(φ1) * Math.cos(φ2) *
             Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
 
     return R * c // Distance in meters
   },
 
   /**
    * Format distance for display
    */
   formatDistance: (distance) => {
     if (distance < 1000) {
       return `${Math.round(distance)}m`
     } else {
       return `${(distance / 1000).toFixed(1)}km`
     }
   },
 
   /**
    * Check if location needs refresh
    */
   needsLocationRefresh: () => {
     const { lastUpdated } = get()
     if (!lastUpdated) return true
     
     const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
     return lastUpdated < fiveMinutesAgo
   },
 
   /**
    * Get location summary
    */
   getLocationSummary: () => {
     const { userLocation } = get()
     if (!userLocation) return 'Getting location...'
 
     const parts = []
     
     if (userLocation.temperature) {
       parts.push(`${userLocation.temperature}°C`)
     }
     
     if (userLocation.displayLocation) {
       parts.push(userLocation.displayLocation)
     } else if (userLocation.city) {
       parts.push(userLocation.city)
     } else {
       parts.push(`${userLocation.lat.toFixed(2)}, ${userLocation.lng.toFixed(2)}`)
     }
 
     return parts.join(' • ')
   },
 
   /**
    * Clear location data
    */
   clearLocation: () => {
     set({ 
       userLocation: null, 
       loading: false, 
       error: null,
       lastUpdated: null
     })
   },
 
   /**
    * Clear error
    */
   clearError: () => set({ error: null }),
 
   /**
    * Force refresh location
    */
   refreshLocation: () => {
     set({ lastUpdated: null })
     get().initializeLocation()
   }
 }))