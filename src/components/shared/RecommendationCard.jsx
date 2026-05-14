import React from 'react'
import PropTypes from 'prop-types'

const RecommendationCard = ({ recommendation, onSave, onRemove, onDirections, isSaved, showSavedDate }) => (
    <div className="rounded-xl p-4 transition-all bg-gray-50 w-full">
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-gray-900 text-sm">{recommendation.name}</h4>
            <div className="flex items-center space-x-1">
                {recommendation.ai_confidence !== undefined && (
                    <span className="text-xs text-gray-500">
                        {Math.round(recommendation.ai_confidence * 100)}%
                    </span>
                )}
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

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>
                {recommendation.estimated_minutes != null ? `${recommendation.estimated_minutes} min` : ''}
                {recommendation.distance_km != null ? ` · ${recommendation.distance_km}km` : ''}
            </span>
            <span>{recommendation.current_status}</span>
        </div>

        {showSavedDate && recommendation.saved_at && (
            <p className="text-xs text-gray-400 mb-3">
                Saved {new Date(recommendation.saved_at).toLocaleDateString()}
            </p>
        )}

        <div className="flex space-x-3">
            {!isSaved && onSave && (
                <button
                    onClick={onSave}
                    className="flex-1 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
                >
                    Save
                </button>
            )}
            <button
                onClick={onDirections}
                className="flex-1 py-3 px-4 bg-customPurpleText text-white rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
            >
                Directions
            </button>
        </div>
    </div>
)

RecommendationCard.propTypes = {
    recommendation: PropTypes.object.isRequired,
    onSave: PropTypes.func,
    onRemove: PropTypes.func,
    onDirections: PropTypes.func.isRequired,
    isSaved: PropTypes.bool,
    showSavedDate: PropTypes.bool
}

export default RecommendationCard
