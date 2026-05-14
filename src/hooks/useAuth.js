/**
 * Authentication Hook for BiNx React App
 * Purpose: Provide clean interface to authentication store and Supabase Auth
 * Author: ML
 * Date: August 8, 2025
 */

 import { useAuthStore } from '../store/authStore'
 import { useUIStore } from '../store/uiStore'
 import { validateEmail, validatePassword } from '../utils/helpers.js'
 
 /**
  * Authentication Hook
  * Provides clean interface to auth functionality with validation and error handling
  */
 export const useAuth = () => {
   // Store selectors
   const user = useAuthStore(state => state.user)
   const loading = useAuthStore(state => state.loading)
   const error = useAuthStore(state => state.error)
   const isInitialized = useAuthStore(state => state.isInitialized)
 
   // Store actions
   const initialize = useAuthStore(state => state.initialize)
   const login = useAuthStore(state => state.login)
   const register = useAuthStore(state => state.register)
   const logout = useAuthStore(state => state.logout)
   const updateProfile = useAuthStore(state => state.updateProfile)
   const updateProfilePicture = useAuthStore(state => state.updateProfilePicture)
   const removeProfilePicture = useAuthStore(state => state.removeProfilePicture)
   const clearError = useAuthStore(state => state.clearError)
 
   // UI store for messaging
   const showMessage = useUIStore(state => state.showMessageModal)
 
   /**
    * Enhanced login with validation
    */
   const loginWithValidation = async (email, password) => {
     clearError()
 
     // Client-side validation
     if (!validateEmail(email)) {
       showMessage('Invalid Email', 'Please enter a valid email address')
       return { success: false, error: 'Invalid email format' }
     }
 
     if (!validatePassword(password)) {
       showMessage('Invalid Password', 'Password must be at least 6 characters')
       return { success: false, error: 'Password too short' }
     }
 
     const result = await login(email, password)
     
     if (!result.success && result.error) {
       showMessage('Login Failed', result.error)
     }
 
     return result
   }
 
   /**
    * Enhanced registration with validation
    */
   const registerWithValidation = async (email, password, name) => {
     clearError()
 
     // Client-side validation
     if (!name || name.trim().length < 2) {
       showMessage('Invalid Name', 'Name must be at least 2 characters')
       return { success: false, error: 'Name too short' }
     }
 
     if (!validateEmail(email)) {
       showMessage('Invalid Email', 'Please enter a valid email address')
       return { success: false, error: 'Invalid email format' }
     }
 
     if (!validatePassword(password)) {
       showMessage('Invalid Password', 'Password must be at least 6 characters')
       return { success: false, error: 'Password too short' }
     }
 
     const result = await register(email, password, name.trim())
     
     if (!result.success && result.error) {
       showMessage('Registration Failed', result.error)
     }
 
     return result
   }
 
   /**
    * Enhanced profile update with validation
    */
   const updateProfileWithValidation = async (profileData) => {
     clearError()
 
     // Sanitize profile data
     const sanitizedData = {}
     Object.keys(profileData).forEach(key => {
       const value = profileData[key]
       if (typeof value === 'string') {
         sanitizedData[key] = value.trim()
       } else {
         sanitizedData[key] = value
       }
     })
 
     const result = await updateProfile(sanitizedData)
     
     if (result?.success) {
       showMessage('Success', 'Profile updated successfully!')
     } else if (result?.error) {
       showMessage('Update Failed', result.error)
     }
 
     return result
   }
 
   /**
    * Enhanced profile picture update with validation
    */
   const updateProfilePictureWithValidation = async (file) => {
     clearError()
 
     // File validation
     if (!file) {
       showMessage('No File', 'Please select a file')
       return { success: false, error: 'No file selected' }
     }
 
     const maxSize = 10 * 1024 * 1024 // 10MB
     if (file.size > maxSize) {
       showMessage('File Too Large', 'Image must be less than 10MB')
       return { success: false, error: 'File too large' }
     }
 
     const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
     if (!allowedTypes.includes(file.type)) {
       showMessage('Invalid File Type', 'Please select a JPEG, PNG, or WebP image')
       return { success: false, error: 'Invalid file type' }
     }
 
     try {
       const result = await updateProfilePicture(file)
       if (result?.success) {
         showMessage('Success', 'Profile picture updated!')
       }
       return result
     } catch (error) {
       showMessage('Upload Failed', error.message)
       return { success: false, error: error.message }
     }
   }
 
   /**
    * Safe logout with cleanup
    */
   const logoutWithCleanup = async () => {
     try {
       await logout()
     } catch (error) {
       showMessage('Logout Error', 'Failed to logout properly')
       throw error
     }
   }
 
   // Computed values
   const isAuthenticated = !!user && isInitialized
   const isDemo = user?.id === 'demo-user-1'
   const hasCompletedOnboarding = user?.profile?.onboardingCompleted || false
 
   return {
     // State
     user,
     loading,
     error,
     isInitialized,
     isAuthenticated,
     isDemo,
     hasCompletedOnboarding,
 
     // Actions
     initialize,
     login: loginWithValidation,
     register: registerWithValidation,
     logout: logoutWithCleanup,
     updateProfile: updateProfileWithValidation,
     updateProfilePicture: updateProfilePictureWithValidation,
     removeProfilePicture,
     clearError,
 
     // Utilities
     getInitial: (userData = user) => {
       if (!userData?.name || userData.name.trim() === '') {
         return 'U'
       }
       return userData.name.trim().charAt(0).toUpperCase()
     }
   }
 }
 
 export default useAuth