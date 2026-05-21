import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from '../../hooks/useLocation'
import { useUIStore } from '../../store/uiStore'
import * as recommendationService from '../../services/recommendationService'
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

const RecommendationsModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth()
  const { userLocation } = useLocation()

  const hasAutoTriggeredRef = useRef(false)
  const currentScrollRef = useRef(null)

  const recommendationsModal = useUIStore(state => state.recommendationsModal)
  const showMessage = useUIStore(state => state.showMessageModal)
  const addToSavedRecommendations = useUIStore(state => state.addToSavedRecommendations)
  const removeFromCurrentRecommendations = useUIStore(state => state.removeFromCurrentRecommendations)

  const [showRefine, setShowRefine] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [activeFilters, setActiveFilters] = useState(null)

  // Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [isOpen])

  // Auto-trigger on open; abort on close
  useEffect(() => {
    if (!isOpen) {
      hasAutoTriggeredRef.current = false
      recommendationService.abort()
      return
    }
    if (hasAutoTriggeredRef.current) return
    if (recommendationsModal.currentRecommendations.length > 0) return
    hasAutoTriggeredRef.current = true
    recommendationService.generate({ filters: activeFilters })
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    recommendationService.refresh({ filters: activeFilters })
  }

  const handleGetDirections = (rec) => {
    recommendationService.writeFeedback(rec, 'directions')
    const address = encodeURIComponent(rec.address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
  }

  const handleSaveRecommendation = async (recommendation) => {
    const already = recommendationsModal.savedRecommendations.find(r => r.name === recommendation.name)
    if (already) return

    addToSavedRecommendations(recommendation)

    // Read fresh state after store update to avoid stale snapshot
    const fresh = useUIStore.getState().recommendationsModal.savedRecommendations
    await updateProfile({ savedLocations: fresh })
    showMessage('Saved', `${recommendation.name} added to your saved recommendations`)
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
              {loading && currentRecommendations.length === 0
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
          <div className="flex items-center gap-3 px-6 mb-6">
            <button
              onClick={() => setShowRefine(true)}
              className="flex-1 py-3 px-6 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90"
            >
              Refine Recommendations
            </button>
            {activeFilters && (
              <button
                onClick={() => {
                  setActiveFilters(null)
                  recommendationService.generate({ filters: null })
                }}
                className="text-customPurpleText font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Initial loading — no cards yet */}
          {loading && currentRecommendations.length === 0 && (
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
                onClick={() => recommendationService.generate({ filters: activeFilters })}
                className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty state — not loading, no error, no cards */}
          {!loading && !error && currentRecommendations.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-compass text-gray-400"></i>
              </div>
              <p className="text-gray-500 text-sm mb-4">No recommendations yet</p>
              <button
                onClick={() => recommendationService.generate({ filters: activeFilters })}
                className="bg-customPurple text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:opacity-90"
              >
                Generate Recommendations
              </button>
            </div>
          )}

          {/* Cards — visible as soon as first batch arrives, even while still streaming */}
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
                  {currentRecommendations.map((rec) => (
                    <RecommendationCard
                      key={rec.name}
                      recommendation={rec}
                      onSave={() => handleSaveRecommendation(rec)}
                      onDirections={() => handleGetDirections(rec)}
                      onLike={() => recommendationService.writeFeedback(rec, 'like')}
                      onDismiss={() => {
                        recommendationService.writeFeedback(rec, 'dismiss')
                        removeFromCurrentRecommendations(rec.name)
                      }}
                      isSaved={savedRecommendations.some(saved => saved.name === rec.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Streaming indicator — shown while more cards are still arriving */}
              {loading && (
                <div className="flex justify-center mt-4">
                  <i className="fas fa-spinner fa-spin text-customPurpleText text-sm"></i>
                </div>
              )}
            </div>
          )}

          {/* Saved Locations button */}
          {savedRecommendations.length > 0 && (
            <div className="flex items-center px-6 mb-6">
              <button
                onClick={() => setShowSaved(true)}
                className="flex-1 py-3 px-6 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90"
              >
                Saved Recommendations
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
            recommendationService.generate({ filters })
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
