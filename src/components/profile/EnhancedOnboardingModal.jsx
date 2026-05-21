/**
 * Enhanced Onboarding Modal Component for BiNx React App
 * Purpose: Collect detailed user preferences for AI recommendations
 * Matches EXACT BiNx OnboardingModal styling
 * Author: ML
 * Date: August 14, 2025
 */

 import React, { useState, useEffect } from 'react'
 import PropTypes from 'prop-types'
 import { useAuth } from '../../hooks/useAuth'
 import { useUIStore } from '../../store/uiStore'
 import { API_ENDPOINTS } from '../../utils/constants'
 import { edgeFunctionHeaders } from '../../services/supabase'
 
 const EnhancedOnboardingModal = ({ isOpen, onClose, onComplete }) => {
     const { updateProfile, user } = useAuth()
     const showMessage = useUIStore(state => state.showMessageModal)
     const [loading, setLoading] = useState(false)
     const [step, setStep] = useState(0)
     const totalSteps = 6
     
     // Form state for all preferences
     const [preferences, setPreferences] = useState({
         cuisinePreferences:   [],
         activityTypes:        [],
         priceComfort:         null,
         discoveryStyle:       null,
         socialPreference:     null,
         aestheticPreferences: [],
         avoidancePreferences: []
     })
 
     useEffect(() => {
         if (isOpen) {
             setStep(0)
             if (user?.profile?.enhancedOnboardingCompleted) {
                 setPreferences({
                     cuisinePreferences:   user.profile.cuisinePreferences   ?? [],
                     activityTypes:        user.profile.activityTypes        ?? [],
                     priceComfort:         user.profile.priceComfort         ?? null,
                     discoveryStyle:       user.profile.discoveryStyle       ?? null,
                     socialPreference:     user.profile.socialPreference     ?? null,
                     aestheticPreferences: user.profile.aestheticPreferences ?? [],
                     avoidancePreferences: user.profile.avoidancePreferences ?? []
                 })
             }
         }
     }, [isOpen, user])
  
     // Predefined options
     const cuisineOptions = [
         'italian', 'japanese', 'mexican', 'chinese', 'indian', 'mediterranean',
         'french', 'thai', 'local', 'fusion', 'american', 'middle-eastern'
     ]
  
     const activityOptions = [
         'cultural', 'outdoors', 'nightlife', 'shopping', 'wellness', 
         'food-focused', 'artistic', 'social', 'quiet', 'active'
     ]
  
     const priceOptions = [
         { value: 'free', label: 'Free ($0)' },
         { value: 'budget', label: 'Budget-friendly ($)' },
         { value: 'mid-range', label: 'Mid-range ($$)' },
         { value: 'high-end', label: 'High-end ($$$)' },
         { value: 'no-limit', label: 'No limit ($$$$)' }
     ]
  
     const discoveryOptions = [
         { value: 'hidden-gems',  label: 'Hidden gems & local secrets' },
         { value: 'popular',      label: 'Popular & well-known places' },
         { value: 'trending',     label: 'Trending & newly opened' },
         { value: 'word-of-mouth', label: 'Word-of-mouth recommendations' },
         { value: 'established',  label: 'Established favorites' }
     ]

     const socialOptions = [
         { value: 'solo',        label: 'Solo explorer' },
         { value: 'intimate',    label: 'Intimate pairs/couples' },
         { value: 'small-group', label: 'Small groups (3–5 people)' },
         { value: 'large-group', label: 'Large groups & social scenes' }
     ]
  
     const aestheticOptions = [
         'cozy', 'vintage', 'modern', 'rustic', 'elegant', 'quirky',
         'minimalist', 'vibrant', 'intimate', 'spacious'
     ]
  
     const avoidanceOptions = [
         'crowded-places', 'loud-music', 'expensive-venues', 'tourist-traps',
         'chain-restaurants', 'late-night-spots'
     ]
  
     // Handle array preferences (checkboxes)
     const handleArrayPreference = (category, value) => {
         setPreferences(prev => ({
             ...prev,
             [category]: prev[category].includes(value)
                 ? prev[category].filter(item => item !== value)
                 : [...prev[category], value]
         }))
     }
  
     // Handle single preferences (radio buttons)
     const handleSinglePreference = (category, value) => {
         setPreferences(prev => ({
             ...prev,
             [category]: value
         }))
     }
  
     // Navigation functions
     const handleNext = () => {
         if (step < totalSteps - 1) {
             setStep(step + 1)
         }
     }
  
     const handlePrevious = () => {
         if (step > 0) {
             setStep(step - 1)
         }
     }
  
     const handleSkip = () => {
         onClose()
     }
  
     const handleSave = async () => {
         setLoading(true)
         try {
             await updateProfile({
                 ...preferences,
                 enhancedOnboardingCompleted: true
             })

             // Fire-and-forget — initialise taste profile weights on the server
             fetch(API_ENDPOINTS.SEED_TASTE_PROFILE, {
                 method: 'POST',
                 headers: edgeFunctionHeaders,
                 body: JSON.stringify({ user_id: user.id, preferences })
             }).catch(console.error)

             showMessage('Profile saved')
             onComplete?.()
             onClose()
         } catch (error) {
             console.error('Enhanced onboarding failed:', error)
         } finally {
             setLoading(false)
         }
     }
  
     // Get step titles
     const getStepTitle = () => {
         const titles = [
             'Activity Preferences',
             'Cuisine Preferences',
             'Budget Preferences',
             'Discovery Style',
             'Social Style',
             'Final Touches'
         ]
         return titles[step]
     }
  
     // Render checkbox group
     const renderCheckboxGroup = (options, category) => (
         <div className="space-y-3">
             {options.map(option => (
                 <div key={option}>
                     <label className="flex items-center space-x-3 cursor-pointer">
                         <input
                             type="checkbox"
                             checked={preferences[category].includes(option)}
                             onChange={() => handleArrayPreference(category, option)}
                             className="rounded border-gray-300 text-customPurple"
                             style={{ accentColor: '#bdbdbd' }}
                         />
                         <span className="text-sm text-gray-700 capitalize">
                             {option.replace('-', ' ')}
                         </span>
                     </label>
                 </div>
             ))}
         </div>
     )
  
     // Render radio group  
     const renderRadioGroup = (options, category) => (
         <div className="space-y-3">
             {options.map(option => (
                 <div key={option.value}>
                     <label className="flex items-center space-x-3 cursor-pointer">
                         <input
                             type="radio"
                             name={category}
                             value={option.value}
                             checked={preferences[category] === option.value}
                             onChange={() => handleSinglePreference(category, option.value)}
                             className="border-gray-300 text-customPurple"
                             style={{ accentColor: '#bdbdbd' }}
                         />
                         <span className="text-sm text-gray-700">{option.label}</span>
                     </label>
                 </div>
             ))}
         </div>
     )
  
     if (!isOpen) return null
  
     return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-lg text-left">

                 {/* Header */}
                 <div className="flex justify-between items-center mb-4">
                     <p className="text-sm text-gray-500">Step {step + 1} of {totalSteps}</p>
                     <h3 className="text-xl font-semibold text-customPurpleText">Personalize BiNx</h3>
                     <button
                         onClick={onClose}
                         className="text-customPurpleText transition-colors"
                         aria-label="Close modal"
                     >
                         ✕
                     </button>
                 </div>
  
                 {/* Form Fields */}
                 <div className="space-y-4">
                     <h3 className="text-xl font-semibold text-gray-800">{getStepTitle()}</h3>
                     
                     {step === 0 && renderCheckboxGroup(activityOptions, 'activityTypes')}
                     {step === 1 && renderCheckboxGroup(cuisineOptions, 'cuisinePreferences')}
                     {step === 2 && renderRadioGroup(priceOptions, 'priceComfort')}
                     {step === 3 && renderRadioGroup(discoveryOptions, 'discoveryStyle')}
                     {step === 4 && renderRadioGroup(socialOptions, 'socialPreference')}
                     {step === 5 && (
                         <div className="space-y-4">
                             <div>
                                 <label className="text-sm font-semibold text-gray-700 block mb-3">Aesthetic Preferences</label>
                                 {renderCheckboxGroup(aestheticOptions, 'aestheticPreferences')}
                             </div>
                             <div>
                                 <label className="text-sm font-semibold text-gray-700 block mb-3">Avoid</label>
                                 {renderCheckboxGroup(avoidanceOptions, 'avoidancePreferences')}
                             </div>
                         </div>
                     )}
                 </div>
  
                 {/* Action Buttons */}
                 <div className="flex space-x-3 mt-6">
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
 
                     <div className="flex-1"></div>
  
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
  
 EnhancedOnboardingModal.propTypes = {
     isOpen: PropTypes.bool.isRequired,
     onClose: PropTypes.func.isRequired,
     onComplete: PropTypes.func
 }
  
 export default EnhancedOnboardingModal