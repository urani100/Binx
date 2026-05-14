/**
 * Authentication Store for BiNx React App
 * Purpose: Manage authentication state with Firebase integration
 * Author: ML
 * Date: August 8, 2025
 */

 import { create } from 'zustand'
 import { persist } from 'zustand/middleware'
 // FIX: Import from main firebase services, not individual packages
 import { 
   signInWithEmailAndPassword, 
   createUserWithEmailAndPassword, 
   updateProfile,
   signOut,
   onAuthStateChanged
 } from 'firebase/auth'
 import { doc, getDoc, setDoc } from 'firebase/firestore'
 import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
 
 // Import Firebase services from our existing firebase.js file
 import { auth, db, storage } from '../services/firebase'
 import { DEMO_USER } from '../utils/constants'
 import { handleFirebaseError, withErrorHandling } from '../services/errorInterceptor'
 
 /**
  * Authentication Store
  * Manages user authentication state and profile data
  */
 export const useAuthStore = create(
   persist(
     (set, get) => ({
       // State
       user: null,
       loading: false,
       error: null,
       isInitialized: false,
 
       // Actions
       
       /**
        * Initialize authentication listener
        * Sets up Firebase auth state listener
        */
       initialize: () => {
         if (get().isInitialized) return
 
         const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
           set({ loading: true })
 
           try {
             if (firebaseUser) {
               // Fetch user profile from Firestore
               let userProfile = {}
try {
  const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
  if (profileDoc.exists()) {
    const rawData = profileDoc.data()
    console.log('🔍 Raw Firebase document:', rawData)
    
    userProfile = rawData.profile || {}
    console.log('🔍 Profile data from Firebase:', userProfile)
    console.log('🔍 Enhanced preferences specifically:', {
      cuisinePreferences: userProfile.cuisinePreferences,
      activityTypes: userProfile.activityTypes,
      enhancedOnboardingCompleted: userProfile.enhancedOnboardingCompleted
    })
  } else {
    console.log('🔍 No profile document found in Firebase')
  }
} catch (error) {
  console.warn('Failed to load user profile:', error)
}
              
 
               // Construct user object
               const userData = {
                 id: firebaseUser.uid,
                 email: firebaseUser.email,
                 name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                 profilePic: firebaseUser.photoURL || null,
                 profile: {
                  alterEgo: userProfile.alterEgo || '',
                  currentResidence: userProfile.currentResidence || '',
                  occupation: userProfile.occupation || '',
                  currentlyReading: userProfile.currentlyReading || '',
                  lastMovieWatched: userProfile.lastMovieWatched || '',
                  nextMovie: userProfile.nextMovie || '',
                  currentlyWearing: userProfile.currentlyWearing || '',
                  favoriteBrand: userProfile.favoriteBrand || '',
                  favoriteAuthors: userProfile.favoriteAuthors || '',
                  favoriteVibe: userProfile.favoriteVibe || '',
                  idealSunday: userProfile.idealSunday || '',
                  onboardingCompleted: userProfile.onboardingCompleted || false,
                  
                  // Enhanced AI recommendation preferences
                  cuisinePreferences: userProfile.cuisinePreferences || [],
                  activityTypes: userProfile.activityTypes || [],
                  priceComfort: userProfile.priceComfort || 'mid-range',
                  discoveryStyle: userProfile.discoveryStyle || 'hidden-gems',
                  socialPreference: userProfile.socialPreference || 'intimate-pairs',
                  aestheticPreferences: userProfile.aestheticPreferences || [],
                  avoidancePreferences: userProfile.avoidancePreferences || [],
                  enhancedOnboardingCompleted: userProfile.enhancedOnboardingCompleted || false
                }
               }
                  
               // ADD THIS TEMPORARY DEBUG LOG
               console.log('🔍 Final user object:', userData.profile)
 
               set({ user: userData, error: null })
             } else {
               set({ user: null, error: null })
             }
           } catch (error) {
             console.error('Auth state change error:', error)
             set({ error: handleFirebaseError(error) })
           } finally {
             set({ loading: false, isInitialized: true })
           }
         })
 
         // Store unsubscribe function
         set({ unsubscribe })
       },
 
       /**
        * Login user
        * Supports both Firebase users and demo user
        */
       login: withErrorHandling(async (email, password) => {
         set({ loading: true, error: null })
 
         try {
           // Demo user login
           if (email === DEMO_USER.email) {
             set({ user: DEMO_USER, loading: false })
             return { success: true }
           }
 
           // Firebase login
           await signInWithEmailAndPassword(auth, email, password)
           // User state will be set by onAuthStateChanged listener
           set({ loading: false })
           return { success: true }
 
         } catch (error) {
           const errorMessage = handleFirebaseError(error)
           set({ error: errorMessage, loading: false })
           return { success: false, error: errorMessage }
         }
       }, 'Authentication'),
 
       /**
        * Register new user
        */
       register: withErrorHandling(async (email, password, name) => {
         set({ loading: true, error: null })
 
         try {
           const userCredential = await createUserWithEmailAndPassword(auth, email, password)
           await updateProfile(userCredential.user, { displayName: name })
           
           // User state will be set by onAuthStateChanged listener
           set({ loading: false })
           return { success: true }
 
         } catch (error) {
           const errorMessage = handleFirebaseError(error)
           set({ error: errorMessage, loading: false })
           return { success: false, error: errorMessage }
         }
       }, 'Registration'),
 
       /**
        * Logout user
        */
       logout: withErrorHandling(async () => {
         const { user } = get()
         
         if (user?.id === DEMO_USER.id) {
           // Demo user logout
           set({ user: null, error: null })
         } else {
           // Firebase logout
           await signOut(auth)
           // User state will be cleared by onAuthStateChanged listener
         }
       }, 'Logout'),
 
       /**
        * Update user profile
        */
       updateProfile: withErrorHandling(async (profileData) => {
         const { user } = get()
         if (!user) throw new Error('No user logged in')
 
         set({ loading: true, error: null })
 
         try {
           if (user.id === DEMO_USER.id) {
             // Demo user profile update
             const updatedUser = {
               ...user,
               profile: { ...user.profile, ...profileData }
             }
             set({ user: updatedUser, loading: false })
           } else {
             // Firebase profile update
             const profileRef = doc(db, 'users', user.id)
             await setDoc(profileRef, { profile: profileData }, { merge: true })
 
             // Update local state
             const updatedUser = {
               ...user,
               profile: { ...user.profile, ...profileData }
             }
             set({ user: updatedUser, loading: false })
           }
 
           return { success: true }
 
         } catch (error) {
           const errorMessage = handleFirebaseError(error)
           set({ error: errorMessage, loading: false })
           return { success: false, error: errorMessage }
         }
       }, 'Profile Update'),
 
       /**
        * Update profile picture
        */
       updateProfilePicture: withErrorHandling(async (file) => {
         const { user } = get()
         if (!user || !file) throw new Error('No user or file provided')
 
         set({ loading: true, error: null })
 
         try {
           if (user.id === DEMO_USER.id) {
             // Demo user - convert to data URL
             return new Promise((resolve) => {
               const reader = new FileReader()
               reader.onload = (e) => {
                 const updatedUser = { ...user, profilePic: e.target.result }
                 set({ user: updatedUser, loading: false })
                 resolve({ success: true })
               }
               reader.readAsDataURL(file)
             })
           } else {
             // Firebase user - upload to storage
             const uploadPath = `users/${user.id}/profile-picture.jpg`
             const storageRef = ref(storage, uploadPath)
             
             const snapshot = await uploadBytes(storageRef, file)
             const downloadURL = await getDownloadURL(snapshot.ref)
 
             // Update Firebase Auth profile
             await updateProfile(auth.currentUser, { photoURL: downloadURL })
 
             // Update local state
             const updatedUser = { ...user, profilePic: downloadURL }
             set({ user: updatedUser, loading: false })
 
             return { success: true }
           }
 
         } catch (error) {
           const errorMessage = handleFirebaseError(error)
           set({ error: errorMessage, loading: false })
           return { success: false, error: errorMessage }
         }
       }, 'Profile Picture Update'),
 
       /**
        * Remove profile picture
        */
       removeProfilePicture: withErrorHandling(async () => {
         const { user } = get()
         if (!user) throw new Error('No user logged in')
 
         set({ loading: true, error: null })
 
         try {
           if (user.id === DEMO_USER.id) {
             // Demo user
             const updatedUser = { ...user, profilePic: null }
             set({ user: updatedUser, loading: false })
           } else {
             // Firebase user
             await updateProfile(auth.currentUser, { photoURL: null })
 
             // Delete from storage (background operation)
             const uploadPath = `users/${user.id}/profile-picture.jpg`
             try {
               await deleteObject(ref(storage, uploadPath))
             } catch (error) {
               console.warn('Profile picture file not found in storage:', error)
             }
 
             // Update local state
             const updatedUser = { ...user, profilePic: null }
             set({ user: updatedUser, loading: false })
           }
 
           return { success: true }
 
         } catch (error) {
           const errorMessage = handleFirebaseError(error)
           set({ error: errorMessage, loading: false })
           return { success: false, error: errorMessage }
         }
       }, 'Profile Picture Removal'),
 
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
         }
       }
     }),
     {
       name: 'binx-auth',
       partialize: (state) => ({
         // Only persist non-sensitive data
         user: state.user?.id === DEMO_USER.id ? state.user : null
       })
     }
   )
 )