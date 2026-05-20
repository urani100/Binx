import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { DEMO_USER, DEMO_PINS, MOODS, API_ENDPOINTS } from '../utils/constants'
import { sortPinsByTimestamp, dataURLtoFile, blobToFile, getCurrentTimeOfDay } from '../utils/helpers'
import { handleSupabaseError } from '../services/errorInterceptor'
import { edgeFunctionHeaders } from '../services/supabase'

const uploadFileToBucket = async (file, bucket, path) => {
  if (!file) return null

  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  } catch (error) {
    console.error('File upload failed:', error)
    if (error.message?.includes('not authorized') || error.statusCode === 403) {
      throw new Error('Storage access denied. Please sign in again.')
    }
    throw error
  }
}

const mapPin = (pin) => ({
  ...pin,
  culturalContext: pin.cultural_context,
  audioUrl: pin.audio_url,
  timestamp: pin.timestamp ? new Date(pin.timestamp) : new Date()
})

export const usePinsStore = create((set, get) => ({
  pins: [],
  loading: false,
  error: null,
  channel: null,
  currentUserId: null,

  initializePins: async (userId) => {
    const { channel: currentChannel, currentUserId } = get()

    if (currentChannel && currentUserId !== userId) {
      supabase.removeChannel(currentChannel)
    }

    if (currentUserId === userId) return

    set({ loading: true, currentUserId: userId, error: null })

    if (userId === DEMO_USER.id) {
      set({ pins: sortPinsByTimestamp(DEMO_PINS), loading: false, channel: null })
      return
    }

    if (!userId) {
      set({ pins: [], loading: false, channel: null, currentUserId: null })
      return
    }

    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })

      if (error) throw error

      set({ pins: (data || []).map(mapPin), loading: false })

      const channel = supabase
        .channel(`pins:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'pins',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          const { pins: current } = get()
          set({ pins: sortPinsByTimestamp([...current, mapPin(payload.new)]) })
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'pins',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          const { pins: current } = get()
          set({ pins: current.filter(p => p.id !== payload.old.id) })
        })
        .subscribe()

      set({ channel })

    } catch (error) {
      const errorMessage = handleSupabaseError(error)
      set({ error: errorMessage, loading: false })
    }
  },

  addPin: async (newPin) => {
    const { currentUserId } = get()
    if (!currentUserId) throw new Error('No user logged in')

    set({ loading: true, error: null })

    try {
      if (currentUserId === DEMO_USER.id) {
        const pin = {
          ...newPin,
          id: Date.now().toString(),
          userId: currentUserId,
          timestamp: new Date(),
          culturalContext: newPin.culturalContext || 'Personal discovery'
        }
        const { pins } = get()
        set({ pins: sortPinsByTimestamp([...pins, pin]), loading: false })
        return { success: true }
      }

      const pinId = crypto.randomUUID()
      let uploadedPhotoUrl = null
      let uploadedAudioUrl = null

      if (newPin.photo && typeof newPin.photo === 'string' && newPin.photo.startsWith('data:')) {
        const photoFile = dataURLtoFile(newPin.photo, `photo-${pinId}.jpg`)
        uploadedPhotoUrl = await uploadFileToBucket(photoFile, 'pin-assets', `${currentUserId}/${pinId}/photo.jpg`)
      } else if (newPin.photo) {
        uploadedPhotoUrl = newPin.photo
      }

      if (newPin.audioBlob) {
        let extension = 'm4a'
        if (newPin.audioBlob.type.includes('webm')) extension = 'webm'
        else if (newPin.audioBlob.type.includes('wav')) extension = 'wav'

        const audioFile = blobToFile(newPin.audioBlob, `audio-${pinId}.${extension}`)
        uploadedAudioUrl = await uploadFileToBucket(audioFile, 'pin-assets', `${currentUserId}/${pinId}/audio.${extension}`)
      }

      const moodEntry = MOODS.find(m => m.name === newPin.mood) ?? null

      const pinData = {
        id: pinId,
        user_id: currentUserId,
        title: newPin.title,
        note: newPin.note,
        mood: newPin.mood,
        location: newPin.location,
        cultural_context: newPin.culturalContext || 'Personal discovery',
        photo: uploadedPhotoUrl,
        audio_url: uploadedAudioUrl,
        timestamp: new Date().toISOString(),
        vibe_title:         moodEntry?.name ?? null,
        mood_cluster:       moodEntry ? moodEntry.cat.charAt(0).toUpperCase() + moodEntry.cat.slice(1) : null,
        sub_mood:           moodEntry?.sub ?? null,
        energy_description: moodEntry?.desc ?? null,
        source:             'personal',
      }

      const { error } = await supabase.from('pins').insert(pinData)
      if (error) throw error

      // Fire-and-forget — does not affect pin creation success
      const pinLat = newPin.location?.lat ?? null
      const pinLng = newPin.location?.lng ?? null
      if (pinLat != null && pinLng != null) {
        fetch(API_ENDPOINTS.CHECK_REC_PROXIMITY, {
          method: 'POST',
          headers: edgeFunctionHeaders,
          body: JSON.stringify({
            user_id: currentUserId,
            pin_lat: pinLat,
            pin_lng: pinLng,
            time_of_day: getCurrentTimeOfDay(),
            weather_condition: null
          })
        }).catch(console.error)
      }

      set({ loading: false })
      return { success: true }

    } catch (error) {
      const errorMessage = handleSupabaseError(error)
      set({ error: errorMessage, loading: false })
      return { success: false, error: errorMessage }
    }
  },

  deletePin: async (pinId) => {
    const { currentUserId, pins } = get()
    if (!currentUserId) throw new Error('No user logged in')

    set({ loading: true, error: null })

    try {
      if (currentUserId === DEMO_USER.id) {
        set({ pins: pins.filter(p => p.id !== pinId), loading: false })
        return { success: true }
      }

      const pin = pins.find(p => p.id === pinId)

      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId)
        .eq('user_id', currentUserId)
      if (error) throw error

      if (pin) {
        const basePath = `${currentUserId}/${pinId}`
        const filesToDelete = []
        if (pin.photo) filesToDelete.push(`${basePath}/photo.jpg`)
        if (pin.audioUrl) {
          filesToDelete.push(
            `${basePath}/audio.m4a`,
            `${basePath}/audio.webm`,
            `${basePath}/audio.wav`
          )
        }
        if (filesToDelete.length) {
          supabase.storage.from('pin-assets').remove(filesToDelete).catch(console.warn)
        }
      }

      set({ pins: get().pins.filter(p => p.id !== pinId), loading: false })
      return { success: true }

    } catch (error) {
      const errorMessage = handleSupabaseError(error)
      set({ error: errorMessage, loading: false })
      return { success: false, error: errorMessage }
    }
  },

  getPinById: (pinId) => get().pins.find(pin => pin.id === pinId),

  getPinsByMood: (mood) => get().pins.filter(pin => pin.mood === mood),

  searchPins: (searchTerm) => {
    const { pins } = get()
    if (!searchTerm) return pins
    const term = searchTerm.toLowerCase()
    return pins.filter(pin =>
      pin.title?.toLowerCase().includes(term) ||
      pin.note?.toLowerCase().includes(term) ||
      pin.location?.name?.toLowerCase().includes(term) ||
      pin.culturalContext?.toLowerCase().includes(term)
    )
  },

  getPinsCount: () => get().pins.length,

  clearError: () => set({ error: null }),

  cleanup: () => {
    const { channel } = get()
    if (channel) supabase.removeChannel(channel)
    set({ pins: [], currentUserId: null, loading: false, error: null, channel: null })
  }
}))
