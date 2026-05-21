/**
 * Delete Confirmation Modal Component for BiNx React App
 * Purpose: Confirm pin deletion with preview
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useEffect } from 'react'
 import PropTypes from 'prop-types'
 import { PinType } from '../../types'
 
 /**
  * DeleteConfirmModal Component
  * Shows confirmation dialog before deleting a pin
  */
 const DeleteConfirmModal = ({ 
   isOpen, 
   pin, 
   onConfirm, 
   onCancel,
   loading = false 
 }) => {
   // Handle escape key
   useEffect(() => {
     const handleEscape = (e) => {
       if (e.key === 'Escape' && isOpen && onCancel && !loading) {
         onCancel()
       }
     }
 
     if (isOpen) {
       document.addEventListener('keydown', handleEscape)
       return () => document.removeEventListener('keydown', handleEscape)
     }
   }, [isOpen, onCancel, loading])
 
   // Prevent body scroll when modal is open
   useEffect(() => {
     if (isOpen) {
       document.body.style.overflow = 'hidden'
       return () => {
         document.body.style.overflow = 'unset'
       }
     }
   }, [isOpen])
 
   if (!isOpen || !pin) return null
 
   const handleConfirm = () => {
     if (onConfirm && !loading) {
       onConfirm(pin)
     }
   }
 
   const handleCancel = () => {
     if (onCancel && !loading) {
       onCancel()
     }
   }
 
   return (
     <div 
       className="fixed inset-0 bg-white bg-opacity-50 z-50 flex items-center justify-center p-4"
       role="dialog"
       aria-modal="true"
       aria-labelledby="delete-modal-title"
       aria-describedby="delete-modal-description"
     >
       
       <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg text-left">
         {/* Header */}
         <div className="flex items-center space-x-3 mb-4">
           <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
             <i 
               className="fas fa-exclamation-triangle text-customPurple text-xl" 
               aria-hidden="true"
             />
           </div>
           <div>
             <h3 
               id="delete-modal-title"
               className="font-medium text-gray-900"
             >
               Delete?
             </h3>
             <p 
               id="delete-modal-description"
               className="text-sm text-gray-500"
             >
               This action cannot be undone...
             </p>
           </div>
         </div>
 
         {/* Pin Preview */}
         <div className="bg-gray-50 rounded-lg p-3 mb-6">
           <p className="text-sm font-medium text-gray-900 mb-1">
             {pin.title}
           </p>
           <p className="text-xs text-gray-500">
             {pin.location.name}
           </p>
           {pin.note && (
             <p className="text-xs text-gray-600 mt-2 line-clamp-2">
               {pin.note}
             </p>
           )}
         </div>
 
         {/* Actions */}
         <div className="flex space-x-3">
           <button
             onClick={handleCancel}
             disabled={loading}
             className="flex-1 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-300"
           >
             Cancel
           </button>
           <button
             onClick={handleConfirm}
             disabled={loading}
             className="flex-1 py-3 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-customPurple focus:ring-offset-2 flex items-center justify-center"
           >
             {loading ? (
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
             ) : (
               'Delete'
             )}
           </button>
         </div>
       </div>
     </div>
   )
 }
 
 DeleteConfirmModal.propTypes = {
   isOpen: PropTypes.bool.isRequired,
   pin: PinType,
   onConfirm: PropTypes.func.isRequired,
   onCancel: PropTypes.func.isRequired,
   loading: PropTypes.bool
 }
 
 export default DeleteConfirmModal