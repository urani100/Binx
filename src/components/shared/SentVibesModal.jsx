import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { getMyShares, revokeShare } from '../../services/shareService'

const SentVibesModal = ({ isOpen, onClose }) => {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [revokingId, setRevokingId] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    getMyShares()
      .then(setShares)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [isOpen])

  const handleCopyLink = async (share) => {
    await navigator.clipboard.writeText(`https://binx.social/vibe/${share.token}`)
    setCopiedId(share.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async (shareId) => {
    setRevokingId(shareId)
    try {
      await revokeShare(shareId)
      setShares(prev => prev.filter(s => s.id !== shareId))
    } catch (err) {
      console.error('Revoke failed:', err)
    } finally {
      setRevokingId(null)
    }
  }

  const isExpired = (expiresAt) => new Date(expiresAt) < new Date()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="sent-vibes-title">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left max-h-[90vh] overflow-y-auto">

        <div className="relative flex items-center justify-center mb-4">
          <h3 id="sent-vibes-title" className="text-xl font-semibold text-customPurpleText">Shared Vibes</h3>
          <button onClick={onClose} className="absolute right-0 text-customPurpleText transition-colors" aria-label="Close">✕</button>
        </div>

        {loading && (
          <p className="text-sm text-customPurpleText font-medium text-center py-8">Loading...</p>
        )}

        {!loading && shares.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-share-alt text-gray-400"></i>
            </div>
            <p className="text-gray-500 text-sm">You haven't shared any vibes yet.</p>
            <p className="text-gray-400 text-xs mt-1">Share a pin to see it here.</p>
          </div>
        )}

        <div className="space-y-3">
          {shares.map(share => {
            const expired = isExpired(share.expires_at)
            const expiryLabel = new Date(share.expires_at).toLocaleDateString('en-US', {
              month: '2-digit', day: '2-digit', year: '2-digit'
            })
            return (
              <div
                key={share.id}
                className={`rounded-xl p-4 border border-gray-100 ${expired ? 'opacity-60' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium text-gray-900 flex-1 mr-2">
                    {share.pins?.title || 'Untitled'}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    expired ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'
                  }`}>
                    {expired ? 'Expired' : 'Active'}
                  </span>
                </div>

                {share.recipient_note && (
                  <p className="text-xs text-gray-500 mb-2 italic">"{share.recipient_note}"</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>
                    {share.view_count === 0 ? 'Not yet opened' : `Seen ${share.view_count}×`}
                  </span>
                  <span>Expires {expiryLabel}</span>
                </div>

                {!expired && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyLink(share)}
                      className="flex-1 py-3 px-4 text-sm bg-customBackground text-customPurpleText rounded-xl font-medium transition-colors hover:opacity-90 flex items-center justify-center"
                    >
                      {copiedId === share.id ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      disabled={revokingId === share.id}
                      className="px-4 py-3 text-sm text-red-400 border border-red-100 rounded-xl font-medium disabled:opacity-40 hover:opacity-90 flex items-center justify-center"
                    >
                      {revokingId === share.id ? '...' : 'Revoke'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

SentVibesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default SentVibesModal
