/**
 * Pins Hook for BiNx React App
 * Purpose: Provide clean interface to pins management and Firestore integration
 * Author: ML
 * Date: August 8, 2025
 */

 import { usePinsStore } from '../store/pinsStore'
 import { useUIStore } from '../store/uiStore'
 import { useAuth } from './useAuth'
 import { useEffect } from 'react'
 
 /**
  * Pins Hook
  * Provides clean interface to pin management with automatic initialization
  */
 export const usePins = (autoInitialize = true) => {
   const { user } = useAuth()
   
   // Store selectors
   const pins = usePinsStore(state => state.pins)
   const loading = usePinsStore(state => state.loading)
   const error = usePinsStore(state => state.error)
   const currentUserId = usePinsStore(state => state.currentUserId)
 
   // Store actions
   const initializePins = usePinsStore(state => state.initializePins)
   const addPin = usePinsStore(state => state.addPin)
   const deletePin = usePinsStore(state => state.deletePin)
   const getPinById = usePinsStore(state => state.getPinById)
   const getPinsByMood = usePinsStore(state => state.getPinsByMood)
   const searchPins = usePinsStore(state => state.searchPins)
   const getPinsCount = usePinsStore(state => state.getPinsCount)
   const clearError = usePinsStore(state => state.clearError)
   const cleanup = usePinsStore(state => state.cleanup)
 
   // UI store for messaging
   const showMessage = useUIStore(state => state.showMessageModal)
   const showDeleteConfirm = useUIStore(state => state.showDeleteConfirmModal)
 
   // Auto-initialize pins when user changes
   useEffect(() => {
     if (autoInitialize && user?.id && currentUserId !== user.id) {
       initializePins(user.id)
     } else if (!user && currentUserId) {
       cleanup()
     }
   }, [user?.id, currentUserId, autoInitialize, initializePins, cleanup])
 
   /**
    * Enhanced add pin with validation
    */
   const addPinWithValidation = async (pinData) => {
     clearError()
 
     // Validation
     if (!pinData.title || pinData.title.trim().length === 0) {
       showMessage('Missing Title', 'Please add a title for your feeling.')
       return { success: false, error: 'Title is required' }
     }
 
     if (!pinData.mood || pinData.mood.trim().length === 0) {
       showMessage('Missing Vibe', 'Please select a vibe for your pin.')
       return { success: false, error: 'Mood is required' }
     }
 
     // Sanitize data
     const sanitizedPin = {
       ...pinData,
       title: pinData.title.trim(),
       note: pinData.note ? pinData.note.trim() : '',
       mood: pinData.mood.trim(),
       culturalContext: pinData.culturalContext || 'Personal discovery'
     }
 
     try {
       const result = await addPin(sanitizedPin)
       
       if (result?.success !== false) {
         showMessage('Success', 'Your vibe has been pinned!')
         return { success: true }
       }
       
       return result || { success: true }
     } catch (error) {
       showMessage('Failed to Save', error.message || 'Could not save your pin. Please try again.')
       return { success: false, error: error.message }
     }
   }
 
   /**
    * Enhanced delete pin with confirmation
    */
   const deletePinWithConfirmation = (pin) => {
     if (!pin) return
 
     showDeleteConfirm(pin)
   }
 
   /**
    * Confirm delete pin (called from modal)
    */
   const confirmDeletePin = async (pinId) => {
     clearError()
 
     try {
       const result = await deletePin(pinId)
       
       if (result?.success !== false) {
         showMessage('Deleted', 'Pin removed successfully.')
         return { success: true }
       }
       
       return result || { success: true }
     } catch (error) {
       showMessage('Delete Failed', error.message || 'Could not delete pin. Please try again.')
       return { success: false, error: error.message }
     }
   }
 
   /**
    * Search pins with enhanced filtering
    */
   const searchPinsEnhanced = (searchTerm, filters = {}) => {
     if (!searchTerm && !Object.keys(filters).length) {
       return pins
     }
 
     let filteredPins = searchPins(searchTerm)
 
     // Apply additional filters
     if (filters.mood) {
       filteredPins = filteredPins.filter(pin => pin.mood === filters.mood)
     }
 
     if (filters.dateRange) {
       const { start, end } = filters.dateRange
       filteredPins = filteredPins.filter(pin => {
         const pinDate = new Date(pin.timestamp)
         return pinDate >= start && pinDate <= end
       })
     }
 
     if (filters.hasPhoto !== undefined) {
       filteredPins = filteredPins.filter(pin => 
         filters.hasPhoto ? !!pin.photo : !pin.photo
       )
     }
 
     if (filters.hasAudio !== undefined) {
       filteredPins = filteredPins.filter(pin => 
         filters.hasAudio ? !!pin.audioUrl : !pin.audioUrl
       )
     }
 
     return filteredPins
   }
 
   /**
    * Get pins by date range
    */
   const getPinsByDateRange = (startDate, endDate) => {
     return pins.filter(pin => {
       const pinDate = new Date(pin.timestamp)
       return pinDate >= startDate && pinDate <= endDate
     })
   }
 
   /**
    * Get recent pins (last N days)
    */
   const getRecentPins = (days = 7) => {
     const cutoffDate = new Date()
     cutoffDate.setDate(cutoffDate.getDate() - days)
     
     return pins.filter(pin => new Date(pin.timestamp) >= cutoffDate)
   }
 
   /**
    * Get pin statistics
    */
   const getPinStats = () => {
     const stats = {
       total: pins.length,
       withPhotos: pins.filter(pin => !!pin.photo).length,
       withAudio: pins.filter(pin => !!pin.audioUrl).length,
       byMood: {},
       thisWeek: getRecentPins(7).length,
       thisMonth: getRecentPins(30).length
     }
 
     // Count pins by mood
     pins.forEach(pin => {
       stats.byMood[pin.mood] = (stats.byMood[pin.mood] || 0) + 1
     })
 
     return stats
   }
 
   // Computed values
   const hasPins = pins.length > 0
   const isInitialized = !!currentUserId
   const isEmpty = !loading && !hasPins
 
   return {
     // State
     pins,
     loading,
     error,
     hasPins,
     isEmpty,
     isInitialized,
     currentUserId,
 
     // Basic Actions
     addPin: addPinWithValidation,
     deletePin: confirmDeletePin,
     deletePinWithConfirmation,
     clearError,
 
     // Query Actions
     getPinById,
     getPinsByMood,
     searchPins: searchPinsEnhanced,
     getPinsByDateRange,
     getRecentPins,
 
     // Utilities
     getPinsCount,
     getPinStats,
 
     // Advanced
     initializePins,
     cleanup
   }
 }
 
 export default usePins