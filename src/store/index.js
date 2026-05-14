/**
 * Store Index for BiNx React App
 * Purpose: Export all stores and provide initialization utilities
 * Author: ML
 * Date: August 8, 2025
 */

// Export all stores
export { useAuthStore } from './authStore'
export { usePinsStore } from './pinsStore'
export { useUIStore } from './uiStore'
export { useLocationStore } from './locationStore'

// Store initialization and cleanup utilities
import { useAuthStore } from './authStore'
import { usePinsStore } from './pinsStore'
import { useUIStore } from './uiStore'
import { useLocationStore } from './locationStore'

/**
 * Initialize all stores
 * Call this when the app starts
 */
export const initializeStores = () => {
  console.log('🏪 Initializing BiNx stores...')
  
  // Initialize UI first (themes, etc.)
  useUIStore.getState().initializeUI()
  
  // Initialize auth listener
  useAuthStore.getState().initialize()
  
  // Initialize location
  useLocationStore.getState().initializeLocation()
  
  console.log('✅ All stores initialized')
}

/**
 * Cleanup all stores
 * Call this when the app unmounts or user logs out
 */
export const cleanupStores = () => {
  console.log('🧹 Cleaning up stores...')
  
  // Cleanup auth listeners
  useAuthStore.getState().cleanup()
  
  // Cleanup pins listeners
  usePinsStore.getState().cleanup()
  
  // Clear location data
  useLocationStore.getState().clearLocation()
  
  // Reset UI state
  useUIStore.getState().resetUI()
  
  console.log('✅ All stores cleaned up')
}

/**
 * Setup user-specific stores
 * Call this when user logs in
 */
export const setupUserStores = (userId) => {
  console.log('👤 Setting up user stores for:', userId)
  
  // Initialize pins for this user
  usePinsStore.getState().initializePins(userId)
  
  // Set main view
  useUIStore.getState().navigateToMain()
  
  console.log('✅ User stores ready')
}

/**
 * Reset user-specific stores
 * Call this when user logs out
 */
export const resetUserStores = () => {
  console.log('🔓 Resetting user stores...')
  
  // Cleanup pins
  usePinsStore.getState().cleanup()
  
  // Navigate to auth
  useUIStore.getState().navigateToAuth()
  
  console.log('✅ User stores reset')
}

/**
 * Store selectors for common data
 */
export const useAppState = () => {
  const user = useAuthStore(state => state.user)
  const loading = useAuthStore(state => state.loading)
  const currentView = useUIStore(state => state.currentView)
  const isAppLoading = useUIStore(state => state.isAppLoading)
  
  return {
    user,
    loading,
    currentView,
    isAppLoading,
    isAuthenticated: !!user,
    isInitialized: !isAppLoading
  }
}

/**
 * Hook for modal states
 */
export const useModals = () => {
  const modalStates = useUIStore(state => state.getModalStates())
  const selectedPin = useUIStore(state => state.selectedPin)
  
  const showMessage = useUIStore(state => state.showMessageModal)
  const hideMessage = useUIStore(state => state.hideMessageModal)
  const showPhoto = useUIStore(state => state.showPhotoModal)
  const hidePhoto = useUIStore(state => state.hidePhotoModal)
  const showDeleteConfirm = useUIStore(state => state.showDeleteConfirmModal)
  const hideDeleteConfirm = useUIStore(state => state.hideDeleteConfirmModal)
  const showOnboarding = useUIStore(state => state.showOnboardingModal)
  const hideOnboarding = useUIStore(state => state.hideOnboardingModal)
  const setSelectedPin = useUIStore(state => state.setSelectedPin)
  const clearSelectedPin = useUIStore(state => state.clearSelectedPin)
  
  return {
    ...modalStates,
    selectedPin,
    showMessage,
    hideMessage,
    showPhoto,
    hidePhoto,
    showDeleteConfirm,
    hideDeleteConfirm,
    showOnboarding,
    hideOnboarding,
    setSelectedPin,
    clearSelectedPin
  }
}

/**
 * Hook for theme management
 */
export const useTheme = () => {
  const selectedPaletteName = useUIStore(state => state.selectedPaletteName)
  const selectedGuideName = useUIStore(state => state.selectedGuideName)
  const setSelectedPalette = useUIStore(state => state.setSelectedPalette)
  const setSelectedGuide = useUIStore(state => state.setSelectedGuide)
  const getSelectedPalette = useUIStore(state => state.getSelectedPalette)
  const getSelectedGuide = useUIStore(state => state.getSelectedGuide)
  
  return {
    selectedPaletteName,
    selectedGuideName,
    selectedPalette: getSelectedPalette(),
    selectedGuide: getSelectedGuide(),
    setSelectedPalette,
    setSelectedGuide
  }
}

/**
 * Hook for error handling across stores
 */
export const useGlobalErrors = () => {
  const authError = useAuthStore(state => state.error)
  const pinsError = usePinsStore(state => state.error)
  const locationError = useLocationStore(state => state.error)
  
  const clearAuthError = useAuthStore(state => state.clearError)
  const clearPinsError = usePinsStore(state => state.clearError)
  const clearLocationError = useLocationStore(state => state.clearError)
  
  const hasError = !!(authError || pinsError || locationError)
  const firstError = authError || pinsError || locationError
  
  const clearAllErrors = () => {
    clearAuthError()
    clearPinsError()
    clearLocationError()
  }
  
  return {
    authError,
    pinsError,
    locationError,
    hasError,
    firstError,
    clearAuthError,
    clearPinsError,
    clearLocationError,
    clearAllErrors
  }
}