/**
 * User Profile View Component for BiNx React App - EXACT REPLICA
 * Purpose: User profile modal with settings, themes, and guides
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useRef, useEffect, useState } from 'react'
 import PropTypes from 'prop-types'
 import { useAuth } from '../../hooks/useAuth'
 import { usePins } from '../../hooks/usePins'
 import { useUIStore } from '../../store/uiStore'
 import { UserAvatar } from '../ui'
 import { UserType } from '../../types'
 import { PALETTES, GUIDES } from '../../utils/constants'
 import { EnhancedOnboardingModal } from './index'
 import { SavedLocationsModal, SentVibesModal } from '../shared'

 /**
  * UserProfileView Component - EXACT REPLICA
  * Complete user profile modal with all original features
  */
 const UserProfileView = ({ isOpen, onClose }) => {
   const { user, logout, updateProfilePicture, removeProfilePicture } = useAuth()
   const { pins } = usePins()
   const [showEnhancedOnboarding, setShowEnhancedOnboarding] = useState(false)
   const [showSavedLocations, setShowSavedLocations] = useState(false)
   const [showSentVibes, setShowSentVibes] = useState(false)
   const [activeTab, setActiveTab] = useState('about')

   // UI Store for theme management
   const selectedPaletteName = useUIStore(state => state.selectedPaletteName)
   const selectedGuideName = useUIStore(state => state.selectedGuideName)
   const setSelectedPalette = useUIStore(state => state.setSelectedPalette)
   const setSelectedGuide = useUIStore(state => state.setSelectedGuide)
   const showOnboardingModal = useUIStore(state => state.showOnboardingModal)

   // Refs for smooth scrolling
   const paletteScrollRef = useRef(null)
   const guideScrollRef = useRef(null)

   // Handle escape key - EXACT ORIGINAL
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

   // Prevent body scroll when modal is open - EXACT ORIGINAL
   useEffect(() => {
     if (isOpen) {
       document.body.style.overflow = 'hidden'
       return () => {
         document.body.style.overflow = 'unset'
       }
     }
   }, [isOpen])

   // Scroll to selected palette - EXACT ORIGINAL
   useEffect(() => {
     if (paletteScrollRef.current) {
       const selectedIndex = PALETTES.findIndex(p => p.name === selectedPaletteName)
       if (selectedIndex !== -1) {
         const selectedElement = paletteScrollRef.current.children[selectedIndex]
         if (selectedElement) {
           selectedElement.scrollIntoView({
             behavior: 'smooth',
             block: 'nearest',
             inline: 'center'
           })
         }
       }
     }
   }, [selectedPaletteName])

   // Scroll to selected guide - EXACT ORIGINAL
   useEffect(() => {
     if (guideScrollRef.current) {
       const selectedIndex = GUIDES.findIndex(g => g.name === selectedGuideName)
       if (selectedIndex !== -1) {
         const selectedElement = guideScrollRef.current.children[selectedIndex]
         if (selectedElement) {
           selectedElement.scrollIntoView({
             behavior: 'smooth',
             block: 'nearest',
             inline: 'center'
           })
         }
       }
     }
   }, [selectedGuideName])

   /**
    * Handle profile picture change - EXACT ORIGINAL
    */
   const handleProfilePicChange = async (e) => {
     const file = e.target.files[0]
     if (file) {
       try {
         await updateProfilePicture(file)
       } catch (error) {
         console.error('Profile picture update failed:', error)
       }
     }
   }

   /**
    * Handle profile picture removal - EXACT ORIGINAL
    */
   const handleRemoveProfilePic = async () => {
     try {
       await removeProfilePicture()
     } catch (error) {
       console.error('Profile picture removal failed:', error)
     }
   }

   /**
    * Handle edit profile - EXACT ORIGINAL
    */
   const handleEditProfile = () => {
     showOnboardingModal()
   }

   /**
    * Handle logout - EXACT ORIGINAL
    */
   const handleLogout = async () => {
     try {
       await logout()
       onClose()
     } catch {
       // error shown via message modal; keep profile open
     }
   }

   if (!isOpen) return null

   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
       <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-lg my-auto text-left">

         {/* Header - EXACT ORIGINAL */}
         <div className="flex justify-between items-center mb-6">
           <button
             onClick={onClose}
             className="text-customPurpleText transition-colors"
           >
             ← Back
           </button>
           <button
             onClick={handleLogout}
             className="text-customPurpleText font-medium transition-colors"
           >
             Logout
           </button>
         </div>

         {/* User Info Section - EXACT ORIGINAL */}
         <div className="flex flex-col items-center mb-8">
           <h3 className="font-medium text-gray-900 text-2xl mb-1">BiNx</h3>

           {/* Profile Picture with Upload - EXACT ORIGINAL */}
           <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 bg-customBackground profile-pic-container relative">
             <UserAvatar user={user} size="xl" />

             {/* Upload Overlay - EXACT ORIGINAL */}
             <input
               type="file"
               accept="image/*"
               onChange={handleProfilePicChange}
               className="hidden"
               id="profile-pic-upload"
             />
             <label
               htmlFor="profile-pic-upload"
               className="profile-pic-overlay"
             >
               <i className="fas fa-camera text-customPurpleText text-2xl"></i>
             </label>

             {/* Remove Button - EXACT ORIGINAL */}
             {user?.profilePic && (
               <button
                 onClick={handleRemoveProfilePic}
                 className="absolute -bottom-3 -right-2 w-8 h-8 text-customPurple rounded-full flex items-center justify-center text-sm z-50"
               >
                 ✕
               </button>
             )}
           </div>

           <h2 className="font-medium text-gray-400 mb-2">Hello, {user?.name || 'Friend'}!</h2>
           <p className="text-sm text-gray-500">{user?.email}</p>
         </div>

         {/* Palette Section - EXACT ORIGINAL */}
         <div className="mb-6">
           <h3 className="text-xl font-semibold text-customPurpleText mb-4 pl-4">Change Vibe</h3>
           <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory">
             <div className="flex gap-4 px-6" ref={paletteScrollRef}>
               {PALETTES.map((palette) => (
                 <div
                   key={palette.name}
                   className={`cursor-pointer rounded-xl p-2 transition-all border-2 border-white snap-center flex-shrink-0 ${selectedPaletteName === palette.name ? 'border-customPurple' : ''
                     }`}
                   onClick={() => setSelectedPalette(palette.name)}
                 >
                   <p className={`text-center mb-2 ${selectedPaletteName === palette.name ? 'font-semibold text-customPurpleText' : 'text-gray-500'
                     } text-base`}>
                     {palette.name}
                   </p>
                   <div className="flex space-x-1">
                     <div className="w-8 h-8 rounded-md" style={{ backgroundColor: palette.background }}></div>
                     <div className="w-8 h-8 rounded-md" style={{ backgroundColor: palette.primary }}></div>
                     <div className="w-8 h-8 rounded-md" style={{ backgroundColor: palette.text }}></div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
         </div>

         {/* Guide Selection Section */}
         <div className="mb-6">
           <h3 className="text-xl font-semibold text-customPurpleText mb-4 pl-4">Pick your guide</h3>
           <div className="overflow-x-auto scroll-smooth snap-x snap-mandatory">
             <div className="flex gap-4 px-6" ref={guideScrollRef}>
               {GUIDES.map((guide) => (
                 <div
                   key={guide.name}
                   className={`cursor-pointer rounded-xl p-2 transition-all border-2 border-white snap-center flex-shrink-0 ${selectedGuideName === guide.name ? 'border-customPurple' : ''
                     }`}
                   onClick={() => setSelectedGuide(guide.name)}
                 >
                   <p className={`text-center mb-4 ${selectedGuideName === guide.name ? 'font-semibold text-customPurpleText' : 'text-gray-500'
                     } text-lg font-medium`}>
                     {guide.name}
                   </p>
                   {/* Avatar Size */}
                   <div className="w-24 h-50 rounded-lg mb-3 mx-auto overflow-hidden">
                     <img
                       src={`images/${guide.name.toLowerCase()}.svg`}
                       alt={guide.name}
                       className="w-full h-80 object-cover"
                       onError={(e) => {
                         e.target.style.display = 'none'
                         e.target.nextSibling.style.display = 'flex'
                       }}
                     />
                     <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                       <span className="text-xs text-gray-500">{guide.name}</span>
                     </div>
                   </div>

                   <p className={`text-center mb-4 ${selectedGuideName === guide.name ? 'font-semibold text-customPurpleText' : 'text-gray-500'
                     }`}>
                     {guide.description}
                   </p>
                 </div>
               ))}
             </div>
           </div>
         </div>

         {/* Tabbed Section */}
         <div className="mb-6">
           {/* Tab Row */}
           <div className="flex gap-1">
             {[
               { id: 'about', label: `About ${user?.name?.charAt(0) || ''}` },
               { id: 'personalize', label: 'Tailor B' },
               { id: 'saved', label: 'Saved R' },
               { id: 'sent', label: 'Shared V' },
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => {
                   if (tab.id === 'personalize') { setShowEnhancedOnboarding(true) }
                   else if (tab.id === 'saved') { setShowSavedLocations(true) }
                   else if (tab.id === 'sent') { setShowSentVibes(true) }
                   else { setActiveTab(tab.id) }
                 }}
                 className={`flex-1 py-2 px-2 rounded-t-xl text-xl font-medium transition-colors ${
                   activeTab === tab.id
                     ? 'bg-customPurple text-white'
                     : 'bg-customBackground text-customPurpleText'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
           </div>
           {/* Thin strip */}
           <div className="h-px bg-customPurple w-full" />

           {/* About Tab Content */}
           {activeTab === 'about' && (
             <div className="bg-customBackground rounded-b-xl p-4 space-y-2">
               {user?.profile?.alterEgo && (
                 <p className="text-base font-bold text-customPurpleText">
                   Alter Ego: <span className="font-normal text-gray-400">{user.profile.alterEgo}</span>
                 </p>
               )}
               {user?.profile?.currentResidence && (
                 <p className="text-base font-bold text-customPurpleText">
                   Current Residence: <span className="font-normal text-gray-400">{user.profile.currentResidence}</span>
                 </p>
               )}
               {user?.profile?.occupation && (
                 <p className="text-base font-bold text-customPurpleText">
                   Occupation: <span className="font-normal text-gray-400">{user.profile.occupation}</span>
                 </p>
               )}
               {user?.profile?.currentlyReading && (
                 <p className="text-base font-bold text-customPurpleText">
                   Currently Reading: <span className="font-normal text-gray-400">{user.profile.currentlyReading}</span>
                 </p>
               )}
               {user?.profile?.lastMovieWatched && (
                 <p className="text-base font-bold text-customPurpleText">
                   Last Movie Watched: <span className="font-normal text-gray-400">{user.profile.lastMovieWatched}</span>
                 </p>
               )}
               {user?.profile?.nextMovie && (
                 <p className="text-base font-bold text-customPurpleText">
                   Next Movie: <span className="font-normal text-gray-400">{user.profile.nextMovie}</span>
                 </p>
               )}
               {user?.profile?.currentlyWearing && (
                 <p className="text-base font-bold text-customPurpleText">
                   Currently Wearing: <span className="font-normal text-gray-400">{user.profile.currentlyWearing}</span>
                 </p>
               )}
               {user?.profile?.favoriteBrand && (
                 <p className="text-base font-bold text-customPurpleText">
                   Favorite Brand: <span className="font-normal text-gray-400">{user.profile.favoriteBrand}</span>
                 </p>
               )}
               {user?.profile?.favoriteAuthors && (
                 <p className="text-base font-bold text-customPurpleText">
                   Favorite Authors: <span className="font-normal text-gray-400">{user.profile.favoriteAuthors}</span>
                 </p>
               )}
               {user?.profile?.favoriteVibe && (
                 <p className="text-base font-bold text-customPurpleText">
                   Favorite Vibe: <span className="font-normal text-gray-400">{user.profile.favoriteVibe}</span>
                 </p>
               )}
               {user?.profile?.idealSunday && (
                 <p className="text-base font-bold text-customPurpleText">
                   Ideal Sunday: <span className="font-normal text-gray-400">{user.profile.idealSunday}</span>
                 </p>
               )}
               {!user?.profile?.onboardingCompleted && (
                 <p className="text-sm text-gray-500 italic mt-4">
                   Complete your profile to personalize your experience.
                 </p>
               )}
               <div className="flex justify-center pt-4">
                 <button
                   onClick={handleEditProfile}
                   className="w-28 py-3 bg-customPurple text-white rounded-xl font-medium hover:opacity-90 transition-colors flex items-center justify-center"
                 >
                   Edit
                 </button>
               </div>
             </div>
           )}
         </div>
       </div>

       {/* Enhanced Onboarding Modal */}
       <EnhancedOnboardingModal
         isOpen={showEnhancedOnboarding}
         onClose={() => setShowEnhancedOnboarding(false)}
         onComplete={() => setShowEnhancedOnboarding(false)}
       />

       {/* Saved Locations Modal */}
       <SavedLocationsModal
         isOpen={showSavedLocations}
         onClose={() => setShowSavedLocations(false)}
       />

       {/* Sent Vibes Modal */}
       <SentVibesModal
         isOpen={showSentVibes}
         onClose={() => setShowSentVibes(false)}
       />
     </div>
   )
 }

 UserProfileView.propTypes = {
   isOpen: PropTypes.bool.isRequired,
   onClose: PropTypes.func.isRequired
 }

 export default UserProfileView
