/**
 * Message Modal Component for BiNx React App
 * Purpose: Display system messages and notifications
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useEffect } from 'react'
 import PropTypes from 'prop-types'
 
 /**
  * MessageModal Component
  * Shows system messages with customizable styling
  */
 const MessageModal = ({ 
   isOpen, 
   title, 
   message, 
   onClose,
   type = 'info',
   autoClose = false,
   autoCloseDelay = 5000
 }) => {
   // Auto-close functionality
   useEffect(() => {
     if (isOpen && autoClose && onClose) {
       const timer = setTimeout(() => {
         onClose()
       }, autoCloseDelay)
 
       return () => clearTimeout(timer)
     }
   }, [isOpen, autoClose, autoCloseDelay, onClose])
 
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
 
   if (!isOpen) return null
 
   const typeConfig = {
     info: {
       icon: 'fas fa-info-circle',
       iconColor: 'text-customPurple',
       bgColor: 'bg-customBackground'
     },
     success: {
       icon: 'fas fa-check-circle',
       iconColor: 'text-green-600',
       bgColor: 'bg-green-100'
     },
     warning: {
       icon: 'fas fa-exclamation-triangle',
       iconColor: 'text-yellow-600',
       bgColor: 'bg-yellow-100'
     },
     error: {
       icon: 'fas fa-exclamation-circle',
       iconColor: 'text-red-600',
       bgColor: 'bg-red-100'
     }
   }
 
   const config = typeConfig[type] || typeConfig.info
 
   return (
     <div 
       className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
       role="dialog"
       aria-modal="true"
       aria-labelledby="modal-title"
       aria-describedby="modal-message"
     >
   
       <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg text-left">
         <div className="flex items-center space-x-3 mb-4">
           <div className={`w-12 h-12 ${config.bgColor} rounded-full flex items-center justify-center`}>
             <i className={`${config.icon} ${config.iconColor} text-xl`} aria-hidden="true"></i>
           </div>
           <div className="flex-1">
             <h3 
               id="modal-title"
               className="font-medium text-gray-900"
             >
               {title}
             </h3>
             <p 
               id="modal-message"
               className="text-sm text-gray-500"
             >
               {message}
             </p>
           </div>
         </div>
         
         <div className="flex justify-end">
           <button
             onClick={onClose}
             className="py-2 px-4 bg-customPurple text-white rounded-xl font-medium transition-colors hover:opacity-90"
             autoFocus
           >
             OK
           </button>
         </div>
       </div>
     </div>
   )
 }
 
 MessageModal.propTypes = {
   isOpen: PropTypes.bool.isRequired,
   title: PropTypes.string.isRequired,
   message: PropTypes.string.isRequired,
   onClose: PropTypes.func.isRequired,
   type: PropTypes.oneOf(['info', 'success', 'warning', 'error']),
   autoClose: PropTypes.bool,
   autoCloseDelay: PropTypes.number
 }
 
 export default MessageModal