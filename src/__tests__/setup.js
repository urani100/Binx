/**
 * Test Setup Configuration for BiNx React App
 * Purpose: Configure global test environment and mocks
 * Author: ML
 * Date: August 8, 2025
 */

 import '@testing-library/jest-dom'

 // Mock Firebase to avoid initialization in tests
 vi.mock('../services/firebase', () => ({
   auth: {
     currentUser: null,
     onAuthStateChanged: vi.fn(),
     signInWithEmailAndPassword: vi.fn(),
     createUserWithEmailAndPassword: vi.fn(),
     signOut: vi.fn(),
     updateProfile: vi.fn()
   },
   db: {
     collection: vi.fn(),
     doc: vi.fn(),
     addDoc: vi.fn(),
     deleteDoc: vi.fn(),
     onSnapshot: vi.fn(),
     query: vi.fn(),
     orderBy: vi.fn(),
     setDoc: vi.fn(),
     getDoc: vi.fn()
   },
   storage: {
     ref: vi.fn(),
     uploadBytes: vi.fn(),
     getDownloadURL: vi.fn(),
     deleteObject: vi.fn()
   },
   analytics: {}
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
 
 // Mock window.fs for file operations (if used in original code)
 global.window.fs = {
   readFile: vi.fn(() => Promise.resolve(new Uint8Array()))
 }
 
 // Suppress console errors in tests unless explicitly testing them
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