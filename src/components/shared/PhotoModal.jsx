/**
 * Photo Modal Component for BiNx React App
 * Purpose: Display pin photos in a modal overlay
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useEffect } from 'react'
 import PropTypes from 'prop-types'
 
 /**
  * PhotoModal Component
  * Shows full-size pin photos with controls
  */
 const PhotoModal = ({ isOpen, imageUrl, onClose, altText = 'Pin Photo' }) => {
   // Handle escape key
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
 
   // Prevent body scroll when modal is open
   useEffect(() => {
     if (isOpen) {
       document.body.style.overflow = 'hidden'
       return () => {
         document.body.style.overflow = 'unset'
       }
     }
   }, [isOpen])
 
   if (!isOpen || !imageUrl) return null
 
   const handleBackdropClick = (e) => {
     if (e.target === e.currentTarget && onClose) {
       onClose()
     }
   }
 
   return (
     <div 
       className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-y-auto"
       role="dialog"
       aria-modal="true"
       aria-label="Photo viewer"
       onClick={handleBackdropClick}
     >
       {/* Modal Container */}
       <div className="relative">
         {/* Photo Container */}
         <div className="bg-white rounded-2xl p-4 max-w-4xl w-full shadow-lg my-auto">
           <img 
             src={imageUrl} 
             alt={altText}
             className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
             loading="lazy"
           />
         </div>
         
         {/* Close Button */}
         <button
           onClick={onClose}
           className="absolute -top-8 -right-8 bg-gray-200 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center text-xl z-50 shadow-md hover:bg-gray-300 transition-colors"
           title="Close photo"
           aria-label="Close photo"
         >
           ✕
         </button>
       </div>
     </div>
   )
 }
 
 PhotoModal.propTypes = {
   isOpen: PropTypes.bool.isRequired,
   imageUrl: PropTypes.string,
   onClose: PropTypes.func.isRequired,
   altText: PropTypes.string
 }
 
 export default PhotoModal