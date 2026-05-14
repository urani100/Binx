/**
 * Locations Modal Component for BiNx React App
 * Purpose: Dedicated location selection modal with InteractiveLocationPicker and address search
 * Author: ML
 * Date: August 21, 2025
 * 
 * Features:
 * - Interactive Google Maps with draggable marker
 * - Address search with enter-to-search functionality
 * - Nearby places discovery
 * - Independent state management (safe from PinCreationView)
 */

import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from '../../hooks/useLocation'
import { useUIStore } from '../../store/uiStore'
import { InteractiveLocationPicker } from '../shared'
import { API_ENDPOINTS } from '../../utils/constants'

/**
 * LocationsModal Component
 * Independent modal for location selection with complete state management
 */
const LocationsModal = ({ isOpen, onClose }) => {
  // Hooks for external data and functionality
  const { user } = useAuth()
  const { userLocation } = useLocation()

  // Store access
  const showMessage = useUIStore(state => state.showMessageModal)
  const selectedGuideName = useUIStore(state => state.selectedGuideName)

  // Independent location state (separate from PinCreationView)
  const [locationName, setLocationName] = useState('')
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [mapLocation, setMapLocation] = useState(null) // For map marker position
  const [selectedLocation, setSelectedLocation] = useState(null) // Currently selected location


  /**
   * Calculate distance between two coordinates (Haversine formula)
   * Copied from PinCreationView for independence
   */
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }

  /**
   * Forward geocode: Convert address to coordinates
   * Uses secure Supabase Edge Function geocoding endpoint
   * Copied from PinCreationView for independence
   */
  const searchLocationByAddress = async (address) => {
    if (!address || address.trim().length === 0) {
      throw new Error('Address is required')
    }

    setIsSearchingLocation(true)

    try {
      const url = `${API_ENDPOINTS.GEOCODE}?address=${encodeURIComponent(address.trim())}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address
        }
      } else {
        throw new Error('Address not found')
      }
    } catch (error) {
      console.error('Forward geocoding error:', error)
      throw error
    } finally {
      setIsSearchingLocation(false)
    }
  }

  // Initialize location name when modal opens.
  // locationStore already reverse-geocodes on init, so we read address directly.
  useEffect(() => {
    if (!isOpen) return

    setMapLocation(null)

    if (userLocation?.address) {
      setLocationName(userLocation.address)
      setSelectedLocation({ name: userLocation.address, lat: userLocation.lat, lng: userLocation.lng })
    } else if (userLocation) {
      setLocationName('Current Location')
      setSelectedLocation({ name: 'Current Location', lat: userLocation.lat, lng: userLocation.lng })
    } else {
      setLocationName('Getting location...')
      setSelectedLocation(null)
    }
  }, [isOpen, userLocation])

  /**
   * Handle escape key for modal closure
   */
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

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  /**
   * Handle address search
   */
  const handleAddressSearch = async () => {
    if (!locationName.trim()) {
      showMessage('Invalid Address', 'Please enter an address to search.')
      return
    }

    try {
      const result = await searchLocationByAddress(locationName)

      // Set map marker position
      setMapLocation({ lat: result.lat, lng: result.lng })
      setLocationName(result.formattedAddress)

      // Update selected location
      setSelectedLocation({
        name: result.formattedAddress,
        lat: result.lat,
        lng: result.lng
      })

      // Calculate distance for user feedback
      if (userLocation) {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, result.lat, result.lng)
        showMessage('Location Found', `Found location ${distance}km from your current position.`)
      }

    } catch (error) {
      showMessage('Search Failed', 'Could not find that address. Please try a different search.')
    }
  }

  /**
   * Handle location selection from InteractiveLocationPicker
   */
  const handleLocationChange = async (newLocation) => {
    setMapLocation(newLocation)

    // Update selected location
    setSelectedLocation({
      name: locationName,
      lat: newLocation.lat,
      lng: newLocation.lng
    })
  }

  /**
   * Handle location name change from InteractiveLocationPicker
   */
  const handleLocationNameChange = (newName) => {
    setLocationName(newName)

    // Update selected location if we have coordinates
    if (selectedLocation) {
      setSelectedLocation({
        ...selectedLocation,
        name: newName
      })
    }
  }

  /**
   * Handle using current location
   */
  const handleUseCurrentLocation = async () => {
    if (!userLocation) {
      showMessage('Location Error', 'Current location not available.')
      return
    }

    setMapLocation(null)

    const address = userLocation.address || 'Current Location'
    setLocationName(address)
    setSelectedLocation({ name: address, lat: userLocation.lat, lng: userLocation.lng })
    showMessage('Location Updated', 'Using your current location.')
  }

  // Don't render if modal is not open
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg my-auto text-left max-h-[95vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onClose}
            className="text-customPurpleText transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
          <h3 className="text-xl font-semibold text-customPurpleText">Locations</h3>

          {/* Revisit functionality is not worlikng properly and is not currrently necesssary */}
          {/* <button
             onClick={handleUseCurrentLocation}
             className="text-customPurpleText font-medium transition-colors"
             aria-label="Use current location"
           >
             Current
           </button> */}
        </div>

        <div className="space-y-4">

          {/* Address Search Input */}
          <div>
            <label className="block text-l ont-medium  text-customPurpleText mb-2">
              Search for a location
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  await handleAddressSearch()
                }
              }}
              placeholder="Enter address and press Enter to search"
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-customPurple focus:border-transparent outline-none"
              aria-label="Location search"
              disabled={isSearchingLocation}
            />

            {isSearchingLocation && (
              <p className="text-xs text-gray-500 mt-2">Searching address...</p>
            )}
          </div>

          {/* Interactive Location Picker */}
          <div className="bg-gray-50 rounded-xl p-3">
            <InteractiveLocationPicker
              userLocation={mapLocation || userLocation}
              selectedGuideName={selectedGuideName}
              onLocationChange={handleLocationChange}
              onLocationNameChange={handleLocationNameChange}
            />
          </div>

          {/* Selected Location Info */}
          {selectedLocation && (
            <div className="bg-gray-50 rounded-xl p-3">
              <h4 className="block text-l ont-medium  text-customPurpleText mb-2">Location Details</h4>
              <p className="text-sm text-gray-700 mb-1">{selectedLocation.name}</p>
              <p className="text-sm text-gray-700 mb-1">
                {/* {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)} */}
              </p>
              {userLocation && selectedLocation && (
                <p className="text-sm text-gray-700 mb-1">
                  {calculateDistance(userLocation.lat, userLocation.lng, selectedLocation.lat, selectedLocation.lng)}km from current location
                </p>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            {/* Revisit functionality is not worlikng properly and is not currrently necesssary */}
            {/* <button
               onClick={() => {
                 if (selectedLocation) {
                   showMessage('Location Selected', `Selected: ${selectedLocation.name}`)
                   onClose()
                 } else {
                   showMessage('No Location', 'Please select a location first.')
                 }
               }}
               className="flex-1 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
               disabled={!selectedLocation}
             >
               Select Location
             </button> */}
          </div>
        </div>
      </div>
    </div>
  )
}

// PropTypes for type checking
LocationsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default LocationsModal