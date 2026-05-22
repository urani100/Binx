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
      profileLoaded: false,
      isPasswordRecovery: false,

      initialize: () => {
        if (get().isInitialized) return

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            set({ isPasswordRecovery: true })
            return
          }

          // Synchronous — never await REST calls inside this listener.
          // Doing so causes a deadlock: the SDK queues REST calls until auth
          // state settles, but auth state can't settle until the callback
          // finishes, which is waiting for the REST call.
          if (session?.user) {
            const supabaseUser = session.user
            const existingUser = get().user
            // Reuse already-loaded profile on token refresh (same user)
            const existingProfile = existingUser?.id === supabaseUser.id
              ? existingUser.profile
              : null

            const userData = {
              id: supabaseUser.id,
              email: supabaseUser.email,
              name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
              profilePic: supabaseUser.user_metadata?.avatar_url || existingProfile?.profilePic || null,
              affinity_weights:   null,
              atmosphere_signals: null,
              signal_count:       0,
              is_cold_start:      true,
              profile: existingProfile || {
                alterEgo: '',
                currentResidence: '',
                occupation: '',
                currentlyReading: '',
                lastMovieWatched: '',
                nextMovie: '',
                currentlyWearing: '',
                favoriteBrand: '',
                favoriteAuthors: '',
                favoriteVibe: '',
                idealSunday: '',
                onboardingCompleted: false,
                cuisinePreferences: [],
                activityTypes: [],
                priceComfort: null,
                discoveryStyle: null,
                socialPreference: null,
                aestheticPreferences: [],
                avoidancePreferences: [],
                enhancedOnboardingCompleted: false,
                savedLocations: []
              }
            }

            set({ user: userData, error: null, loading: false, isInitialized: true })
            // Fetch saved profile from DB outside the listener — safe from deadlock
            get().loadUserProfile(supabaseUser.id)
          } else {
            usePinsStore.getState().cleanup()
            useUIStore.getState().navigateToAuth()
            set({ user: null, error: null, loading: false, isInitialized: true, profileLoaded: false })
          }
        })

        set({ unsubscribe: () => subscription.unsubscribe() })
      },

      loadUserProfile: async (userId) => {
        try {
          const { data } = await supabase
            .from('users')
            .select('profile, affinity_weights, atmosphere_signals, signal_count, is_cold_start')
            .eq('id', userId)
            .single()

          const { user } = get()
          if (user?.id === userId) {
            const saved = data?.profile || {}
            set({
              user: {
                ...user,
                profilePic: user.profilePic || saved.profilePic || null,
                affinity_weights:   data?.affinity_weights ?? null,
                atmosphere_signals: data?.atmosphere_signals ?? null,
                signal_count:       data?.signal_count ?? 0,
                is_cold_start:      data?.is_cold_start ?? true,
                profile: {
                  alterEgo:                    saved.alterEgo ?? '',
                  currentResidence:            saved.currentResidence ?? '',
                  occupation:                  saved.occupation ?? '',
                  currentlyReading:            saved.currentlyReading ?? '',
                  lastMovieWatched:            saved.lastMovieWatched ?? '',
                  nextMovie:                   saved.nextMovie ?? '',
                  currentlyWearing:            saved.currentlyWearing ?? '',
                  favoriteBrand:               saved.favoriteBrand ?? '',
                  favoriteAuthors:             saved.favoriteAuthors ?? '',
                  favoriteVibe:                saved.favoriteVibe ?? '',
                  idealSunday:                 saved.idealSunday ?? '',
                  onboardingCompleted:         saved.onboardingCompleted ?? false,
                  cuisinePreferences:          saved.cuisinePreferences ?? [],
                  activityTypes:               saved.activityTypes ?? [],
                  priceComfort:                saved.priceComfort ?? null,
                  discoveryStyle:              saved.discoveryStyle ?? null,
                  socialPreference:            saved.socialPreference ?? null,
                  aestheticPreferences:        saved.aestheticPreferences ?? [],
                  avoidancePreferences:        saved.avoidancePreferences ?? [],
                  enhancedOnboardingCompleted: saved.enhancedOnboardingCompleted ?? false,
                  savedLocations:              saved.savedLocations ?? [],
                  dismissedPlaces:             saved.dismissedPlaces ?? []
                }
              },
              profileLoaded: true
            })
          }
        } catch (err) {
          console.warn('Failed to load user profile:', err)
          set({ profileLoaded: true })
        }
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

      loginWithGoogle: withErrorHandling(async () => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
          })
          if (error) throw error
        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Google Login'),

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

      resetPassword: withErrorHandling(async (email) => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
          })
          if (error) throw error
          set({ loading: false })
          return { success: true }
        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Password Reset'),

      updatePassword: withErrorHandling(async (newPassword) => {
        set({ loading: true, error: null })
        try {
          const { error } = await supabase.auth.updateUser({ password: newPassword })
          if (error) throw error
          set({ loading: false, isPasswordRecovery: false })
          return { success: true }
        } catch (error) {
          const errorMessage = handleSupabaseError(error)
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      }, 'Password Update'),

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
