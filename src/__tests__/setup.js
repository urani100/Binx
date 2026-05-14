import '@testing-library/jest-dom'

// Mock Supabase to avoid real network calls in tests
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(() => ({ data: { session: null }, error: null }))
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } })),
        remove: vi.fn().mockResolvedValue({ data: {}, error: null })
      }))
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  }
}))

// Mock Google Maps API
global.google = {
  maps: {
    Map: vi.fn(() => ({
      setCenter: vi.fn(),
      setZoom: vi.fn()
    })),
    Marker: vi.fn(() => ({
      setPosition: vi.fn(),
      addListener: vi.fn()
    })),
    Geocoder: vi.fn(() => ({
      geocode: vi.fn()
    })),
    places: {
      PlacesService: vi.fn(() => ({
        textSearch: vi.fn(),
        nearbySearch: vi.fn()
      })),
      PlacesServiceStatus: {
        OK: 'OK'
      }
    },
    geometry: {
      spherical: {
        computeDistanceBetween: vi.fn()
      }
    },
    LatLng: vi.fn((lat, lng) => ({ lat: () => lat, lng: () => lng })),
    Size: vi.fn(),
    Point: vi.fn()
  }
}

// Mock geolocation
global.navigator.geolocation = {
  getCurrentPosition: vi.fn((success) => {
    success({
      coords: {
        latitude: 48.8566,
        longitude: 2.3522
      }
    })
  }),
  watchPosition: vi.fn(),
  clearWatch: vi.fn()
}

// Mock MediaRecorder for audio recording tests
global.MediaRecorder = vi.fn(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: vi.fn(),
  onstop: vi.fn(),
  onerror: vi.fn(),
  state: 'inactive'
}))

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve({
    getTracks: () => [
      {
        stop: vi.fn(),
        label: 'mock-audio-track'
      }
    ]
  }))
}

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock FileReader for image uploads
global.FileReader = vi.fn(() => ({
  readAsDataURL: vi.fn(),
  onload: vi.fn(),
  result: 'data:image/jpeg;base64,mock-base64-data'
}))

global.window.fs = {
  readFile: vi.fn(() => Promise.resolve(new Uint8Array()))
}

const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
