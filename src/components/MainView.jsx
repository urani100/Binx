/**
 * Main View Component for BiNx React App - WITH L BUTTON
 * Purpose: Pixel-perfect recreation of original interface + L button for Locations
 * Author: ML
 * Date: August 21, 2025
 */

 import React from 'react'
 import { useAuth } from '../hooks/useAuth'
 import { useLocation } from '../hooks/useLocation'
 import { usePins } from '../hooks/usePins'
 import { useUIStore } from '../store/uiStore'
 import { UserAvatar, LoadingSpinner } from './ui'
 import { PinCard } from './pins'
 import { shareVibe } from '../services/shareService'
 import { LocationsModal } from './shared' // Import the new LocationsModal
 import { getGreeting } from '../utils/helpers'
 
 /**
  * MainView Component - Enhanced with L button for Locations
  */
 const MainView = () => {
   const { user } = useAuth()
   const { userLocation } = useLocation()
   const { pins, loading: loadingPins } = usePins()
 
   // UI Store selectors
   const locationsModal = useUIStore(state => state.locationsModal)
 
   // UI Store actions
   const showPinCreationModal = useUIStore(state => state.showPinCreationModal)
   const showUserProfileModal = useUIStore(state => state.showUserProfileModal)
   const showPhotoModal = useUIStore(state => state.showPhotoModal)
   const showDeleteConfirmModal = useUIStore(state => state.showDeleteConfirmModal)
   const setSelectedPin = useUIStore(state => state.setSelectedPin)
   const showRecommendationsModal = useUIStore(state => state.showRecommendationsModal)
   const showLocationsModal = useUIStore(state => state.showLocationsModal)
   const hideLocationsModal = useUIStore(state => state.hideLocationsModal)
 
   /**
    * Handle pin selection for detail view
    */
   const handleSelectPin = (pin) => {
     setSelectedPin(pin)
   }
 
   /**
    * Handle pin deletion confirmation
    */
   const handleDeletePin = (pin) => {
     showDeleteConfirmModal(pin)
   }
 
   /**
    * Handle photo modal opening
    */
   const handleOpenPhoto = (imageUrl) => {
     showPhotoModal(imageUrl)
   }

   const handleSharePin = async (pin) => {
     try {
       await shareVibe(pin)
     } catch {}
   }

   /**
    * Handle create pin button (V button)
    */
   const handleCreatePin = () => {
     showPinCreationModal()
   }
 
   /**
    * Handle profile button
    */
   const handleOpenProfile = () => {
     showUserProfileModal()
   }
 
   /**
    * Handle recommendations button (R button)
    */
   const handleOpenRecommendations = () => {
     showRecommendationsModal()
   }
 
   /**
    * Handle locations button (L button) - NEW
    */
   const handleOpenLocations = () => {
     showLocationsModal()
   }
 
   return (
     <div className="min-h-screen relative" style={{ textAlign: 'left' }}>
       <div className="max-w-sm mx-auto p-4 pb-20 bg-gray-50 min-h-screen">
 
         {/* Header - EXACT REPLICA */}
         <div className="flex justify-between items-center mb-6">
           <div>
             <h1 className="text-2xl font-light text-gray-900">BiNx</h1>
             <p className="text-sm text-gray-500 flex items-center space-x-2">
               {userLocation ? (
                 <>
                   <span>{userLocation.lat.toFixed(2)}, {userLocation.lng.toFixed(2)}</span>
                   {(userLocation.sublocality || userLocation.locality || userLocation.displayLocation) && (
                     <><span>•</span>
                     <span>{userLocation.sublocality || userLocation.locality || userLocation.displayLocation}</span></>
                   )}
                   <span>•</span>
                   <span>{userLocation.temperature}°C</span>
                   {userLocation.weatherIcon && (
                     <img
                       src={`https:${userLocation.weatherIcon}`}
                       alt={userLocation.condition}
                       className="w-8 h-8"
                     />
                   )}
                 </>
               ) : 'Getting location...'}
             </p>
           </div>
 
           {/* Profile Button - EXACT REPLICA */}
           <button
             onClick={handleOpenProfile}
             className="flex items-center space-x-2 text-customPurpleText"
           >
             <UserAvatar user={user} size="md" />
           </button>
         </div>
 
         {/* Greeting Section - EXACT REPLICA */}
         <div className="mb-6">
           <div className="bg-customBackground rounded-none py-4 px-6 w-full">
             <h2 className="font-medium mb-2 text-customPurpleText">
               {getGreeting()}, {user?.name || 'Friend'}! What's the vibe?
             </h2>
           </div>
         </div>
 
         {/* Action Buttons - ENHANCED WITH L BUTTON */}
         <div className="flex justify-end items-center mb-4 space-x-3">
           {/* L Button - NEW LOCATIONS BUTTON */}
           {/* Hidden — preserved for future use */}
           {false && (
           <button
             onClick={handleOpenLocations}
             className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors shadow-lg text-xs font-medium bg-customPurpleText"
             aria-label="Explore Locations"
           >
             <span className="text-base font-semibold">L</span>
           </button>
           )}
           
           {/* R Button - EXISTING RECOMMENDATIONS */}
           <button
             onClick={handleOpenRecommendations}
             className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors shadow-lg text-xs font-medium bg-customPurpleText"
             aria-label="Get Recommendations"
           >
             <span className="text-base font-semibold">R</span>
           </button>
           
           {/* V Button - EXISTING VIBES/PIN CREATION */}
           <button
             onClick={handleCreatePin}
             className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors shadow-lg text-xs font-medium bg-customPurpleText"
             aria-label="Add Vibe"
           >
             <span className="text-base font-semibold">V</span>
           </button>
         </div>
 
         {/* Pins Content */}
         <div>
           {loadingPins ? (
             // Loading State
             <div className="text-center py-12">
               <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <i className="fas fa-spinner fa-spin text-customPurple text-xl"></i>
               </div>
               <h3 className="font-medium text-gray-900 mb-2">Loading vibe...</h3>
               <p className="text-gray-500 mb-4 text-sm">Capture the mood!</p>
             </div>
           ) : pins.length === 0 ? (
             // Empty State   
             <div className="text-center py-12">
           
               <button
                 onClick={handleCreatePin}
                 className="w-20 h-20 bg-customPurpleText text-white text-base font-semibold rounded-full flex items-center justify-center mx-auto mb-4"
               >
                 BiNx!
               </button>
               <h3 className="font-medium text-customPurpleText mb-2">Hi {user?.name || 'there'}! Add Your First Vibe.</h3>
             </div>
           ) : (
             // Pins List - EXACT REPLICA
             pins.map(pin => (
               <PinCard
                 key={pin.id}
                 pin={pin}
                 onClick={handleSelectPin}
                 onDelete={handleDeletePin}
                 onShare={handleSharePin}
                 onOpenPhoto={handleOpenPhoto}
               />
             ))
           )}
         </div>
       </div>
 
       {/* LocationsModal - NEW */}
       <LocationsModal
         isOpen={locationsModal.isOpen}
         onClose={hideLocationsModal}
       />
     </div>
   )
 }
 
 export default MainView
