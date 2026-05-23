import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GOOGLE_MAPS_CONFIG } from './utils/constants'
import '@fortawesome/fontawesome-free/css/all.min.css'

const vibeMatch = window.location.pathname.match(/^\/view\/([A-Za-z0-9_-]+)$/)
const vibeToken = vibeMatch ? vibeMatch[1] : null

if (vibeToken) {
  // Public vibe share page — no auth, no Google Maps needed
  import('./components/shared/VibePage.jsx').then(({ default: VibePage }) => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <VibePage token={vibeToken} />
      </React.StrictMode>
    )
  })
} else {
  const loadGoogleMaps = () => {
    return new Promise((resolve) => {
      if (window.google) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.API_KEY}&libraries=geometry`
      script.async = true
      script.defer = true
      script.onload = resolve
      document.head.appendChild(script)
    })
  }

  loadGoogleMaps().then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
}
