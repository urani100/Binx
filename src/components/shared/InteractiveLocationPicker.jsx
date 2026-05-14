/**
 * Interactive Location Picker Component (with Refine Search)
 * - Single orchestrator controls all searches (debounced, distance-gated, in-flight locked)
 * - Nearby Search (New): single call with combined includedTypes
 * - Refine modal: user selects venue types, price levels, min rating, radius, rank
 * - Fallback: single Text Search (first page) only when modern returns 0 results
 */

import React, { useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { GUIDES } from '../../utils/constants'

const InteractiveLocationPicker = ({
  userLocation,
  onLocationChange,
  onLocationNameChange,
  selectedGuideName
}) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  const [isLoading, setIsLoading] = useState(true)
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [showPlaces, setShowPlaces] = useState(true)
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [currentSearchLocation, setCurrentSearchLocation] = useState(null)

  // ---------- Refine / filters UI state ----------
  const CATEGORY_OPTIONS = [
    'restaurant', 'cafe', 'bar', 'tourist_attraction', 'museum', 'park', 'library',
    'book_store', 'bakery', 'art_gallery', 'gym', 'spa', 'movie_theater', 'zoo',
    'aquarium', 'shopping_mall', 'garden', 'confectionery', 'historical_place',
    'monument', 'sculpture', 'cultural_center', 'art_studio', 'ice_cream_shop'
  ]

  // Default: broad selection (single API call; NOT one call per type)
  const [selectedTypes, setSelectedTypes] = useState([
    'restaurant', 'cafe', 'bar', 'tourist_attraction', 'museum', 'park', 'library',
    'book_store', 'bakery', 'art_gallery', 'gym', 'spa', 'movie_theater', 'zoo',
    'aquarium', 'shopping_mall', 'garden', 'confectionery', 'historical_place',
    'monument', 'sculpture', 'cultural_center', 'art_studio', 'ice_cream_shop'
  ])
  const PRICE_OPTIONS = [1, 2, 3, 4]
  const [selectedPriceLevels, setSelectedPriceLevels] = useState([]) // empty = all
  const [minRating, setMinRating] = useState(0) // 0 = any
  const [rankPreference, setRankPreference] = useState('POPULARITY') // or 'DISTANCE'
  const [radiusMeters, setRadiusMeters] = useState(750)
  const [showRefine, setShowRefine] = useState(false)
  const [filtersVersion, setFiltersVersion] = useState(0) // bump on Apply to re-run orchestrator once

  // ---------- Orchestrator refs & helpers ----------
  const lastSearchLocRef = useRef(null)        // last location actually searched
  const inFlightRef = useRef(false)            // prevents parallel searches
  const debounceTimerRef = useRef(null)        // coalesce rapid changes
  const lastFiltersVersionRef = useRef(0)      // NEW: last filters version used by orchestrator
  const MIN_MOVE_METERS = 75                   // distance gate
  const DEBOUNCE_MS = 500                      // debounce window

  // Haversine distance in meters
  const distanceMeters = (a, b) => {
    if (!a || !b) return Infinity
    const toRad = (deg) => (deg * Math.PI) / 180
    const R = 6371000
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
  }

  // ---------- Init map ----------
  useEffect(() => {
    if (window.google && userLocation && !mapInstanceRef.current) {
      setCurrentSearchLocation(userLocation)
      initializeMap()
    }
  }, [userLocation])

  // Location-change effect: visual sync ONLY (no search here)
  useEffect(() => {
    if (userLocation && currentSearchLocation && mapInstanceRef.current && markerRef.current) {
      const moved =
        Math.abs(currentSearchLocation.lat - userLocation.lat) > 0.0001 ||
        Math.abs(currentSearchLocation.lng - userLocation.lng) > 0.0001

      if (moved) {
        // sync internal state and visuals
        setCurrentSearchLocation(userLocation)
        mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng })
        markerRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng })
      }
    }
  }, [userLocation, currentSearchLocation])

  // ---------- Search Orchestrator (single authority to run searches) ----------
  useEffect(() => {
    if (!currentSearchLocation || !mapInstanceRef.current || !markerRef.current) return

    // If filters changed, run regardless of distance moved
    const filtersChanged = filtersVersion !== lastFiltersVersionRef.current
    const last = lastSearchLocRef.current
    const movedEnough = !last || distanceMeters(last, currentSearchLocation) >= MIN_MOVE_METERS
    const shouldRun = filtersChanged || movedEnough
    if (!shouldRun) return

    // consume this filters version so repeated renders don’t re-trigger
    lastFiltersVersionRef.current = filtersVersion

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        await searchNearbyPlacesModern(currentSearchLocation)
        lastSearchLocRef.current = currentSearchLocation
      } finally {
        inFlightRef.current = false
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [currentSearchLocation, filtersVersion]) // orchestrator re-runs on location OR filters change

  /** Initialize Google Map */
  const initializeMap = () => {
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: userLocation.lat, lng: userLocation.lng },
      zoom: 16,
      mapId: 'DEMO_MAP_ID',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
      ]
    })

    const selectedGuide = GUIDES.find(guide => guide.name === selectedGuideName) || GUIDES[0]
    const userMood = selectedGuide.mood.toLowerCase()

    const marker = new window.google.maps.Marker({
      position: { lat: userLocation.lat, lng: userLocation.lng },
      map,
      draggable: true,
      title: `What's your ${userMood} vibe?`,
      icon: {
        url: `images/${selectedGuide.svgFile}`,
        scaledSize: new google.maps.Size(180, 180),
        anchor: new window.google.maps.Point(90, 90)
      }
    })

    // Drag handler: update state only (no search here)
    marker.addListener('dragend', (event) => {
      const newLat = event.latLng.lat()
      const newLng = event.latLng.lng()
      const newLocation = { lat: newLat, lng: newLng }
      setCurrentSearchLocation(newLocation)
      onLocationChange(newLocation)
      reverseGeocode(newLat, newLng)
    })

    mapInstanceRef.current = map
    markerRef.current = marker
    setIsLoading(false)
    // No automatic search on init; orchestrator will run when ready
  }

  /** Nearby Search (New): single request with many includedTypes */
  const searchNearbyPlacesModern = async (searchLocation = currentSearchLocation || userLocation) => {
    setIsSearchingPlaces(true)
    console.log('Searching for nearby places with Places API (New)...')

    const typesForRequest =
      selectedTypes && selectedTypes.length > 0 ? selectedTypes : CATEGORY_OPTIONS

    let allPlaces = []
    try {
      const places = await searchPlacesByTypesCombined(typesForRequest, searchLocation)
      allPlaces = places

      if (allPlaces.length === 0) {
        await searchWithTextSearchFallback(searchLocation)
      } else {
        processPlaceResults(allPlaces)
      }
    } catch (error) {
      console.error('Places API (New) search failed:', error)
      setIsSearchingPlaces(false)
      // No fallback here; end this cycle cleanly
    }
  }

  /** Combined-types helper (single call) */
  const searchPlacesByTypesCombined = async (
    types,
    searchLocation = currentSearchLocation || userLocation
  ) => {
    const url = 'https://places.googleapis.com/v1/places:searchNearby'

    const requestBody = {
      includedTypes: types,               // multiple types in one request
      maxResultCount: 20,                 // API cap is 1–20
      rankPreference: rankPreference,     // 'POPULARITY' or 'DISTANCE'
      locationRestriction: {
        circle: {
          center: { latitude: searchLocation.lat, longitude: searchLocation.lng },
          radius: radiusMeters
        }
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': 'AIzaSyDkK930rjzJoTr7xQSWvrd5r3O3N-d2Puw', // frontend key, real key hidden elsewhere
          'X-Goog-FieldMask':
            'places.displayName,places.id,places.location,places.rating,places.priceLevel,places.types,places.formattedAddress'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      return data.places || []
    } catch (error) {
      console.error('Error searching combined types:', error)
      return []
    }
  }


  const searchWithTextSearchFallback = async (
    searchLocation = currentSearchLocation || userLocation
  ) => {
    // Build a type-aware text query
    // If the user picked types, prefer the first selected type.
    // If none selected, use a broad but single query.
    const primaryType = (selectedTypes && selectedTypes.length > 0)
      ? selectedTypes[0]
      : 'restaurants'

    // Humanize underscores for text search (e.g., "ice_cream_shop" -> "ice cream shop")
    const typePhrase = primaryType.replaceAll('_', ' ')
    const query = `${typePhrase} near me`

    console.log('Falling back to a single text search...', query)

    try {
      const service = new window.google.maps.places.PlacesService(mapInstanceRef.current)
      const results = await performTextSearch(service, query, searchLocation)
      processPlaceResults(results, true) // we will filter by type in Step 2
    } catch (error) {
      console.error('Text search fallback also failed:', error)
      setIsSearchingPlaces(false)
    }
  }


  const performTextSearch = (service, query, searchLocation = currentSearchLocation || userLocation) => {
    return new Promise((resolve) => {
      const request = {
        query,
        location: new window.google.maps.LatLng(searchLocation.lat, searchLocation.lng),
        radius: radiusMeters
      }
      service.textSearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(results || [])
        } else {
          // Treat non-OK as empty for a clean single-call fallback
          resolve([])
        }
      })
    })
  }

  /** Normalize + filter + sort + slice */
  const processPlaceResults = (places, isLegacyFormat = false) => {
    const processed = places
      // de-duplicate
      .filter((place, idx, self) => {
        const id = isLegacyFormat ? place.place_id : place.id
        return idx === self.findIndex(p => (isLegacyFormat ? p.place_id : p.id) === id)
      })
      // normalize to legacy-like shape for display code
      .map(place => {
        if (isLegacyFormat) return place
        return {
          place_id: place.id,
          name: place.displayName?.text || 'Unknown Place',
          rating: place.rating,
          price_level: place.priceLevel,
          types: place.types || [],
          formatted_address: place.formattedAddress,
          geometry: {
            location: {
              lat: () => place.location?.latitude || (currentSearchLocation || userLocation).lat,
              lng: () => place.location?.longitude || (currentSearchLocation || userLocation).lng
            }
          }
        }
      })

      // sort: rating desc (fallback 3.5), then name asc
      .sort((a, b) => {
        const ra = a.rating ?? 3.5
        const rb = b.rating ?? 3.5
        if (rb !== ra) return rb - ra
        return (a.name || '').localeCompare(b.name || '')
      })
      // UI cap (Nearby returns ≤20, Text Search page ≈20)
      .slice(0, 75)

    setNearbyPlaces(processed)
    setIsSearchingPlaces(false)
  }

  /** Reverse geocode for address label */
  const reverseGeocode = (lat, lng) => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        onLocationNameChange(results[0].formatted_address)
      }
    })
  }

  /** Selecting a place recenters and emits location up */
  const handlePlaceClick = (place) => {
    const newLocation = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    }
    markerRef.current.setPosition(newLocation)
    mapInstanceRef.current.setCenter(newLocation)
    onLocationChange(newLocation)
    onLocationNameChange(place.name + (place.formatted_address ? ', ' + place.formatted_address : ''))
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <i className="fas fa-map-pin text-customPurpleText text-sm"></i>
          <span className="block text-l ont-medium  text-customPurpleText mb-2">Vibe Location</span>
          {isLoading && <span className="block text-l ont-medium  text-customPurpleText mb-2">Loading map...</span>}
          {isSearchingPlaces && <span className="block text-l ont-medium  text-customPurpleText mb-2">Finding places...</span>}
        </div>
        <div className="flex items-center gap-3">
          {/* <button
            onClick={() => setShowPlaces(!showPlaces)}
            className="block text-l ont-medium  text-customPurpleText mb-2"
          >
            {showPlaces ? 'Hide Places' : 'Show Places'}
          </button>
          <button
            onClick={() => setShowRefine(true)}
            className="block text-l ont-medium  text-customPurpleText mb-2"
          >
            Refine
          </button> */}
        </div>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-48 rounded-lg border border-gray-200 mb-4"
        style={{ minHeight: '192px' }}
      />

      {/* Places list */}
      {showPlaces && (
        <div className="space-y-3">
          {nearbyPlaces.length > 0 ? (
            <div className="space-y-2">
              <h4 className="block text-l font-medium  text-customPurpleText mb-2">
                What's around? Check out some the {nearbyPlaces.length} places listed.
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {nearbyPlaces.map((place) => (
                  <button
                    key={place.place_id}
                    onClick={() => handlePlaceClick(place)}
                    className="w-full text-left p-2 bg-white rounded-lg border border-gray-100 hover:border-customPurple transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {place.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {place.rating && (
                            <span className="text-xs text-gray-600">☆ {place.rating.toFixed(1)}</span>
                          )}
                          {typeof place.price_level === 'number' && (
                            <span className="text-xs text-gray-500">{'$'.repeat(place.price_level)}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {(place.types || [])[0] ? (place.types[0].replaceAll('_', ' ')) : 'Place'}
                          </span>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-xs text-gray-400 ml-2"></i>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500">
                {isSearchingPlaces ? 'Searching for nearby places...' : 'No places found nearby'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Location info */}
      <div className="mt-3 pt-2  mb-2">
        {/* <p className="block text-l ont-medium  text-customPurpleText mb-2">
          Current coordinates:{' '}
          {currentSearchLocation
            ? `${currentSearchLocation.lat.toFixed(4)}, ${currentSearchLocation.lng.toFixed(4)}`
            : (userLocation
              ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
              : 'Getting...')}
        </p> */}
         {/* Refine Serch button */}
        <button
          onClick={() => setShowRefine(true)}
          className="flex-1 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          Refine Search
        </button>

      </div>

      {/* Refine Search Modal */}
      {showRefine && (
        <RefineSearchModal
          onClose={() => setShowRefine(false)}
          onApply={({ types, prices, rating, rank, radius }) => {
            setSelectedTypes(types)
            setSelectedPriceLevels(prices)
            setMinRating(rating)
            setRankPreference(rank)
            setRadiusMeters(radius)
            setFiltersVersion(v => v + 1) // nudge orchestrator to re-run once even without movement
            setShowRefine(false)
          }}
          initial={{
            types: selectedTypes,
            prices: selectedPriceLevels,
            rating: minRating,
            rank: rankPreference,
            radius: radiusMeters
          }}
          CATEGORY_OPTIONS={CATEGORY_OPTIONS}
          PRICE_OPTIONS={PRICE_OPTIONS}
        />
      )}
    </div>
  )
}

// ---------- Refine Search Modal (aesthetic matches your onboarding modal) *** Eventually move to an individual file *** ---------

const RefineSearchModal = ({ onClose, onApply, initial, CATEGORY_OPTIONS, PRICE_OPTIONS }) => {
  const [step, setStep] = useState(1) // 1: Types, 2: Price, 3: Other
  const [types, setTypes] = useState(initial.types || [])
  const [prices, setPrices] = useState(initial.prices || [])
  const [rating, setRating] = useState(initial.rating ?? 0)
  const [rank, setRank] = useState(initial.rank || 'POPULARITY')
  const [radius, setRadius] = useState(initial.radius || 750)

  const toggle = (arr, val) => (arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  const canNextFromStep1 = types.length > 0

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleApply = () => {
    onApply({ types, prices, rating, rank, radius })
    onClose()
  }

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Venue Types'
      case 2: return 'Price Level'
      case 3: return 'Other Criteria'
      default: return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg text-left relative">

        {/* Close Button */}
        <div className="absolute top-6 right-6">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6 mt-8">
          <h2 className="text-2xl font-bold text-customPurpleText">Refine Search</h2>
          <p className="text-sm text-gray-500">Step {step} of 3</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">{getStepTitle()}</h3>

          {/* STEP 1 — Venue Types */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className={`text-sm ${types.length ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                  onClick={() => types.length && setTypes([])}
                  disabled={!types.length}
                >
                  Unselect all
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 min-h-80 max-h-96 overflow-y-auto pr-1">
                {CATEGORY_OPTIONS.map(t => (
                  <label key={t} className="flex items-center gap-2 text-base text-gray-800 py-2">
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() => setTypes(prev => toggle(prev, t))}
                      // className="border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent rounded"
                      className="rounded border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent"
                      style={{ accentColor: '#bdbdbd' }}
                    />
                    <span className="capitalize">{t.replaceAll('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — Price Level */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {PRICE_OPTIONS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-base text-gray-800">
                    <input
                      type="checkbox"
                      checked={prices.includes(p)}
                      onChange={() => setPrices(prev => toggle(prev, p))}
                      // className="border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent rounded"
                      className="rounded border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent"
                      style={{ accentColor: '#bdbdbd' }}
                    />
                    <span>{'$'.repeat(p)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — Other Criteria */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Minimum rating */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">Minimum rating</label>
                <div className="grid grid-cols-1 gap-3 text-base text-gray-800">
                  {[0, 3.5, 4.0, 4.5].map(r => (
                    <label key={r} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="minRating"
                        checked={rating === r}
                        onChange={() => setRating(r)}
                        className="border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent"
                        style={{ accentColor: '#bdbdbd' }}
                      />
                      <span>{r === 0 ? 'Any' : `${r.toFixed(1)}+`}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">Radius</label>
                <div className="grid grid-cols-1 gap-3 text-base text-gray-800">
                  {[250, 500, 750, 1000].map(r => (
                    <label key={r} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="radius"
                        checked={radius === r}
                        onChange={() => setRadius(r)}
                        className="border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent"
                        style={{ accentColor: '#bdbdbd' }}
                      />
                      <span>{r} m</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sort by */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">Sort by</label>
                <div className="grid grid-cols-1 gap-3 text-base text-gray-800">
                  {['POPULARITY', 'DISTANCE'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 capitalize">
                      <input
                        type="radio"
                        name="rank"
                        checked={rank === opt}
                        onChange={() => setRank(opt)}
                        className="border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent"
                        style={{ accentColor: '#bdbdbd' }}
                      />
                      <span>{opt.toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          {step > 1 && (
            <button
              onClick={handlePrevious}
              className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
              aria-label="Previous step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {step < 3 && (
            <button
              onClick={handleNext}
              disabled={step === 1 && !canNextFromStep1}
              className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Next step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="flex-1"></div>

          <button
            onClick={handleApply}
            className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}


InteractiveLocationPicker.propTypes = {
  userLocation: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired
  }),
  onLocationChange: PropTypes.func.isRequired,
  onLocationNameChange: PropTypes.func.isRequired,
  selectedGuideName: PropTypes.string.isRequired
}

export default InteractiveLocationPicker


