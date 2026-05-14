import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../services/supabase'
import { DEMO_USER } from '../utils/constants'
import { handleSupabaseError, withErrorHandling } from '../services/errorInterceptor'
import { usePinsStore } from './pinsStore'
import { useUIStore } from './uiStore'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      error: null,
      isInitialized: false,

      initialize: () => {
        if (get().isInitialized) return

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          set({ loading: true })

          try {
            if (session?.user) {
              const supabaseUser = session.user

              let userProfile = {}
              try {
                const { data } = await supabase
                  .from('users')
                  .select('profile')
                  .eq('id', supabaseUser.id)
                  .single()
                if (data) userProfile = data.profile || {}
              } catch (err) {
                console.warn('Failed to load user profile:', err)
              }

              const userData = {
                id: supabaseUser.id,
                email: supabaseUser.email,
                name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
                profilePic: supabaseUser.user_metadata?.avatar_url || userProfile.profilePic || null,
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

              set({ user: userData, error: null })
            } else {
              usePinsStore.getState().cleanup()
              useUIStore.getState().navigateToAuth()
              set({ user: null, error: null })
            }
          } catch (error) {
            console.error('Auth state change error:', error)
            set({ error: handleSupabaseError(error) })
          } finally {
            set({ loading: false, isInitialized: true })
          }
        })

        set({ unsubscribe: () => subscription.unsubscribe() })
      },

      login: withErrorHandling(async (email, password) => {
        set({ loading: true, error: null })

        try {
          if (email === DEMO_USER.email) {
            set({ user: DEMO_USER, loading: false })
            return { success: true }
          }

          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error

          set({ loading: false })
          return { success: true }

        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Authentication'),

      register: withErrorHandling(async (email, password, name) => {
        set({ loading: true, error: null })

        try {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } }
          })
          if (error) throw error

          set({ loading: false })
          return { success: true }

        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Registration'),

      logout: withErrorHandling(async () => {
        const { user } = get()

        if (user?.id === DEMO_USER.id) {
          usePinsStore.getState().cleanup()
          useUIStore.getState().navigateToAuth()
          set({ user: null, error: null })
        } else {
          const { error } = await supabase.auth.signOut()
          if (error) throw error
        }
      }, 'Logout'),

      updateProfile: withErrorHandling(async (profileData) => {
        const { user } = get()
        if (!user) throw new Error('No user logged in')

        set({ loading: true, error: null })

        try {
          if (user.id === DEMO_USER.id) {
            set({ user: { ...user, profile: { ...user.profile, ...profileData } }, loading: false })
          } else {
            const mergedProfile = { ...user.profile, ...profileData }
            const { error } = await supabase
              .from('users')
              .upsert({ id: user.id, profile: mergedProfile })
            if (error) throw error

            set({ user: { ...user, profile: mergedProfile }, loading: false })
          }

          return { success: true }

        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Profile Update'),

      updateProfilePicture: withErrorHandling(async (file) => {
        const { user } = get()
        if (!user || !file) throw new Error('No user or file provided')

        set({ loading: true, error: null })

        try {
          if (user.id === DEMO_USER.id) {
            return new Promise((resolve) => {
              const reader = new FileReader()
              reader.onload = (e) => {
                set({ user: { ...user, profilePic: e.target.result }, loading: false })
                resolve({ success: true })
              }
              reader.readAsDataURL(file)
            })
          }

          const path = `${user.id}/profile-picture.jpg`
          const { error: uploadError } = await supabase.storage
            .from('user-assets')
            .upload(path, file, { upsert: true })
          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('user-assets')
            .getPublicUrl(path)

          await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
          set({ user: { ...user, profilePic: publicUrl }, loading: false })

          return { success: true }

        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Profile Picture Update'),

      removeProfilePicture: withErrorHandling(async () => {
        const { user } = get()
        if (!user) throw new Error('No user logged in')

        set({ loading: true, error: null })

        try {
          if (user.id === DEMO_USER.id) {
            set({ user: { ...user, profilePic: null }, loading: false })
          } else {
            const path = `${user.id}/profile-picture.jpg`
            await supabase.storage.from('user-assets').remove([path])
            await supabase.auth.updateUser({ data: { avatar_url: null } })
            set({ user: { ...user, profilePic: null }, loading: false })
          }

          return { success: true }

        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Profile Picture Removal'),

      clearError: () => set({ error: null }),

      cleanup: () => {
        const { unsubscribe } = get()
        if (unsubscribe) unsubscribe()
      }
    }),
    {
      name: 'binx-auth',
      partialize: (state) => ({
        user: state.user?.id === DEMO_USER.id ? state.user : null
      })
    }
  )
)
