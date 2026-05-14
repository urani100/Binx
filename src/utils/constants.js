/**
 * Application Constants for BiNx React App
 * Purpose: Centralized configuration and constant values
 * Author: ML
 * Date: August 8, 2025
 */

// API Endpoints (Your secure Firebase Functions)
export const API_ENDPOINTS = {
    WEATHER: 'https://us-east1-binx-3a213.cloudfunctions.net/api/weather',
    GEOCODE: 'https://us-east1-binx-3a213.cloudfunctions.net/api/geocode'
  }
  
  // Google Maps Configuration (Restricted Frontend Key)
  export const GOOGLE_MAPS_CONFIG = {
    API_KEY: 'AIzaSyDkK930rjzJoTr7xQSWvrd5r3O3N-d2Puw',
    LIBRARIES: ['geometry', 'places'],
    SCRIPT_URL: 'https://maps.googleapis.com/maps/api/js'
  }
  
  // Vibe Tags for Pin Creation
  export const VIBES = [
    'blissful',
    'contemplative',
    'curious', 
    'electric',
    'Ecstatic',
    'grateful',
    'intimate',
    'jovial',
    'luminous',
    'moody',
    'Pensive',
    'playful',
    'radiant',
    'rhapsodic',
    'serene',
    'soft',
    'vibrant',
    'whimsical'
  ]
  
  // Color Palettes for Theme Customization
  export const PALETTES = [
    {
      name: 'Prune Armagnac',
      background: '#f2eff9',
      primary: '#d9d2e9',
      text: '#7e6da8'
    },
    {
      name: 'Pistache',
      background: '#d3eadd',
      primary: '#93cca8',
      text: '#559972'
    },
    {
      name: 'Épine Dorée',
      background: '#f7f6e1',
      primary: '#FFE700',
      text: '#e6c600'
    },
    {
      name: 'Tux & Red Bow Tie',
      background: '#FAF9F6',  
      primary: '#000000',     
      text: '#A6171c'         
    },
    {
      name: 'Azimuth',
      background: '#f9cb40',  
      primary: '#ff715b',    
      text: '#4c5b5c'         
    },
    {
      name: 'Periwinkle Blue',
      background: '#d5dbee',
      primary: '#899ac0',
      text: '#4f5b86'
    },
    {
      name: 'The Royal T',    
      background: '#eecde5',   
      primary: '#c1463f',
      text: '#d08732'
    }
  ]
  
  // Guide Characters for User Experience
  export const GUIDES = [
    {
      name: 'Zora',
      svgFile: 'zora.svg',
      mood: 'Cultured Daredevil',
      description: 'Cultured Daredevil'
    },
    {
      name: 'Yann',
      svgFile: 'yann.svg',
      mood: 'Magnetic Muse',
      description: 'Magnetic Muse'
    },
    {
      name: 'Xenia',
      svgFile: 'xenia.svg',
      mood: 'Charming Maverick',
      description: 'Charming Maverick'
    },
    {
      name: 'Salome',
      svgFile: 'salome.svg',
      mood: 'Crimson Alchemist',
      description: 'Crimson Alchemist'
    },
    {
      name: 'Sabina',
      svgFile: 'sabina.svg',
      mood: 'Vibrant Explorer',
      description: 'Vibrant Explorer'
    },
    {
      name: 'Willow',
      svgFile: 'willow.svg',
      mood: 'Zesty Nomad',
      description: 'Zesty Nomad'
    }
  ]
  
  // Demo User for Development and Testing
  export const DEMO_USER = {
    id: 'demo-user-1',
    email: 'binx@urania.fm', 
    name: 'BiNx',
    profilePic: null,
    profile: {
      alterEgo: '',
      currentResidence: '',
      occupation: '',
      currentlyReading: '',
      lastMovieWatched: '',
      nextMovie: '',
      currentlyWearing: '',
      favoriteBrand: '',
      favoriteAuthors: '',
      favoriteVibe: '',
      idealSunday: '',
      onboardingCompleted: false
    }
  }
  
  // Demo Pins for Development
  export const DEMO_PINS = [
    {
      id: 'demo-pin-1',
      userId: 'demo-user-1',
      title: "Golden Hour Gelato",
      location: { 
        name: "Berthillon, Île Saint-Louis", 
        lat: 48.8534, 
        lng: 2.3488 
      },
      mood: "soft",
      note: "The way the lamplight caught the Seine while savoring pistachio gelato. There's something magical about Paris at this hour.",
      photo: "https://placehold.co/200x150/000000/FFFFFF?text=Gelato+Photo",
      audioUrl: null,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      culturalContext: "Parisian evening ritual"
    },
    {
      id: 'demo-pin-2',
      userId: 'demo-user-1',
      title: "Morning Pages Corner",
      location: { 
        name: "Café de Flore, Saint-Germain", 
        lat: 48.8542, 
        lng: 2.3320 
      },
      mood: "contemplative",
      note: "Simone de Beauvoir's ghost lingering in the morning light. Perfect for channeling intellectual energy.",
      photo: null,
      audioUrl: "demo-audio",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      culturalContext: "Literary Paris tradition"
    }
  ]
  
  // Application Settings
  export const APP_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    SUPPORTED_AUDIO_TYPES: ['audio/wav', 'audio/mp4', 'audio/webm'],
    DEFAULT_LOCATION: { lat: 48.8566, lng: 2.3522 }, // Paris fallback
    RECORDING_TIMEOUT: 300000, // 5 minutes max recording
    MAP_SEARCH_RADIUS: 750, // meters
    MAX_PINS_PER_USER: 1000
  }
  
  // Error Messages
  export const ERROR_MESSAGES = {
    AUTH: {
      INVALID_EMAIL: 'Please enter a valid email address',
      WEAK_PASSWORD: 'Password must be at least 6 characters',
      USER_NOT_FOUND: 'No account found with this email',
      WRONG_PASSWORD: 'Incorrect password',
      EMAIL_IN_USE: 'An account already exists with this email',
      NETWORK_ERROR: 'Network error. Please check your connection.'
    },
    PINS: {
      MISSING_TITLE: 'Please add a title for your feeling',
      UPLOAD_FAILED: 'Failed to upload media. Please try again.',
      DELETE_FAILED: 'Failed to delete pin. Please try again.',
      LOAD_FAILED: 'Failed to load pins. Please refresh.'
    },
    LOCATION: {
      PERMISSION_DENIED: 'Location access denied. Please enable location services.',
      UNAVAILABLE: 'Location services unavailable',
      TIMEOUT: 'Location request timed out'
    },
    MEDIA: {
      MIC_PERMISSION_DENIED: 'Microphone access denied. Please allow microphone access.',
      MIC_UNAVAILABLE: 'No microphone found',
      RECORDING_FAILED: 'Recording failed. Please try again.',
      RECORDING_NOT_SUPPORTED: 'Recording not supported in this browser'
    },
    GENERAL: {
      UNKNOWN_ERROR: 'An unexpected error occurred',
      NETWORK_ERROR: 'Network error. Please check your connection.',
      FILE_TOO_LARGE: 'File size too large. Maximum size is 10MB.',
      UNSUPPORTED_FILE_TYPE: 'Unsupported file type'
    }
  }
  
  // Storage Keys for Persistence
  export const STORAGE_KEYS = {
    AUTH: 'binx-auth',
    THEME: 'binx-theme',
    GUIDE: 'binx-guide',
    USER_PREFERENCES: 'binx-preferences'
  }
  
  // Time Formatting
  export const TIME_FORMAT = {
    LOCALE: 'en-US',
    DATE_OPTIONS: { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    },
    TIME_OPTIONS: { 
      hour: '2-digit', 
      minute: '2-digit' 
    }
  }