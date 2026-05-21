/**
 * Onboarding Modal Component for BiNx React App - EXACT REPLICA
 * Purpose: User profile setup and editing modal
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useState, useEffect } from 'react'
 import PropTypes from 'prop-types'
 import { useAuth } from '../../hooks/useAuth'
 import { useUIStore } from '../../store/uiStore'
 
 /**
  * OnboardingModal Component - Updated with Enhanced Styling
  * Profile setup for new users and profile editing
  */
 const OnboardingModal = ({ isOpen, onClose }) => {
   const { user, updateProfile } = useAuth()
   const showMessage = useUIStore(state => state.showMessageModal)
 
   // State to manage the current step of the form
   const [step, setStep] = useState(0)
 
   // Form state - EXACT ORIGINAL
   const [profileData, setProfileData] = useState({
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
     idealSunday: ''
   })
 
   const [loading, setLoading] = useState(false)
 
   // Initialize form with existing user data - EXACT ORIGINAL
   useEffect(() => {
     if (isOpen && user?.profile) {
       setProfileData({
         alterEgo: user.profile.alterEgo || '',
         currentResidence: user.profile.currentResidence || '',
         occupation: user.profile.occupation || '',
         currentlyReading: user.profile.currentlyReading || '',
         lastMovieWatched: user.profile.lastMovieWatched || '',
         nextMovie: user.profile.nextMovie || '',
         currentlyWearing: user.profile.currentlyWearing || '',
         favoriteBrand: user.profile.favoriteBrand || '',
         favoriteAuthors: user.profile.favoriteAuthors || '',
         favoriteVibe: user.profile.favoriteVibe || '',
         idealSunday: user.profile.idealSunday || ''
       })
     }
     // Reset to the first step whenever the modal is opened
     if (isOpen) {
       setStep(0)
     }
   }, [isOpen, user])
 
   // Handle form input changes - EXACT ORIGINAL
   const handleChange = (e) => {
     const { name, value } = e.target
     setProfileData(prevData => ({
       ...prevData,
       [name]: value
     }))
   }
 
   // Skip onboarding — marks as completed so it won't auto-trigger again
   const handleSkip = async () => {
     setLoading(true)
     try {
       await updateProfile({ onboardingCompleted: true })
     } catch (error) {
       console.error('Skip failed:', error)
     } finally {
       setLoading(false)
       onClose()
     }
   }

   // Handle form submission - Updated for Save button
   const handleSave = async () => {
     setLoading(true)
     try {
       await updateProfile({
         ...profileData,
         onboardingCompleted: true
       })
       showMessage('Profile saved')
       onClose()
     } catch (error) {
       console.error('Profile update failed:', error)
       showMessage('Failed to update profile. Please try again.')
     } finally {
       setLoading(false)
     }
   }
 
   // Navigation handlers
   const handleNext = () => {
     setStep(prevStep => prevStep + 1)
   }
 
   const handlePrevious = () => {
     setStep(prevStep => prevStep - 1)
   }
 
   if (!isOpen) return null
   const isNewUser = !user?.profile?.onboardingCompleted
 
   const totalSteps = 3
 
   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
       <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg text-left">

         {/* Header */}
         <div className="flex justify-between items-center mb-4">
           <p className="text-sm text-gray-500">Step {step + 1} of {totalSteps}</p>
           <h3 className="text-xl font-semibold text-customPurpleText">Edit Profile</h3>
           <button
             onClick={onClose}
             className="text-customPurpleText transition-colors"
             aria-label="Close modal"
           >
             ✕
           </button>
         </div>
 
         {/* Form Fields - Updated with multi-step logic */}
         <div className="space-y-4">
           {step === 0 && (
             // About Me section
             <div className="space-y-4">
               <h3 className="text-xl font-semibold text-gray-800">About Me</h3>
               <div>
                 <label className="text-sm font-semibold text-gray-700">Alter Ego</label>
                 <input
                   type="text"
                   name="alterEgo"
                   value={profileData.alterEgo}
                   onChange={handleChange}
                   placeholder="e.g., The Coder"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Current Residence</label>
                 <input
                   type="text"
                   name="currentResidence"
                   value={profileData.currentResidence}
                   onChange={handleChange}
                   placeholder="e.g., Brooklyn"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Occupation</label>
                 <input
                   type="text"
                   name="occupation"
                   value={profileData.occupation}
                   onChange={handleChange}
                   placeholder="e.g., Writer, Founder"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
             </div>
           )}
 
           {step === 1 && (
             // Media & Hobbies section
             <div className="space-y-4">
               <h3 className="text-xl font-semibold text-gray-800">Media & Hobbies</h3>
               <div>
                 <label className="text-sm font-semibold text-gray-700">Currently Reading</label>
                 <input
                   type="text"
                   name="currentlyReading"
                   value={profileData.currentlyReading}
                   onChange={handleChange}
                   placeholder="e.g., 'Dune' by Frank Herbert"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Last Movie Watched</label>
                 <input
                   type="text"
                   name="lastMovieWatched"
                   value={profileData.lastMovieWatched}
                   onChange={handleChange}
                   placeholder="e.g., 'Amélie'"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Next Movie</label>
                 <input
                   type="text"
                   name="nextMovie"
                   value={profileData.nextMovie}
                   onChange={handleChange}
                   placeholder="e.g., 'The Matrix'"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Favorite Authors</label>
                 <input
                   type="text"
                   name="favoriteAuthors"
                   value={profileData.favoriteAuthors}
                   onChange={handleChange}
                   placeholder="e.g., Haruki Murakami"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
             </div>
           )}
 
           {step === 2 && (
             // Personal Style & Lifestyle section
             <div className="space-y-4">
               <h3 className="text-xl font-semibold text-gray-800">Personal Style & Lifestyle</h3>
               <div>
                 <label className="text-sm font-semibold text-gray-700">Currently Wearing</label>
                 <input
                   type="text"
                   name="currentlyWearing"
                   value={profileData.currentlyWearing}
                   onChange={handleChange}
                   placeholder="e.g., A favorite vintage jacket"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Favorite Brand</label>
                 <input
                   type="text"
                   name="favoriteBrand"
                   value={profileData.favoriteBrand}
                   onChange={handleChange}
                   placeholder="e.g., Nike"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Favorite Vibe</label>
                 <input
                   type="text"
                   name="favoriteVibe"
                   value={profileData.favoriteVibe}
                   onChange={handleChange}
                   placeholder="e.g., Rainy days and jazz music"
                   className="w-full mt-1 p-2 border border-gray-200 rounded-lg text-sm outline-none"
                   disabled={loading}
                 />
               </div>
 
               <div>
                 <label className="text-sm font-semibold text-gray-700">Ideal Sunday</label>
                 <textarea
                   name="idealSunday"
                   value={profileData.idealSunday}
                   onChange={handleChange}
                   placeholder="e.g., What would you do on your ideal Sundays?"
                   rows="2"
                   className="w-full p-2 border border-gray-200 rounded-lg text-sm resize-none outline-none"
                   disabled={loading}
                 />
               </div>
             </div>
           )}
         </div>
 
         {/* Action Buttons - Uniform sizing with Save always on right */}
         <div className="flex space-x-3 mt-6">
           {/* Previous button - only show if not first step */}
           {step > 0 && (
             <button
               onClick={handlePrevious}
               disabled={loading}
               className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
               aria-label="Previous step"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
               </svg>
             </button>
           )}

           {/* Next button - only show if not last step */}
           {step < totalSteps - 1 && (
             <button
               onClick={handleNext}
               disabled={loading}
               className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
               aria-label="Next step"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
             </button>
           )}

           {/* Spacer to push right-side buttons */}
           <div className="flex-1"></div>

           {/* Skip button - only for new users */}
           {isNewUser && (
             <button
               onClick={handleSkip}
               disabled={loading}
               className="py-3 px-4 text-gray-400 rounded-xl font-medium transition-colors hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               Skip
             </button>
           )}

           {/* Save button - always present, always on the right */}
           <button
             onClick={handleSave}
             disabled={loading}
             className="w-24 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
           >
             {loading ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
             ) : (
               'Save'
             )}
           </button>
         </div>
       </div>
     </div>
   )
 }
 
 OnboardingModal.propTypes = {
   isOpen: PropTypes.bool.isRequired,
   onClose: PropTypes.func.isRequired,
 }
 
 export default OnboardingModal