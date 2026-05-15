/**
 * Main App Component for BiNx React App - WITH ENHANCED ONBOARDING
 * Purpose: Root application component matching original exactly
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useEffect, useState } from 'react'
 import { useAuth } from './hooks/useAuth'
 import { usePins } from './hooks/usePins'
 import { useUIStore } from './store/uiStore'
 import { initializeStores } from './store'
 
 // Import components
 import { AuthView } from './components/auth'
 import MainView from './components/MainView'
 import { DeleteConfirmModal, PinCreationView, PinDetailView } from './components/pins'
 import { UserProfileView, OnboardingModal, EnhancedOnboardingModal } from './components/profile'
 import {
   MessageModal,
   PhotoModal,
   ErrorBoundary,
   RecommendationsModal
 } from './components/shared'
 
 import './App.css'
 
 function App() {
   const { user, isAuthenticated, initialize, profileLoaded } = useAuth()
   const { deletePin } = usePins()
 
   // UI Store selectors
   const messageModal = useUIStore(state => state.messageModal)
   const photoModal = useUIStore(state => state.photoModal)
   const deleteConfirmModal = useUIStore(state => state.deleteConfirmModal)
   const selectedPin = useUIStore(state => state.selectedPin)
   const showPinCreation = useUIStore(state => state.showPinCreation)
   const showUserProfile = useUIStore(state => state.showUserProfile)
   const onboardingModal = useUIStore(state => state.onboardingModal)
   const recommendationsModal = useUIStore(state => state.recommendationsModal)
   const selectedGuideName = useUIStore(state => state.selectedGuideName)
   
   // State for enhanced onboarding
   const [showEnhancedOnboarding, setShowEnhancedOnboarding] = useState(false)
   const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 })
 
   // UI Store actions
   const hideMessageModal = useUIStore(state => state.hideMessageModal)
   const hidePhotoModal = useUIStore(state => state.hidePhotoModal)
   const hideDeleteConfirmModal = useUIStore(state => state.hideDeleteConfirmModal)
   const clearSelectedPin = useUIStore(state => state.clearSelectedPin)
   const hidePinCreationModal = useUIStore(state => state.hidePinCreationModal)
   const hideUserProfileModal = useUIStore(state => state.hideUserProfileModal)
   const showOnboardingModal = useUIStore(state => state.showOnboardingModal)
   const hideOnboardingModal = useUIStore(state => state.hideOnboardingModal)
   const hideRecommendationsModal = useUIStore(state => state.hideRecommendationsModal)
   const seedSavedLocations = useUIStore(state => state.seedSavedLocations)

   // Initialize stores on app start
   useEffect(() => {
     initializeStores()
     initialize()
   }, [initialize])

   // Auto-trigger onboarding only after profile is loaded from DB
   useEffect(() => {
     if (isAuthenticated && user && profileLoaded && !user.profile?.onboardingCompleted) {
       showOnboardingModal()
     }
   }, [isAuthenticated, profileLoaded, user?.profile?.onboardingCompleted])

   // Floating avatar cursor
   useEffect(() => {
     if (!isAuthenticated || !selectedGuideName) {
       document.body.classList.remove('hide-cursor')
       return
     }
     document.body.classList.add('hide-cursor')
     const move = (e) => setCursorPos({ x: e.clientX, y: e.clientY })
     window.addEventListener('mousemove', move)
     return () => {
       window.removeEventListener('mousemove', move)
       document.body.classList.remove('hide-cursor')
     }
   }, [isAuthenticated, selectedGuideName])

   // Seed saved locations from profile into UI store after profile loads
   useEffect(() => {
     if (profileLoaded && user?.profile?.savedLocations) {
       seedSavedLocations(user.profile.savedLocations)
     }
   }, [profileLoaded])
 
   /**
    * Handle delete confirmation
    */
   const handleConfirmDelete = async () => {
     if (deleteConfirmModal.pin) {
       try {
         await deletePin(deleteConfirmModal.pin.id)
         hideDeleteConfirmModal()
 
         // Clear selected pin if it was the deleted one
         if (selectedPin?.id === deleteConfirmModal.pin.id) {
           clearSelectedPin()
         }
       } catch (error) {
         console.error('Delete failed:', error)
       }
     }
   }
 
   /**
    * Handle delete cancellation
    */
   const handleCancelDelete = () => {
     hideDeleteConfirmModal()
   }
 
   /**
    * Handle pin detail close
    */
   const handlePinDetailClose = () => {
     clearSelectedPin()
   }
 
   /**
    * Handle delete from pin detail view
    */
   const handleDeleteFromDetail = (pin) => {
     clearSelectedPin()
     setTimeout(() => {
       showDeleteConfirmModal(pin)
     }, 100)
   }
 
   // Show auth view if not authenticated
   if (!isAuthenticated) {
     return (
       <ErrorBoundary>
         <AuthView />
 
         <MessageModal
           isOpen={messageModal.isOpen}
           title={messageModal.title}
           message={messageModal.message}
           onClose={hideMessageModal}
         />
       </ErrorBoundary>
     )
   }
 
   // Main authenticated app
   return (
     <ErrorBoundary>
       <MainView />

       {/* Floating avatar cursor */}
       {isAuthenticated && selectedGuideName && (
         <img
           src={`images/${selectedGuideName.toLowerCase()}.svg`}
           alt=""
           style={{
             position: 'fixed',
             left: cursorPos.x,
             top: cursorPos.y,
             width: '60px',
             pointerEvents: 'none',
             zIndex: 99999,
             transform: 'translate(-50%, -100%)',
           }}
         />
       )}
       {/* Global Modals */}
       <MessageModal
         isOpen={messageModal.isOpen}
         title={messageModal.title}
         message={messageModal.message}
         onClose={hideMessageModal}
       />
 
       <PhotoModal
         isOpen={photoModal.isOpen}
         imageUrl={photoModal.imageUrl}
         onClose={hidePhotoModal}
       />
 
       <DeleteConfirmModal
         isOpen={deleteConfirmModal.isOpen}
         pin={deleteConfirmModal.pin}
         onConfirm={handleConfirmDelete}
         onCancel={handleCancelDelete}
       />
 
       <PinCreationView
         isOpen={showPinCreation}
         onClose={hidePinCreationModal}
       />
 
       <PinDetailView
         isOpen={!!selectedPin}
         pin={selectedPin}
         onClose={handlePinDetailClose}
         onDelete={handleDeleteFromDetail}
       />
 
       <UserProfileView
         isOpen={showUserProfile}
         onClose={hideUserProfileModal}
       />
 
       <OnboardingModal
         isOpen={onboardingModal.isOpen}
         onClose={hideOnboardingModal}
       />
 
       <RecommendationsModal
         isOpen={recommendationsModal.isOpen}
         onClose={hideRecommendationsModal}
       />
     </ErrorBoundary>
   )
 }
 
 export default App