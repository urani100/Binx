import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { VibeTag } from '../ui'
import CustomAudioPlayer from './CustomAudioPlayer'
import { formatTimestamp, applyTheme } from '../../utils/helpers'
import { API_ENDPOINTS, PALETTES } from '../../utils/constants'
import { edgeFunctionHeaders } from '../../services/supabase'

const VibePage = ({ token }) => {
  const [data, setData] = useState(null)
  const [errorType, setErrorType] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_ENDPOINTS.GET_SHARED_PIN}?token=${encodeURIComponent(token)}`, { headers: edgeFunctionHeaders })
      .then(res => {
        if (!res.ok) return res.json().then(e => Promise.reject(e))
        return res.json()
      })
      .then(setData)
      .catch(err => setErrorType(err.expired ? 'expired' : 'notfound'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (data?.share?.palette) {
      const palette = PALETTES.find(p => p.name === data.share.palette)
      if (palette) applyTheme(palette)
    }
  }, [data])

  if (loading) {
    return (
      <div className="max-w-sm mx-auto min-h-screen bg-customBackground flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading vibe...</p>
      </div>
    )
  }

  if (errorType) {
    return (
      <div className="max-w-sm mx-auto min-h-screen bg-customBackground flex items-center justify-center p-4 relative">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <img src="/Binx2.png" alt="BiNx" className="w-16 h-16 rounded-full mx-auto mb-4" />
          <p className="text-sm text-gray-500">This vibe expired...</p>
        </div>
        <footer className="absolute bottom-0 left-0 right-0 py-4">
          <p className="text-center text-sm text-gray-400">© 2026 binx.social</p>
        </footer>
      </div>
    )
  }

  const { pin, share } = data
  const { date, time } = formatTimestamp(pin.timestamp)

  const expiryDate = new Date(share.expiresAt).toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: '2-digit'
  })
  const expiryTime = new Date(share.expiresAt).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-customBackground flex items-center justify-center p-4 overflow-y-auto relative">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left">

        {/* BiNx stamp */}
        <div className="flex justify-center mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-customPurpleText tracking-widest">BiNx</div>
          </div>
        </div>

        {/* Pin title and info */}
        <div className="mb-6">
          <h1 className="text-xl font-medium text-gray-900 mb-2">{pin.title}</h1>
          <p className="text-sm text-gray-500 mb-1">{pin.location?.name}</p>
          <p className="text-xs text-gray-400">{date} at {time}</p>
        </div>

        {/* Vibe tag */}
        <div className="mb-6">
          <VibeTag vibe={pin.mood} size="lg" />
        </div>

        {/* Photo */}
        {pin.photo && (
          <img
            src={pin.photo}
            alt="Pin photo"
            className="w-full h-80 object-cover rounded-xl mb-6"
          />
        )}

        {/* Note */}
        <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          <p className="text-sm text-gray-900 leading-relaxed">{pin.note}</p>
        </div>

        {/* Audio */}
        {pin.audioUrl && pin.audioUrl !== 'demo-audio' && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
            <CustomAudioPlayer src={pin.audioUrl} />
          </div>
        )}

        {/* Expiry */}
        <div className="border-t border-gray-100 pt-5 mt-2">
          <p className="text-sm text-gray-400 text-center">
            This vibe expires on {expiryDate} at {expiryTime}
          </p>
        </div>
      </div>
      <footer className="absolute bottom-0 left-0 right-0 py-4">
        <p className="text-center text-sm text-gray-400">© 2026 binx.social</p>
      </footer>
    </div>
  )
}

VibePage.propTypes = {
  token: PropTypes.string.isRequired
}

export default VibePage
