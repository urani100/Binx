/**
 * Interactive Location Picker Component (with Refine Search)
 * - Places search is OPT-IN: fires only on explicit user drag or "Find places" click
 * - Module-level cache (10 min TTL) prevents repeat API calls for the same location
 * - Single Nearby Search (New) call with combined includedTypes — no per-type loops
 * - Text search fallback removed to eliminate accidental double billing
 */

import React, { useRef, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { GUIDES, GOOGLE_MAPS_CONFIG } from '../../utils/constants'

// ---------- Module-level cache (survives remounts) ----------
const _placesCache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function cacheKey(location, types, radius) {
  return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}|${[...types].sort().join(',')}|${radius}`
}
function getCached(key) {
  const entry = _placesCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _placesCache.delete(key); return null }
  return entry.places
}
function setCache(key, places) {
  _placesCache.set(key, { places, ts: Date.now() })
}

// ---------- Component ----------

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
  // Places search only runs after the user explicitly drags or clicks "Find places"
  const [searchEnabled, setSearchEnabled] = useState(false)

  // ---------- Refine / filters UI state ----------
  const CATEGORY_OPTIONS = [
    'restaurant', 'cafe', 'bar', 'tourist_attraction', 'museum', 'park', 'library',
    'book_store', 'bakery', 'art_gallery', 'gym', 'spa', 'movie_theater', 'zoo',
    'aquarium', 'shopping_mall', 'garden', 'confectionery', 'historical_place',
    'monument', 'sculpture', 'cultural_center', 'art_studio', 'ice_cream_shop'
  ]

  const [selectedTypes, setSelectedTypes] = useState([
    'restaurant', 'cafe', 'bar', 'tourist_attraction', 'museum', 'park', 'library',
    'book_store', 'bakery', 'art_gallery', 'gym', 'spa', 'movie_theater', 'zoo',
    'aquarium', 'shopping_mall', 'garden', 'confectionery', 'historical_place',
    'monument', 'sculpture', 'cultural_center', 'art_studio', 'ice_cream_shop'
  ])
  const PRICE_OPTIONS = [1, 2, 3, 4]
  const [selectedPriceLevels, setSelectedPriceLevels] = useState([])
  const [minRating, setMinRating] = useState(0)
  const [rankPreference, setRankPreference] = useState('POPULARITY')
  const [radiusMeters, setRadiusMeters] = useState(750)
  const [showRefine, setShowRefine] = useState(false)
  const [filtersVersion, setFiltersVersion] = useState(0)

  // ---------- Orchestrator refs ----------
  const lastSearchLocRef = useRef(null)
  const inFlightRef = useRef(false)
  const debounceTimerRef = useRef(null)
  const lastFiltersVersionRef = useRef(0)
  const MIN_MOVE_METERS = 75
  const DEBOUNCE_MS = 500

  const distanceMeters = (a, b) => {
    if (!a || !b) return Infinity
    const toRad = (deg) => (deg * Math.PI) / 180
    const R = 6371000
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
  }

  // ---------- Init map ----------
  useEffect(() => {
    if (window.google && userLocation && !mapInstanceRef.current) {
      setCurrentSearchLocation(userLocation)
      initializeMap()
    }
  }, [userLocation])

  // Location-change effect: visual sync only — no search triggered here
  useEffect(() => {
    if (userLocation && currentSearchLocation && mapInstanceRef.current && markerRef.current) {
      const moved =
        Math.abs(currentSearchLocation.lat - userLocation.lat) > 0.0001 ||
        Math.abs(currentSearchLocation.lng - userLocation.lng) > 0.0001
      if (moved) {
        setCurrentSearchLocation(userLocation)
        mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng })
        markerRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng })
      }
    }
  }, [userLocation, currentSearchLocation])

  // ---------- Search Orchestrator ----------
  // Only runs when searchEnabled — never fires automatically on mount
  useEffect(() => {
    if (!searchEnabled || !currentSearchLocation || !mapInstanceRef.current || !markerRef.current) return

    const filtersChanged = filtersVersion !== lastFiltersVersionRef.current
    const movedEnough = !lastSearchLocRef.current || distanceMeters(lastSearchLocRef.current, currentSearchLocation) >= MIN_MOVE_METERS
    if (!filtersChanged && !movedEnough) return

    lastFiltersVersionRef.current = filtersVersion

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(async () => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      try {
        await searchNearbyPlaces(currentSearchLocation)
        lastSearchLocRef.current = currentSearchLocation
      } finally {
        inFlightRef.current = false
      }
    }, DEBOUNCE_MS)

    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current) }
  }, [currentSearchLocation, filtersVersion, searchEnabled])

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

    const selectedGuide = GUIDES.find(g => g.name === selectedGuideName) || GUIDES[0]
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

    marker.addListener('dragend', (event) => {
      const newLocation = { lat: event.latLng.lat(), lng: event.latLng.lng() }
      setCurrentSearchLocation(newLocation)
      onLocationChange(newLocation)
      reverseGeocode(newLocation.lat, newLocation.lng)
      // First drag enables Places search for this session
      setSearchEnabled(true)
    })

    mapInstanceRef.current = map
    markerRef.current = marker
    setIsLoading(false)
  }

  /** Nearby Search (New API) — single request, checks cache first */
  const searchNearbyPlaces = async (searchLocation = currentSearchLocation || userLocation) => {
    setIsSearchingPlaces(true)

    const types = selectedTypes.length > 0 ? selectedTypes : CATEGORY_OPTIONS
    const key = cacheKey(searchLocation, types, radiusMeters)
    const cached = getCached(key)

    if (cached) {
      setNearbyPlaces(cached)
      setIsSearchingPlaces(false)
      return
    }

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_CONFIG.API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.id,places.location,places.rating,places.priceLevel,places.types,places.formattedAddress'
        },
        body: JSON.stringify({
          includedTypes: types,
          maxResultCount: 20,
          rankPreference,
          locationRestriction: {
            circle: {
              center: { latitude: searchLocation.lat, longitude: searchLocation.lng },
              radius: radiusMeters
            }
          }
        })
      })

      if (!response.ok) throw new Error(`Places API error: ${response.status}`)
      const data = await response.json()
      const processed = processPlaceResults(data.places || [])
      setCache(key, processed)
      setNearbyPlaces(processed)
    } catch (error) {
      console.error('Places API search failed:', error)
    } finally {
      setIsSearchingPlaces(false)
    }
  }

  /** Normalize + dedupe + sort */
  const processPlaceResults = (places) => {
    return places
      .filter((place, idx, self) => idx === self.findIndex(p => p.id === place.id))
      .map(place => ({
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
      }))
      .sort((a, b) => {
        const ra = a.rating ?? 3.5
        const rb = b.rating ?? 3.5
        if (rb !== ra) return rb - ra
        return (a.name || '').localeCompare(b.name || '')
      })
      .slice(0, 20)
  }

  /** Reverse geocode for address label — only fires on dragend, not continuous drag */
  const reverseGeocode = (lat, lng) => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        onLocationNameChange(results[0].formatted_address)
      }
    })
  }

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

  const handleFindPlaces = () => {
    setSearchEnabled(true)
    // If already enabled, force a re-run by resetting the last search location
    lastSearchLocRef.current = null
    setFiltersVersion(v => v + 1)
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
                        <p className="text-sm font-medium text-gray-700 truncate">{place.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {place.rating && (
                            <span className="text-xs text-gray-600">☆ {place.rating.toFixed(1)}</span>
                          )}
                          {typeof place.price_level === 'number' && (
                            <span className="text-xs text-gray-500">{'$'.repeat(place.price_level)}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {(place.types || [])[0] ? place.types[0].replaceAll('_', ' ') : 'Place'}
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
                {isSearchingPlaces ? 'Searching for nearby places...' : !searchEnabled ? '' : 'No places found nearby'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-2 mb-2 flex gap-2">
        {!searchEnabled && !isSearchingPlaces && (
          <button
            onClick={handleFindPlaces}
            className="flex-1 py-3 px-4 bg-white border border-customPurple text-customPurpleText rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
          >
            Find places nearby
          </button>
        )}
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
            setFiltersVersion(v => v + 1)
            setSearchEnabled(true)
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

// ---------- Refine Search Modal ----------

const RefineSearchModal = ({ onClose, onApply, initial, CATEGORY_OPTIONS, PRICE_OPTIONS }) => {
  const [step, setStep] = useState(1)
  const [types, setTypes] = useState(initial.types || [])
  const [prices, setPrices] = useState(initial.prices || [])
  const [rating, setRating] = useState(initial.rating ?? 0)
  const [rank, setRank] = useState(initial.rank || 'POPULARITY')
  const [radius, setRadius] = useState(initial.radius || 750)

  const toggle = (arr, val) => (arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  const canNextFromStep1 = types.length > 0

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

        <div className="absolute top-6 right-6">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close modal">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex justify-between items-center mb-6 mt-8">
          <h2 className="text-2xl font-bold text-customPurpleText">Refine Search</h2>
          <p className="text-sm text-gray-500">Step {step} of 3</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-800">{getStepTitle()}</h3>

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
                      className="rounded border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent"
                      style={{ accentColor: '#bdbdbd' }}
                    />
                    <span className="capitalize">{t.replaceAll('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {PRICE_OPTIONS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-base text-gray-800">
                    <input
                      type="checkbox"
                      checked={prices.includes(p)}
                      onChange={() => setPrices(prev => toggle(prev, p))}
                      className="rounded border-gray-300 text-customPurple focus:ring-2 focus:ring-customPurple focus:ring-offset-0 focus:border-transparent"
                      style={{ accentColor: '#bdbdbd' }}
                    />
                    <span>{'$'.repeat(p)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
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

        <div className="flex space-x-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
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
              onClick={() => setStep(s => s + 1)}
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
            onClick={() => onApply({ types, prices, rating, rank, radius })}
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
