/**
 * UI Store for BiNx React App
 * Purpose: Manage UI state including modals, themes, and navigation
 * Author: ML
 * Date: August 8, 2025
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PALETTES, GUIDES } from '../utils/constants'
import { applyTheme } from '../utils/helpers'

/**
 * UI Store
 * Manages application UI state and user preferences
 */
export const useUIStore = create(
  persist(
    (set, get) => ({
      // Theme State
      selectedPaletteName: PALETTES[0].name,
      selectedGuideName: GUIDES[0].name,

      // Modal States
      messageModal: {
        isOpen: false,
        title: '',
        message: ''
      },

      photoModal: {
        isOpen: false,
        imageUrl: null
      },

      deleteConfirmModal: {
        isOpen: false,
        pin: null
      },

      onboardingModal: {
        isOpen: false
      },

      recommendationsModal: {
        isOpen: false,
        loading: false,
        error: null,
        currentRecommendations: [],
        savedRecommendations: [],
        cacheKey: null,
        lastUpdated: null,
        sessionId: null,
        currentSessionPlaces: [],
        interactionCount: 0,
      },
      locationsModal: {
        isOpen: false
      },

      // Navigation State
      currentView: 'auth', // 'auth' | 'main'
      selectedPin: null,
      showPinCreation: false,
      showUserProfile: false,

      // Loading States
      isAppLoading: true,

      // Actions

      /**
       * Theme Management
       */
      setSelectedPalette: (paletteName) => {
        const palette = PALETTES.find(p => p.name === paletteName)
        if (palette) {
          set({ selectedPaletteName: paletteName })
          applyTheme(palette)
        }
      },

      setSelectedGuide: (guideName) => {
        const guide = GUIDES.find(g => g.name === guideName)
        if (guide) {
          set({ selectedGuideName: guideName })
        }
      },

      getSelectedPalette: () => {
        const { selectedPaletteName } = get()
        return PALETTES.find(p => p.name === selectedPaletteName) || PALETTES[0]
      },

      getSelectedGuide: () => {
        const { selectedGuideName } = get()
        return GUIDES.find(g => g.name === selectedGuideName) || GUIDES[0]
      },

      /**
       * Modal Management
       */
      showMessageModal: (title, message) => {
        set({
          messageModal: {
            isOpen: true,
            title,
            message
          }
        })
      },

      hideMessageModal: () => {
        set({
          messageModal: {
            isOpen: false,
            title: '',
            message: ''
          }
        })
      },

      showPhotoModal: (imageUrl) => {
        set({
          photoModal: {
            isOpen: true,
            imageUrl
          }
        })
      },

      hidePhotoModal: () => {
        set({
          photoModal: {
            isOpen: false,
            imageUrl: null
          }
        })
      },

      showDeleteConfirmModal: (pin) => {
        set({
          deleteConfirmModal: {
            isOpen: true,
            pin
          }
        })
      },

      hideDeleteConfirmModal: () => {
        set({
          deleteConfirmModal: {
            isOpen: false,
            pin: null
          }
        })
      },

      showOnboardingModal: () => {
        set({
          onboardingModal: {
            isOpen: true
          }
        })
      },

      hideOnboardingModal: () => {
        set({
          onboardingModal: {
            isOpen: false
          }
        })
      },

      /**
       * Recommendations Modal Management
       */
      showRecommendationsModal: () => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            isOpen: true
          }
        })
      },

      hideRecommendationsModal: () => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            isOpen: false,
            loading: false,
            error: null
          }
        })
      },
      /**
* Locations Modal Management
*/
      showLocationsModal: () => {
        set({
          locationsModal: {
            isOpen: true
          }
        })
      },

      hideLocationsModal: () => {
        set({
          locationsModal: {
            isOpen: false
          }
        })
      },

      setRecommendationsLoading: (loading) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            loading
          }
        })
      },

      setRecommendationsError: (error) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            error,
            ...(error !== null && { loading: false })
          }
        })
      },

      appendRecommendation: (recommendation) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            currentRecommendations: [...get().recommendationsModal.currentRecommendations, recommendation]
          }
        })
      },

      setSessionComplete: (sessionId, sessionPlaces) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            sessionId,
            currentSessionPlaces: sessionPlaces,
            loading: false,
            error: null
          }
        })
      },

      setCurrentRecommendations: (recommendations, cacheKey = null) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            currentRecommendations: recommendations,
            cacheKey,
            lastUpdated: new Date().toISOString(),
            loading: false,
            error: null
          }
        })
      },

      addToSavedRecommendations: (recommendation) => {
        const { savedRecommendations } = get().recommendationsModal

        // Check if already saved
        const alreadySaved = savedRecommendations.find(r => r.name === recommendation.name)
        if (alreadySaved) return

        const savedRec = {
          ...recommendation,
          saved_at: new Date().toISOString(),
          original_cache_key: get().recommendationsModal.cacheKey
        }

        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            savedRecommendations: [...savedRecommendations, savedRec]
          }
        })
      },

      removeFromSavedRecommendations: (recommendationName) => {
        const { savedRecommendations } = get().recommendationsModal

        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            savedRecommendations: savedRecommendations.filter(r => r.name !== recommendationName)
          }
        })
      },

      removeFromCurrentRecommendations: (recommendationName) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            currentRecommendations: get().recommendationsModal.currentRecommendations.filter(r => r.name !== recommendationName)
          }
        })
      },

      seedSavedLocations: (locations) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            savedRecommendations: locations
          }
        })
      },

      clearRecommendations: () => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            currentRecommendations: [],
            error: null
          }
        })
      },

      setSessionId: (sessionId) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            sessionId
          }
        })
      },

      setCurrentSessionPlaces: (places) => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            currentSessionPlaces: places
          }
        })
      },

      incrementInteractionCount: () => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            interactionCount: get().recommendationsModal.interactionCount + 1
          }
        })
      },

      resetSession: () => {
        set({
          recommendationsModal: {
            ...get().recommendationsModal,
            sessionId: null,
            currentSessionPlaces: [],
            interactionCount: 0
          }
        })
      },

      /**
       * Navigation Management
       */
      setCurrentView: (view) => {
        set({ currentView: view })
      },

      setSelectedPin: (pin) => {
        set({ selectedPin: pin })
      },

      clearSelectedPin: () => {
        set({ selectedPin: null })
      },

      showPinCreationModal: () => {
        set({ showPinCreation: true })
      },

      hidePinCreationModal: () => {
        set({ showPinCreation: false })
      },

      showUserProfileModal: () => {
        set({ showUserProfile: true })
      },

      hideUserProfileModal: () => {
        set({ showUserProfile: false })
      },

      /**
       * Loading States
       */
      setAppLoading: (loading) => {
        set({ isAppLoading: loading })
      },

      /**
       * Initialize UI
       * Apply stored theme and setup initial state
       */
      initializeUI: () => {
        const { selectedPaletteName } = get()
        const palette = PALETTES.find(p => p.name === selectedPaletteName) || PALETTES[0]
        applyTheme(palette)
        set({ isAppLoading: false })
      },

      /**
       * Reset UI State
       * Clear all modals and navigation state
       */
      resetUI: () => {
        set({
          messageModal: { isOpen: false, title: '', message: '' },
          photoModal: { isOpen: false, imageUrl: null },
          deleteConfirmModal: { isOpen: false, pin: null },
          onboardingModal: { isOpen: false },
          locationsModal: { isOpen: false },
          recommendationsModal: {
            isOpen: false,
            loading: false,
            error: null,
            currentRecommendations: [],
            savedRecommendations: [],
            cacheKey: null,
            lastUpdated: null,
            sessionId: null,
            currentSessionPlaces: [],
            interactionCount: 0,
          },
          selectedPin: null,
          showPinCreation: false,
          showUserProfile: false,
          currentView: 'auth'
        })
      },

      /**
       * Bulk Modal Actions
       */
      closeAllModals: () => {
        set({
          messageModal: { isOpen: false, title: '', message: '' },
          photoModal: { isOpen: false, imageUrl: null },
          deleteConfirmModal: { isOpen: false, pin: null },
          onboardingModal: { isOpen: false },
          locationsModal: { isOpen: false },
          recommendationsModal: {
            isOpen: false,
            loading: false,
            error: null,
            currentRecommendations: [],
            savedRecommendations: [],
            cacheKey: null,
            lastUpdated: null,
            sessionId: null,
            currentSessionPlaces: [],
            interactionCount: 0,
          },
          showPinCreation: false,
          showUserProfile: false
        })
      },

      /**
       * Get Modal States (for easy component access)
       */
      getModalStates: () => {
        const state = get()
        return {
          messageModal: state.messageModal,
          photoModal: state.photoModal,
          deleteConfirmModal: state.deleteConfirmModal,
          onboardingModal: state.onboardingModal,
          locationsModal: state.locationsModal,
          recommendationsModal: state.recommendationsModal,
          showPinCreation: state.showPinCreation,
          showUserProfile: state.showUserProfile
        }
      },

      /**
       * Navigation Helpers
       */
      isModalOpen: () => {
        const state = get()
        return (
          state.messageModal.isOpen ||
          state.photoModal.isOpen ||
          state.deleteConfirmModal.isOpen ||
          state.onboardingModal.isOpen ||
          state.locationsModal.isOpen ||
          state.recommendationsModal.isOpen ||
          state.showPinCreation ||
          state.showUserProfile ||
          !!state.selectedPin
        )
      },

      navigateToAuth: () => {
        set({ currentView: 'auth' })
        get().resetUI()
      },

      navigateToMain: () => {
        set({ currentView: 'main' })
      }
    }),
    {
      name: 'binx-ui',
      partialize: (state) => ({
        // Persist user preferences
        selectedPaletteName: state.selectedPaletteName,
        selectedGuideName: state.selectedGuideName
      })
    }
  )
)
