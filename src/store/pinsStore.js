/**
 * Pins Store for BiNx React App
 * Purpose: Manage pins state with Firebase Firestore integration
 * Author: ML
 * Date: August 8, 2025
 */

import { create } from 'zustand'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'


import { db, storage, auth } from '../services/firebase'
import { DEMO_USER, DEMO_PINS } from '../utils/constants'
import { sortPinsByTimestamp, dataURLtoFile, blobToFile } from '../utils/helpers'
import { handleFirebaseError } from '../services/errorInterceptor'


/**
 * File Upload Helper
 * Uploads files to Firebase Storage with proper error handling
 * FIXED: Added auth verification before upload 08/21/25
 */
 const uploadFileToFirebase = async (file, path) => {
  if (!file) return null

  try {
    // CRITICAL FIX: Verify auth state before upload
    if (!auth.currentUser) {
      throw new Error('Authentication required. Please sign in again.')
    }

    // Verify token is still valid
    await auth.currentUser.getIdToken(false)

    const storageRef = ref(storage, path)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)

    console.log('✅ File uploaded to:', downloadURL)
    return downloadURL
  } catch (error) {
    console.error('❌ File upload failed:', error)
    
    // Enhanced error context for auth issues
    if (error.code === 'storage/unauthorized' || error.code === 'storage/unauthenticated') {
      throw new Error('Storage access denied. Please sign in again.')
    }
    
    throw error
  }
}

/**
 * Pins Store
 * Manages pins collection with real-time Firebase sync
 */
export const usePinsStore = create((set, get) => ({
  // State
  pins: [],
  loading: false,
  error: null,
  unsubscribe: null,
  currentUserId: null,

  // Actions

  /**
   * Initialize pins listener for a user
   */
  initializePins: (userId) => {
    const { unsubscribe: currentUnsubscribe, currentUserId } = get()

    // Cleanup existing listener if user changed
    if (currentUnsubscribe && currentUserId !== userId) {
      currentUnsubscribe()
    }

    if (currentUserId === userId) return // Already initialized for this user

    set({ loading: true, currentUserId: userId, error: null })

    if (userId === DEMO_USER.id) {
      // Demo user - use local demo data
      set({
        pins: sortPinsByTimestamp(DEMO_PINS),
        loading: false,
        unsubscribe: null
      })
      return
    }

    if (!userId) {
      // No user - clear pins
      set({ pins: [], loading: false, unsubscribe: null, currentUserId: null })
      return
    }

    // Real user - set up Firestore listener
    try {
      const pinsCollection = collection(db, 'users', userId, 'pins')
      const pinsQuery = query(pinsCollection, orderBy('timestamp', 'desc'))

      const unsubscribe = onSnapshot(
        pinsQuery,
        (snapshot) => {
          const pinsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
          }))

          set({ pins: pinsData, loading: false, error: null })
        },
        (error) => {
          console.error('Pins listener error:', error)
          const errorMessage = handleFirebaseError(error)
          set({ error: errorMessage, loading: false })
        }
      )

      set({ unsubscribe })

    } catch (error) {
      const errorMessage = handleFirebaseError(error)
      set({ error: errorMessage, loading: false })
    }
  },

  /**
   * Add new pin
   */
  addPin: async (newPin) => {
    const { currentUserId } = get()
    if (!currentUserId) throw new Error('No user logged in')

    set({ loading: true, error: null })

    try {
      if (currentUserId === DEMO_USER.id) {
        // Demo user - add to local state
        const pin = {
          ...newPin,
          id: Date.now().toString(),
          userId: currentUserId,
          timestamp: new Date(),
          culturalContext: newPin.culturalContext || 'Personal discovery'
        }

        const { pins } = get()
        const updatedPins = sortPinsByTimestamp([...pins, pin])
        set({ pins: updatedPins, loading: false })

        return { success: true }
      }

      // Real user - process uploads and save to Firestore
      let uploadedPhotoUrl = null
      let uploadedAudioUrl = null
      const pinId = Date.now().toString()

      // Upload photo if exists
      if (newPin.photo && typeof newPin.photo === 'string' && newPin.photo.startsWith('data:')) {
        const photoFile = dataURLtoFile(newPin.photo, `pin-photo-${pinId}.jpg`)
        const photoPath = `users/${currentUserId}/pins/${pinId}/photo.jpg`
        uploadedPhotoUrl = await uploadFileToFirebase(photoFile, photoPath)
      } else if (newPin.photo) {
        uploadedPhotoUrl = newPin.photo
      }


      if (newPin.audioBlob) {
        // More robust extension detection for cross-platform compatibility
        let extension = 'm4a' // Default for iOS
        
        if (newPin.audioBlob.type.includes('webm')) {
          extension = 'webm'
        } else if (newPin.audioBlob.type.includes('mp4')) {
          extension = 'm4a'
        } else if (newPin.audioBlob.type.includes('wav')) {
          extension = 'wav'
        }
        
        console.log('📱 Audio upload - Type:', newPin.audioBlob.type, 'Extension:', extension)
        
        const audioFile = blobToFile(newPin.audioBlob, `pin-audio-${pinId}.${extension}`)
        const audioPath = `users/${currentUserId}/pins/${pinId}/audio.${extension}`
        uploadedAudioUrl = await uploadFileToFirebase(audioFile, audioPath)
      }

      // Create pin document
      const pin = {
        ...newPin,
        userId: currentUserId,
        timestamp: serverTimestamp(),
        culturalContext: newPin.culturalContext || 'Personal discovery',
        photo: uploadedPhotoUrl,
        audioUrl: uploadedAudioUrl
      }

      // Remove client-side properties
      delete pin.audioBlob

      // Add to Firestore
      const pinsCollection = collection(db, 'users', currentUserId, 'pins')
      await addDoc(pinsCollection, pin)

      set({ loading: false })
      return { success: true }

    } catch (error) {
      const errorMessage = handleFirebaseError(error)
      set({ error: errorMessage, loading: false })
      return { success: false, error: errorMessage }
    }
  },

  /**
   * Delete pin
   */
  deletePin: async (pinId) => {
    const { currentUserId, pins } = get()
    if (!currentUserId) throw new Error('No user logged in')

    set({ loading: true, error: null })

    try {
      if (currentUserId === DEMO_USER.id) {
        // Demo user - remove from local state
        const updatedPins = pins.filter(pin => pin.id !== pinId)
        set({ pins: updatedPins, loading: false })
        return { success: true }
      }

      // Real user - delete from Firestore and Storage
      const pin = pins.find(p => p.id === pinId)

      // Delete document from Firestore
      await deleteDoc(doc(db, 'users', currentUserId, 'pins', pinId))

      // Delete associated files from Storage (background operation)
      if (pin) {
        const basePath = `users/${currentUserId}/pins/${pinId}`

        if (pin.photo) {
          try {
            await deleteObject(ref(storage, `${basePath}/photo.jpg`))
          } catch (error) {
            console.warn('Photo file not found in storage:', error)
          }
        }

        if (pin.audioUrl) {
          try {
            await deleteObject(ref(storage, `${basePath}/audio.m4a`))
          } catch (error) {
            console.warn('Audio file not found in storage:', error)
          }
        }
      }

      set({ loading: false })
      return { success: true }

    } catch (error) {
      const errorMessage = handleFirebaseError(error)
      set({ error: errorMessage, loading: false })
      return { success: false, error: errorMessage }
    }
  },

  /**
   * Get pin by ID
   */
  getPinById: (pinId) => {
    const { pins } = get()
    return pins.find(pin => pin.id === pinId)
  },

  /**
   * Filter pins by mood
   */
  getPinsByMood: (mood) => {
    const { pins } = get()
    return pins.filter(pin => pin.mood === mood)
  },

  /**
   * Search pins
   */
  searchPins: (searchTerm) => {
    const { pins } = get()
    if (!searchTerm) return pins

    const term = searchTerm.toLowerCase()
    return pins.filter(pin =>
      pin.title.toLowerCase().includes(term) ||
      pin.note.toLowerCase().includes(term) ||
      pin.location.name.toLowerCase().includes(term) ||
      pin.culturalContext?.toLowerCase().includes(term)
    )
  },

  /**
   * Get pins count
   */
  getPinsCount: () => {
    const { pins } = get()
    return pins.length
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Cleanup
   */
  cleanup: () => {
    const { unsubscribe } = get()
    if (unsubscribe) {
      unsubscribe()
      set({ unsubscribe: null })
    }
    set({ pins: [], currentUserId: null, loading: false, error: null })
  }
}))