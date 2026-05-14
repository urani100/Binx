/**
 * Locations Modal Component for BiNx React App
 * Purpose: Address search and current location display
 * Author: ML
 * Date: August 21, 2025
 */

import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { useLocation } from '../../hooks/useLocation'
import { useUIStore } from '../../store/uiStore'
import { API_ENDPOINTS } from '../../utils/constants'
import { edgeFunctionHeaders } from '../../services/supabase'

const LocationsModal = ({ isOpen, onClose }) => {
  const { userLocation } = useLocation()
  const showMessage = useUIStore(state => state.showMessageModal)

  const [locationName, setLocationName] = useState('')
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }

  const searchLocationByAddress = async (address) => {
    if (!address || address.trim().length === 0) throw new Error('Address is required')
    setIsSearchingLocation(true)
    try {
      const url = `${API_ENDPOINTS.GEOCODE}?address=${encodeURIComponent(address.trim())}`
      const response = await fetch(url, { headers: edgeFunctionHeaders })
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

  useEffect(() => {
    if (!isOpen) return
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

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape' && isOpen && onClose) onClose() }
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

  const handleAddressSearch = async () => {
    if (!locationName.trim()) {
      showMessage('Invalid Address', 'Please enter an address to search.')
      return
    }
    try {
      const result = await searchLocationByAddress(locationName)
      setLocationName(result.formattedAddress)
      setSelectedLocation({ name: result.formattedAddress, lat: result.lat, lng: result.lng })
      if (userLocation) {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, result.lat, result.lng)
        showMessage('Location Found', `Found location ${distance}km from your current position.`)
      }
    } catch (error) {
      showMessage('Search Failed', 'Could not find that address. Please try a different search.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg my-auto text-left">

        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <button onClick={onClose} className="text-customPurpleText transition-colors" aria-label="Close modal">
            ✕
          </button>
          <h3 className="text-xl font-semibold text-customPurpleText">Locations</h3>
          <div className="w-6" />
        </div>

        <div className="space-y-4">

          {/* Address Search */}
          <div>
            <label className="block text-sm font-medium text-customPurpleText mb-2">
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

          {/* Current Location Info */}
          {userLocation && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-customPurpleText mb-2">Current Location</h4>
              <p className="text-sm text-gray-700">{userLocation.address || 'Location detected'}</p>
              <p className="text-xs text-gray-500 mt-1">{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
              {userLocation.temperature && (
                <p className="text-xs text-gray-500 mt-1">{userLocation.temperature}°C · {userLocation.condition}</p>
              )}
            </div>
          )}

          {/* Search Result */}
          {selectedLocation && selectedLocation.name !== (userLocation?.address || 'Current Location') && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-customPurpleText mb-2">Search Result</h4>
              <p className="text-sm text-gray-700">{selectedLocation.name}</p>
              {userLocation && (
                <p className="text-xs text-gray-500 mt-1">
                  {calculateDistance(userLocation.lat, userLocation.lng, selectedLocation.lat, selectedLocation.lng)}km from your location
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

LocationsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default LocationsModal
