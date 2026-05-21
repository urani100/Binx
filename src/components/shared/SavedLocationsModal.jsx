import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store/uiStore'
import RecommendationCard from './RecommendationCard'
import DeleteConfirmModal from '../pins/DeleteConfirmModal'

const SavedLocationsModal = ({ isOpen, onClose }) => {
    const { updateProfile } = useAuth()
    const recommendationsModal = useUIStore(state => state.recommendationsModal)
    const removeFromSavedRecommendations = useUIStore(state => state.removeFromSavedRecommendations)
    const showMessage = useUIStore(state => state.showMessageModal)

    const { savedRecommendations } = recommendationsModal
    const [pendingRemoval, setPendingRemoval] = useState(null)

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

    const handleRemove = async (recommendationName) => {
        removeFromSavedRecommendations(recommendationName)
        const fresh = useUIStore.getState().recommendationsModal.savedRecommendations
        await updateProfile({ savedLocations: fresh })
        showMessage('Removed', 'Recommendation removed from saved list')
    }

    const handleDirections = (recommendation) => {
        const address = encodeURIComponent(recommendation.address)
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${address}`, '_blank')
    }

    if (!isOpen) return null

    return (
        <>
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="w-5" />
                    <h3 className="text-xl font-semibold text-customPurpleText">Saved Recommendations</h3>
                    <button
                        onClick={onClose}
                        className="text-customPurpleText transition-colors"
                        aria-label="Close saved locations"
                    >
                        ✕
                    </button>
                </div>

                {/* Empty state */}
                {savedRecommendations.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-bookmark text-gray-400"></i>
                        </div>
                        <p className="text-gray-500 text-sm">No saved locations yet.</p>
                        <p className="text-gray-400 text-xs mt-1">Save recommendations to see them here.</p>
                    </div>
                )}

                {/* Saved list */}
                {savedRecommendations.length > 0 && (
                    <div className="flex flex-col gap-4">
                        {savedRecommendations.map((rec) => (
                            <RecommendationCard
                                key={rec.name}
                                recommendation={rec}
                                onRemove={() => setPendingRemoval(rec)}
                                onDirections={() => handleDirections(rec)}
                                isSaved={true}
                                showSavedDate={true}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>

        <DeleteConfirmModal
            isOpen={!!pendingRemoval}
            pin={pendingRemoval ? {
                title: pendingRemoval.name,
                location: { name: pendingRemoval.address },
                note: pendingRemoval.vibe_match_reason
            } : null}
            onConfirm={() => { handleRemove(pendingRemoval.name); setPendingRemoval(null) }}
            onCancel={() => setPendingRemoval(null)}
        />
        </>
    )
}

SavedLocationsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired
}

export default SavedLocationsModal
