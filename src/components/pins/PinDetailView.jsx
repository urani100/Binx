/**
 * Pin Detail View Component for BiNx React App - EXACT REPLICA
 * Purpose: Full-screen pin details modal matching original index.html
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useEffect } from 'react'
 import PropTypes from 'prop-types'
 import { PinType } from '../../types'
 import { VibeTag } from '../ui'
 import { CustomAudioPlayer } from '../shared'
 import { formatTimestamp } from '../../utils/helpers'
 
 /**
  * PinDetailView Component - EXACT REPLICA
  * Shows full pin details in modal overlay
  */
 const PinDetailView = ({ 
   isOpen, 
   pin, 
   onClose, 
   onDelete 
 }) => {
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
 
   if (!isOpen || !pin) return null
 
   const { date, time } = formatTimestamp(pin.timestamp)
 
   /**
    * Handle delete click - EXACT ORIGINAL
    */
   const handleDeleteClick = () => {
     if (onDelete) {
       onDelete(pin)
     }
   }
 
   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
       <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg my-auto text-left">
         
         {/* Header - EXACT ORIGINAL */}
         <div className="flex justify-between items-center mb-6">
           <button
             onClick={onClose}
             className="text-customPurpleText transition-colors"
           >
             ← Back
           </button>
           <div className="flex items-center space-x-3">
             <button
               onClick={handleDeleteClick}
               className="w-8 h-8 flex items-center justify-center rounded-full bg-customBackground text-customPurpleText transition-colors"
               title="Delete pin"
             >
               <i className="fas fa-trash-alt text-sm"></i>
             </button>
               {/* Hiding SHARE BUTTON for now ... no functionality */}
             {/* <button className="text-customPurpleText">
               <i className="fas fa-share-alt text-base"></i>
             </button> */}
           </div>
         </div>
 
         {/* Pin Title and Info - EXACT ORIGINAL */}
         <div className="mb-6">
           <h1 className="text-xl font-medium text-gray-900 mb-2">{pin.title}</h1>
           <p className="text-sm text-gray-500 mb-1">{pin.location.name}</p>
           <p className="text-xs text-gray-400">{date} at {time}</p>
         </div>
 
         {/* Vibe Tag - EXACT ORIGINAL */}
         <div className="mb-6">
           <VibeTag vibe={pin.mood} size="lg" />
         </div>
 
         {/* Photo - EXACT ORIGINAL */}
         {pin.photo && (
           <img 
             src={pin.photo} 
             alt="Pin photo" 
             className="w-full h-80 object-cover rounded-xl mb-6" 
           />
         )}
 
         {/* Note Content - EXACT ORIGINAL */}
         <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
           <p className="text-sm text-gray-900 leading-relaxed">{pin.note}</p>
         </div>
 
         {/* Audio Section - EXACT ORIGINAL */}
         {pin.audioUrl &&(
           <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
             <div className="flex items-center space-x-3 mb-3">
               <div className="flex-1">
                 {/* Audio player title removed for cleaner look */}
               </div>
             </div>
             {pin.audioUrl === 'demo-audio' ? (
               <div className="bg-gray-100 rounded-lg p-3 text-center">
                 <p className="text-xs text-gray-600">🎵 Demo audio - real audio would play here</p>
               </div>
             ) : (
               <CustomAudioPlayer src={pin.audioUrl} />
             )}
           </div>
         )}
 
         {/* Cultural Context - EXACT ORIGINAL HIDDING FOR NOW */}
         {/* {pin.culturalContext && (
           <div className="bg-gray-50 rounded-xl p-4">
             <div className="flex items-center space-x-2 mb-2">
               <i className="fas fa-compass text-customPurpleText text-sm"></i>
               <span className="text-sm font-medium text-gray-900">Setting</span>
             </div>
             <p className="text-sm text-gray-700">{pin.culturalContext}</p>
           </div>
         )} */}
       </div>
     </div>
   )
 }
 
 PinDetailView.propTypes = {
   isOpen: PropTypes.bool.isRequired,
   pin: PinType,
   onClose: PropTypes.func.isRequired,
   onDelete: PropTypes.func.isRequired
 }
 
 export default PinDetailView