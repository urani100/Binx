/**
 * Application Constants for BiNx React App
 * Purpose: Centralized configuration and constant values
 * Author: ML
 * Date: August 8, 2025
 */

// API Endpoints (Supabase Edge Functions)
const _supabaseBase = import.meta.env.VITE_SUPABASE_URL
export const API_ENDPOINTS = {
    WEATHER:                `${_supabaseBase}/functions/v1/weather`,
    GEOCODE:                `${_supabaseBase}/functions/v1/geocode`,
    RECOMMENDATIONS:        `${_supabaseBase}/functions/v1/recommendations`,
    SEED_TASTE_PROFILE:     `${_supabaseBase}/functions/v1/seed-taste-profile`,
    UPDATE_TASTE_PROFILE:   `${_supabaseBase}/functions/v1/update-taste-profile`,
    CHECK_REC_PROXIMITY:    `${_supabaseBase}/functions/v1/check-recommendation-proximity`,
    COMPUTE_TASTE_SUMMARY:  `${_supabaseBase}/functions/v1/compute-taste-summary`,
    RECOMMENDATION_SESSION: `${_supabaseBase}/functions/v1/recommendation-session`,
  }
  
  // Google Maps Configuration (Restricted Frontend Key)
  export const GOOGLE_MAPS_CONFIG = {
    API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    LIBRARIES: ['geometry', 'places'],
    SCRIPT_URL: 'https://maps.googleapis.com/maps/api/js'
  }
  
  // Vibe Tags for Pin Creation
  export const MOOD_CATEGORIES = ['bright', 'calm', 'intense', 'dark', 'warm']

  export const MOODS = [
    { name: 'Blissful',      sub: 'peak happiness',      cat: 'bright',  tags: ['joy','peace','euphoria'],              desc: 'A state of profound happiness where everything feels perfectly right — weightless, warm, and wonderfully complete.' },
    { name: 'Contemplative', sub: 'deep in thought',     cat: 'calm',    tags: ['reflective','pensive','wondering'],    desc: 'Quiet, inward focus — the mind turns over ideas slowly, like stones in a clear stream, unhurried and curious.' },
    { name: 'Curious',       sub: 'lit with wonder',     cat: 'bright',  tags: ['wondering','eager','open'],            desc: 'An alert, leaning-forward feeling. Every new detail opens another door. The world is a puzzle worth solving.' },
    { name: 'Electric',      sub: 'charged up',          cat: 'intense', tags: ['energy','buzzing','alive'],            desc: 'The nervous system crackles. Thoughts arrive faster than words. Something big is about to happen.' },
    { name: 'Ecstatic',      sub: 'beyond joy',          cat: 'intense', tags: ['euphoric','wild','exhilarated'],      desc: 'Joy that exceeds its container — laughter spilling out, arms wide open, a fullness that almost hurts.' },
    { name: 'Grateful',      sub: 'heart full',          cat: 'warm',    tags: ['thankful','appreciative','moved'],     desc: 'A soft warmth for what has been given — people, moments, luck. The feeling of not taking things for granted.' },
    { name: 'Intimate',      sub: 'close and safe',      cat: 'warm',    tags: ['tender','vulnerable','close'],         desc: 'A quiet sharing of unguarded selves. Words come gently. Time slows. The other person is truly seen.' },
    { name: 'Jovial',        sub: 'infectious cheer',    cat: 'bright',  tags: ['merry','buoyant','warm'],              desc: 'Cheerfulness that radiates outward — laughter comes easily, generosity flows, and the room gets lighter.' },
    { name: 'Luminous',      sub: 'glowing, radiant',    cat: 'bright',  tags: ['shining','clear','vivid'],             desc: 'A quality of inner brightness — clarity, presence, and a glow that softens everything around it.' },
    { name: 'Moody',         sub: 'shifting inward',     cat: 'dark',    tags: ['brooding','complex','fluctuating'],   desc: 'An emotional climate with its own weather — sudden cloud cover, pockets of strange beauty, hard to explain.' },
    { name: 'Pensive',       sub: 'quietly weighed',     cat: 'calm',    tags: ['thoughtful','wistful','reflective'],  desc: 'Gentle sadness mingled with thinking. A pause at the window. The kind of quiet that asks real questions.' },
    { name: 'Playful',       sub: 'light and free',      cat: 'bright',  tags: ['fun','light','spontaneous'],           desc: 'Gravity loosens its grip. Rules become suggestions. Everything is a prop in an improvised game.' },
    { name: 'Radiant',       sub: 'warmth outward',      cat: 'bright',  tags: ['warm','beaming','luminous'],           desc: 'Light from the inside out — presence that others can feel, warmth that doesn\'t demand anything back.' },
    { name: 'Rhapsodic',     sub: 'swept away',          cat: 'intense', tags: ['transported','rapturous','effusive'], desc: 'Lost in something beautiful — music, a view, a sentence. The self dissolves briefly into pure experience.' },
    { name: 'Serene',        sub: 'still waters',        cat: 'calm',    tags: ['peaceful','untroubled','clear'],      desc: 'Stillness without emptiness. A calm that has been earned — deep, settled, like an unruffled lake at dawn.' },
    { name: 'Soft',          sub: 'open and gentle',     cat: 'calm',    tags: ['tender','yielding','gentle'],          desc: 'Edges blurred, voice lowered, nothing urgent. A feeling that leaves room for others to be imperfect.' },
    { name: 'Vibrant',       sub: 'fully alive',         cat: 'intense', tags: ['vivid','alive','energetic'],           desc: 'Maximum saturation — colors brighter, sounds sharper, presence complete. Everything feels worth noticing.' },
    { name: 'Whimsical',     sub: 'delightfully odd',    cat: 'bright',  tags: ['fanciful','quirky','light'],           desc: 'A sideways glance at ordinary things. Delight in the unexpected. Possibility hiding in plain sight.' },
    { name: 'Wistful',       sub: 'sweet longing',       cat: 'dark',    tags: ['nostalgic','yearning','tender'],       desc: 'Memory touched with longing — love for something that can\'t be retrieved, but wouldn\'t be erased.' },
    { name: 'Fierce',        sub: 'burning intent',      cat: 'intense', tags: ['powerful','determined','blazing'],    desc: 'A focused, unsentimental energy. Obstacles become fuel. No apologies, no detours, pure forward motion.' },
    { name: 'Tender',        sub: 'open-hearted',        cat: 'warm',    tags: ['gentle','loving','vulnerable'],        desc: 'Caring without armor — the particular softness that comes when something or someone is precious.' },
    { name: 'Melancholic',   sub: 'beautifully sad',     cat: 'dark',    tags: ['sad','wistful','bittersweet'],        desc: 'Sadness that has found its shape — no longer just pain, but something you could hold and turn over.' },
    { name: 'Eager',         sub: 'forward-leaning',     cat: 'bright',  tags: ['ready','enthusiastic','anticipating'],desc: 'The feeling just before the starting gun. Everything aimed forward, nothing held in reserve.' },
    { name: 'Reverent',      sub: 'awed and humbled',    cat: 'calm',    tags: ['awed','sacred','humble'],              desc: 'Standing before something vast — nature, genius, love — and feeling small in the very best way.' },
    { name: 'Giddy',         sub: 'dizzy with delight',  cat: 'bright',  tags: ['silly','elated','bubbling'],           desc: 'Delight with a wobble in it — laughter without a clear cause, lightness that tips toward dizzy.' },
    { name: 'Brooding',      sub: 'heavy and slow',      cat: 'dark',    tags: ['dark','introspective','weighty'],     desc: 'Thoughts that circle back and go deeper. A gathering of emotional pressure, looking for its release.' },
    { name: 'Nostalgic',     sub: 'past made present',   cat: 'warm',    tags: ['longing','remembering','bittersweet'],desc: 'The past arriving uninvited — a song, a smell, a color — and suddenly you\'re somewhere you can\'t go back to.' },
    { name: 'Euphoric',      sub: 'pure overflow',       cat: 'intense', tags: ['peak','elated','boundless'],           desc: 'Joy without friction — the kind that makes you want to tell a stranger. Briefly, everything is permitted.' },
    { name: 'Languid',       sub: 'slow and warm',       cat: 'calm',    tags: ['unhurried','dreamy','relaxed'],        desc: 'Time stretched like taffy on a summer afternoon. No urgency, no resistance — just warmth and ease.' },
    { name: 'Resolute',      sub: 'firmly decided',      cat: 'intense', tags: ['determined','committed','unshakable'],desc: 'The quiet after a hard decision — clarity replacing doubt, direction chosen, no looking back.' },
    { name: 'Awestruck',     sub: 'stopped in place',    cat: 'calm',    tags: ['wonder','reverence','stunned'],        desc: 'The moment a view, a performance, or a realization simply stops you — mind blank, breath held, time paused.' },
    { name: 'Anxious',       sub: 'a restless hum',      cat: 'dark',    tags: ['nervous','worried','anticipating'],   desc: 'Thoughts racing ahead of facts. The future arriving in fragments, none of them quite right yet.' },
    { name: 'Effervescent',  sub: 'sparkling over',      cat: 'bright',  tags: ['bubbly','lively','sparkling'],         desc: 'Energy that can\'t sit still — thoughts and words fizzing upward like carbonation looking for the surface.' },
    { name: 'Devoted',       sub: 'wholly committed',    cat: 'warm',    tags: ['loyal','loving','steadfast'],          desc: 'Love that doesn\'t ask what it gets back. Presence that shows up regardless.' },
    { name: 'Dreamy',        sub: 'half somewhere else', cat: 'calm',    tags: ['drifting','hazy','imaginative'],       desc: 'Attention pooling in the middle distance. Boundaries softened. The real and imagined briefly roommates.' },
    { name: 'Defiant',       sub: 'refusing to yield',   cat: 'intense', tags: ['resistant','bold','unyielding'],      desc: 'Standing opposite the current. The \'no\' that costs something but means something.' },
    { name: 'Magnetic',      sub: 'drawing others in',   cat: 'intense', tags: ['compelling','charismatic','powerful'],desc: 'An energy that bends the room. People lean in. Whatever you\'re doing, they want to be near it.' },
    { name: 'Tranquil',      sub: 'deeply at rest',      cat: 'calm',    tags: ['peaceful','still','settled'],          desc: 'Rest that reaches all the way down — no background noise, no pending things, just presence without agenda.' },
    { name: 'Sentimental',   sub: 'moved by the past',   cat: 'warm',    tags: ['nostalgic','touched','warm'],          desc: 'Emotions rising to the surface at the sight of something ordinary — a photo, a song, a particular smell.' },
    { name: 'Galvanized',    sub: 'moved to action',     cat: 'intense', tags: ['motivated','activated','energized'],  desc: 'Something clicked. Hesitation dissolved. The body has already decided and the mind is just catching up.' },
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