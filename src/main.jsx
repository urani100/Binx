import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Import Font Awesome CSS (Enterprise approach - no CDN)
import '@fortawesome/fontawesome-free/css/all.min.css'

// Load Google Maps API with restricted frontend key
const loadGoogleMaps = () => {
  return new Promise((resolve) => {
    if (window.google) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyDkK930rjzJoTr7xQSWvrd5r3O3N-d2Puw&libraries=geometry';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
};

loadGoogleMaps().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
});