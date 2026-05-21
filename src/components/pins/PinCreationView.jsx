/**
 * Pin Creation View Component for BiNx React App
 * Purpose: Modal for creating new pins with media upload support
 * Author: MLbbb
 * Date: August 9, 2025
 * Last Updated: August 9, 2025 - Fixed upload architecture to use store
 * Last Updated: August 12, 2025 - Fixed location display to show current location on modal open
 */

 import React, { useState, useEffect } from 'react'
 import PropTypes from 'prop-types'
 import { useAuth } from '../../hooks/useAuth'
 import { useLocation } from '../../hooks/useLocation'
 import { useMediaRecorder } from '../../hooks/useMediaRecorder'
 import { useUIStore } from '../../store/uiStore'
 import { usePinsStore } from '../../store/pinsStore'
 import { VibeTag } from '../ui'
 import { CustomAudioPlayer } from '../shared'
 import { MOODS, MOOD_CATEGORIES, API_ENDPOINTS } from '../../utils/constants'
 import { edgeFunctionHeaders } from '../../services/supabase'
 import { InteractiveLocationPicker } from '../shared'
 
 
 
 /**
  * PinCreationView Component
  * Modal for creating new pins with all functionality:
  * - Photo upload
  * - Audio recording
  * - Location selection
  * - Vibe tagging
  * 
  * Architecture: Component collects data, store handles uploads and saving
  * Updated: August 9, 2025 - Simplified to use store pattern
  */
 const PinCreationView = ({ isOpen, onClose }) => {
   // Hooks for external data and functionality
   const { user } = useAuth()
   const { userLocation, updateLocation } = useLocation()
   const { isRecording, audioUrl, audioBlob, startRecording, stopRecording, clearRecording } = useMediaRecorder()
 
   // Store access - Updated August 9, 2025
   const showMessage = useUIStore(state => state.showMessageModal)
   const selectedGuideName = useUIStore(state => state.selectedGuideName)
   const addPin = usePinsStore(state => state.addPin)
 
   // Local form state for pin creation
   const [newPin, setNewPin] = useState({
     title: '',
     mood: '',
     note: '',
     location: null,
     photo: null
   })
 
   // Additional state for UI management
   const [selectedMood, setSelectedMood] = useState('')
   const [activeCategory, setActiveCategory] = useState('bright')
   const [locationName, setLocationName] = useState('')
   const [isLocationLoading, setIsLocationLoading] = useState(false)
   const [isSearchingLocation, setIsSearchingLocation] = useState(false) // Location search
   const [mapLocation, setMapLocation] = useState(null) // For map marker position
 
   // Sync location name from store whenever userLocation changes.
   // locationStore already reverse-geocodes on init, so we read address directly.
   useEffect(() => {
     if (userLocation?.address) {
       setLocationName(userLocation.address)
     }
   }, [userLocation])
    
   /**
    * Reset form and force current location display when modal opens
    * Updated: August 12, 2025 - Added immediate reverse geocoding to show current location
    */
   
   useEffect(() => {
     if (isOpen) {
 
       // Reset the main form state
       setNewPin({
         title: '',
         mood: '',
         note: '',
         location: null,
         photo: null
       })
 
       // Reset other form fields
       setSelectedMood('')
       setActiveCategory('bright')
       setMapLocation(null) // Reset map location to use current GPS
       
       // Use already-geocoded address from locationStore — no API call needed
       if (userLocation?.address) {
         setLocationName(userLocation.address)
       } else if (userLocation) {
         setLocationName('Current Location')
       } else {
         setLocationName('Getting location...')
       }
 
       // Clear the photo file input
       const photoInput = document.getElementById('photo-upload')
       if (photoInput) {
         photoInput.value = ''
       }
 
       // Clear any existing audio when opening a NEW pin
       if (audioUrl && clearRecording) {
         clearRecording()
       }
     }
   }, [isOpen, userLocation])
 
   /**
    * Calculate distance between two coordinates (Haversine formula)
    */
   const calculateDistance = (lat1, lng1, lat2, lng2) => {
     const R = 6371 // Earth's radius in km
     const dLat = (lat2 - lat1) * Math.PI / 180
     const dLng = (lng2 - lng1) * Math.PI / 180
     const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
     return Math.round(R * c)
   }
 
   /**
    * Forward geocode: Convert address to coordinates
    * Uses secure Supabase Edge Function geocoding endpoint
    */
   const searchLocationByAddress = async (address) => {
     if (!address || address.trim().length === 0) {
       throw new Error('Address is required')
     }
 
     setIsSearchingLocation(true)
 
     try {
       const url = `${API_ENDPOINTS.GEOCODE}?address=${encodeURIComponent(address.trim())}`
       const response = await fetch(url, { headers: edgeFunctionHeaders })
       const data = await response.json()
 
       if (data.results && data.results.length > 0) {
         const result = data.results[0]
         return {
           lat: result.geometry.location.lat,
           lng: result.geometry.location.lng,
           formattedAddress: result.formatted_address
         }
       } else {
         throw new Error('Address not found')
       }
     } catch (error) {
       console.error('Forward geocoding error:', error)
       throw error
     } finally {
       setIsSearchingLocation(false)
     }
   }
 
   /**
    * Handle escape key for modal closure
    * Updated: August 9, 2025 - Maintained original functionality
    */
   useEffect(() => {
     const handleEscape = (e) => {
       if (e.key === 'Escape' && isOpen && onClose) {
         onClose()
       }
     }
 
     if (isOpen) {
       document.addEventListener('keydown', handleEscape)
       return () => document.removeEventListener('keydown', handleEscape)
     }
   }, [isOpen, onClose])
 
   /**
    * Prevent body scroll when modal is open
    * Updated: August 9, 2025 - Maintained original functionality
    */
   useEffect(() => {
     if (isOpen) {
       document.body.style.overflow = 'hidden'
       return () => {
         document.body.style.overflow = 'unset'
       }
     }
   }, [isOpen])
 
   /**
    * Handle photo upload from file input
    * Converts file to data URL for preview and storage
    * Updated: August 9, 2025 - Maintained original functionality
    */
   const handlePhotoUpload = (e) => {
     const file = e.target.files[0]
     if (file) {
       const reader = new FileReader()
       reader.onload = (e) => {
         setNewPin(prev => ({ ...prev, photo: e.target.result }))
       }
       reader.readAsDataURL(file)
     }
   }
 
   /**
    * Clear selected photo and reset file input
    * Updated: August 9, 2025 - Maintained original functionality
    */
   const handleClearPhoto = () => {
     setNewPin(prev => ({ ...prev, photo: null }))
     const photoInput = document.getElementById('photo-upload')
     if (photoInput) {
       photoInput.value = ''
     }
   }
 
   /**
    * Handle pin submission
    * Updated: August 9, 2025 - CLEAN ARCHITECTURE
    * 
    * Enterprise Pattern:
    * - Component: Collects raw user input only
    * - Store: Handles all uploads, URLs, and persistence
    * - Clear separation of concerns
    * - Single source of truth for data
    */
   const handleSubmit = async () => {
     // Validate required fields
     if (!newPin.title.trim()) {
       showMessage('Missing Title', 'Please add a title for your feeling.')
       return
     }
 
     try {
       // Clean data contract - only raw materials sent to store
       // Store will handle all uploads and URL generation
       const pinData = {
         title: newPin.title,
         mood: selectedMood,
         note: newPin.note,
         photo: newPin.photo,           // Raw data URL - store will upload
         audioBlob: audioBlob,          // Raw blob - store will upload
         // NO audioUrl - store generates permanent URL
         location: (mapLocation || userLocation) ? {
           name: locationName || 'Current Location',
           lat: (mapLocation || userLocation).lat,
           lng: (mapLocation || userLocation).lng
         } : {
           name: 'Unknown Location',
           lat: 0,
           lng: 0
         },
         culturalContext: 'Personal discovery'
       }
 
 
       // Store handles all complexity - component stays simple
       const result = await addPin(pinData)
 
       if (result && result.success !== false) {
         onClose()
       } else {
         console.error('❌ Store returned error:', result)
         showMessage(
           'Save Error',
           result?.error || 'Failed to save pin. Please try again.'
         )
       }
 
     } catch (error) {
       console.error('❌ Pin creation failed:', error)
       showMessage(
         'Save Error',
         'Failed to save pin. Please try again.'
       )
     }
   }
 
   /**
    * Check if save button should be disabled
    * Updated: August 9, 2025 - Maintained original logic
    */
   const isSaveDisabled = !newPin.title.trim() || !selectedMood
 
   // Don't render if modal is not open
   if (!isOpen) return null
 
   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
       <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left">
 
         {/* Modal Header */}
         <div className="flex justify-between items-center mb-4">
           <button
             onClick={handleSubmit}
             className="text-customPurpleText font-medium disabled:opacity-50 transition-colors"
             disabled={isSaveDisabled}
             aria-label="Save pin"
           >
             Save
           </button>
           <h3 className="text-xl font-semibold text-customPurpleText">Vibe</h3>
           <button
             onClick={onClose}
             className="text-customPurpleText transition-colors"
             aria-label="Close modal"
           >
             ✕
           </button>
         </div>
 
         <div className="space-y-6">
 
           {/* Title Input Section */}
           <div>
             <label className="block text-l ont-medium  text-customPurpleText mb-2">
               What's the vibe?
             </label>
             <input
               type="text"
               value={newPin.title}
               onChange={(e) => setNewPin(prev => ({ ...prev, title: e.target.value }))}
               placeholder="Golden Hour Gelato"
               className="w-full p-3 border border-gray-100 rounded-xl outline-none"
               aria-describedby="title-help"
             />
           </div>
 
           {/* Mood Selection Section */}
           <div>
             <label className="block text-l ont-medium text-customPurpleText mb-2">
               Capture the mood!
             </label>

             {/* Category filter pills */}
             <div className="flex flex-wrap gap-2 mb-3">
               {MOOD_CATEGORIES.map(cat => (
                 <button
                   key={cat}
                   type="button"
                   onClick={() => setActiveCategory(cat)}
                   className={`px-3 py-1 rounded-lg text-sm font-medium transition-all capitalize ${
                     activeCategory === cat
                       ? 'bg-customPurple text-white'
                       : 'bg-customBackground text-customPurpleText'
                   }`}
                 >
                   {cat}
                 </button>
               ))}
             </div>

             {/* Mood pills */}
             <div className="grid grid-cols-3 gap-2">
               {MOODS.filter(m => m.cat === activeCategory).map(mood => (
                 <VibeTag
                   key={mood.name}
                   vibe={mood.name}
                   sub={mood.sub}
                   selected={selectedMood === mood.name}
                   className="w-full"
                   onClick={() => setSelectedMood(prev => prev === mood.name ? '' : mood.name)}
                 />
               ))}
             </div>
           </div>
 
           {/* Note Input Section */}
           <div>
             <label className="block text-l font-medium text-customPurpleText mb-2">
               Describe the energy...
             </label>
             <textarea
               value={newPin.note}
               onChange={(e) => setNewPin(prev => ({ ...prev, note: e.target.value }))}
               placeholder="Capture the vibe. The light... the sound... The atmosphere..."
               rows="4"
               className="w-full p-3 border border-gray-100 rounded-xl outline-none resize-none"
               aria-describedby="note-help"
             />
           </div>
 
           {/* Media Upload Section */}
           <div className="grid grid-cols-2 gap-3">
 
             {/* Photo Upload Button */}
             <div>
               <input
                 type="file"
                 accept="image/*"
                 onChange={handlePhotoUpload}
                 className="hidden"
                 id="photo-upload"
                 aria-describedby="photo-help"
               />
               <label
                 htmlFor="photo-upload"
                 className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-colors cursor-pointer ${newPin.photo
                   ? 'text-white'
                   : 'bg-gray-100 text-customPurpleText'
                   }`}
                 style={newPin.photo ? { backgroundColor: '#333' } : {}}
               >
                 <i className="fas fa-camera text-base" aria-hidden="true"></i>
                 <span>{newPin.photo ? 'Photo Added' : 'Add Photo'}</span>
               </label>
             </div>
 
             {/* Audio Recording Button */}
             <button
               onClick={isRecording ? stopRecording : startRecording}
               className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-medium transition-colors ${isRecording
                 ? 'bg-red-500 text-white animate-pulse'
                 : audioUrl
                   ? 'text-white'
                   : 'bg-gray-100 text-customPurpleText'
                 }`}
               style={audioUrl && !isRecording ? { backgroundColor: '#555' } : {}}
               aria-label={isRecording ? 'Stop recording' : 'Start recording'}
             >
               <i className="fas fa-microphone text-base" aria-hidden="true"></i>
               <span>
                 {isRecording ? 'Recording...' : audioUrl ? 'Audio Recorded' : 'Add Audio'}
               </span>
             </button>
           </div>
 
           {/* Photo Preview Section */}
           {newPin.photo && (
             <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center">
               <img
                 src={newPin.photo}
                 alt="Pin photo preview"
                 className="w-full h-56 object-cover rounded-lg mb-3"
               />
               <button
                 onClick={handleClearPhoto}
                 className="mt-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors hover:bg-gray-800"
                 aria-label="Replace photo"
               >
                 Replace photo
               </button>
             </div>
           )}
 
           {/* Audio Preview Section */}
           {audioUrl && (
             <div className="bg-gray-100 rounded-xl p-4">
               <div className="flex items-center space-x-3">
                 <div className="flex-1">
                   <CustomAudioPlayer src={audioUrl} />
                 </div>
               </div>
             </div>
           )}
           {/* Location Name Input */}

           
           
           <div className="mt-3">
           <label className="block text-l ont-medium  text-customPurpleText mb-2">
               Vibe Location
             </label>
             <input
               type="text"
               value={locationName}
               onChange={(e) => setLocationName(e.target.value)}
               onKeyDown={async (e) => {
                 if (e.key === 'Enter') {
                   e.preventDefault()
 
                   if (!locationName.trim()) {
                     showMessage('Invalid Address', 'Please enter an address to search.')
                     return
                   }
 
                   try {
                     const result = await searchLocationByAddress(locationName)
                     
                     // Set map marker position (doesn't affect main screen)
                     setMapLocation({ lat: result.lat, lng: result.lng })
                     
                     setLocationName(result.formattedAddress)
 
                     // Calculate distance for user feedback
                     const originalLat = userLocation?.lat || 0
                     const originalLng = userLocation?.lng || 0
                     const distance = calculateDistance(originalLat, originalLng, result.lat, result.lng)
 
                     showMessage('Now resetting to your current location...')
 
                   } catch (error) {
                     showMessage('Search Failed', 'Could not find that address. Please try a different search.')
                   }
                 }
               }}
             
               placeholder="Enter address and press Enter to search"
               className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
               aria-label="Location name"
               disabled={isSearchingLocation}
             />
 
             {(isLocationLoading || isSearchingLocation) && (
               <p className="text-xs text-gray-500 mt-1">
                 {isLocationLoading ? 'Loading location...' : 'Searching address...'}
               </p>
             )}
           </div>
 
           {/* Interactive Location Picker */}
           {/* <InteractiveLocationPicker
             userLocation={mapLocation || userLocation}  // Use searched location if available
             selectedGuideName={selectedGuideName}
             onLocationChange={async (newLocation) => {
               console.log('Map location changed to:', newLocation)
               setMapLocation(newLocation)  // Update local map state only
             }}
             onLocationNameChange={(newName) => {
               setLocationName(newName)
             }}
           /> */}
         </div>
       </div>
     </div>
   )
 }
 
 // PropTypes for type checking
 PinCreationView.propTypes = {
   isOpen: PropTypes.bool.isRequired,
   onClose: PropTypes.func.isRequired
 }
 
 export default PinCreationView