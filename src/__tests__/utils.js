/**
 * Testing Utilities for BiNx React App
 * Purpose: Provide common testing helpers and mock data
 * Author: ML
 * Date: August 8, 2025
 */

 import { render } from '@testing-library/react'
 import { ErrorBoundary } from 'react-error-boundary'
 import { renderHook } from './hookUtils'
 
 // Mock user data for testing
 export const mockUser = {
   id: 'test-user-123',
   email: 'test@example.com',
   name: 'Test User',
   profilePic: null,
   profile: {
     alterEgo: 'Test Ego',
     currentResidence: 'Test City',
     occupation: 'Tester',
     currentlyReading: 'Test Book',
     lastMovieWatched: 'Test Movie',
     nextMovie: 'Next Test Movie',
     currentlyWearing: 'Test Clothes',
     favoriteBrand: 'Test Brand',
     favoriteAuthors: 'Test Authors',
     favoriteVibe: 'Test Vibe',
     idealSunday: 'Testing',
     onboardingCompleted: true
   }
 }
 
 // Mock pin data for testing
 export const mockPin = {
   id: '1',
   userId: 'test-user-123',
   title: 'Test Pin',
   location: {
     name: 'Test Location',
     lat: 48.8566,
     lng: 2.3522
   },
   mood: 'contemplative',
   note: 'This is a test pin note',
   photo: null,
   audioUrl: null,
   timestamp: new Date(),
   culturalContext: 'Test Context'
 }
 
 // Mock location data for testing
 export const mockLocation = {
   lat: 48.8566,
   lng: 2.3522,
   temperature: 20,
   condition: 'Sunny',
   weatherIcon: '//cdn.weatherapi.com/weather/64x64/day/116.png',
   city: 'Paris',
   locality: 'Paris',
   sublocality: 'Test District',
   state: 'Île-de-France',
   country: 'France',
   displayLocation: 'Paris',
   address: 'Paris, France'
 }
 
 // Custom render function with error boundary
 export const renderWithErrorBoundary = (ui, options = {}) => {
   const ErrorFallback = ({ error }) => (
     <div role="alert">
       <h2>Something went wrong:</h2>
       <pre>{error.message}</pre>
     </div>
   )
 
   const Wrapper = ({ children }) => (
     <ErrorBoundary FallbackComponent={ErrorFallback}>
       {children}
     </ErrorBoundary>
   )
 
   return render(ui, { wrapper: Wrapper, ...options })
 }
 
 // Create mock file for testing file uploads
 export const createMockFile = (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
   const file = new File(['test file content'], name, { type })
   Object.defineProperty(file, 'size', { value: size })
   return file
 }
 
 // Mock FileReader result
 export const mockFileReaderResult = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD'
 
 // Helper to create mock audio blob
 export const createMockAudioBlob = () => {
   return new Blob(['mock audio data'], { type: 'audio/wav' })
 }
 
 // Helper to wait for async operations in tests
 export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))
 
 // Mock API responses
 export const mockApiResponses = {
   weather: {
     current: {
       temp_c: 20,
       condition: {
         text: 'Sunny',
         icon: '//cdn.weatherapi.com/weather/64x64/day/116.png'
       }
     }
   },
   geocoding: {
     results: [
       {
         formatted_address: 'Paris, France',
         address_components: [
           {
             long_name: 'Paris',
             types: ['locality', 'political']
           },
           {
             long_name: 'France',
             types: ['country', 'political']
           }
         ]
       }
     ],
     status: 'OK'
   },
   places: {
     places: [
       {
         id: 'test-place-1',
         displayName: { text: 'Test Restaurant' },
         location: { latitude: 48.8566, longitude: 2.3522 },
         rating: 4.5,
         types: ['restaurant'],
         formattedAddress: 'Test Address, Paris'
       }
     ]
   }
 }
 
 // Helper to mock fetch responses
 export const mockFetch = (response) => {
   global.fetch = vi.fn(() =>
     Promise.resolve({
       ok: true,
       json: () => Promise.resolve(response),
     })
   )
 }
 
 // Clean up mocks after each test
 export const cleanupMocks = () => {
   vi.clearAllMocks()
   if (global.fetch && typeof global.fetch.mockRestore === 'function') {
     global.fetch.mockRestore()
   }
 }