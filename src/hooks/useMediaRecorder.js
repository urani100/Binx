/**
 * Media Recorder Hook for BiNx React App
 * Purpose: Provide clean interface to audio recording functionality
 * Author: ML
 * Date: August 8, 2025
 * Last Updated: August 9, 2025 - Fixed audio format/extension mismatch
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

/**
 * Media Recorder Hook
 * Provides clean interface to audio recording with error handling
 */
export const useMediaRecorder = () => {
  // State
  const [mediaRecorder, setMediaRecorder] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isSupported, setIsSupported] = useState(true)

  const MAX_DURATION = 60

  // Refs
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const durationTimerRef = useRef(null)

  // UI store for error messaging
  const showMessage = useUIStore(state => state.showMessageModal)

  // Check browser support on mount
  useEffect(() => {
    const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)
    setIsSupported(supported)

    if (!supported) {
      console.warn('Media recording not supported in this browser')
    }
  }, [])


  /**
   * Start recording with enhanced error handling
   */
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      showMessage('Not Supported', 'Audio recording is not supported in this browser.')
      return { success: false, error: 'Not supported' }
    }

    if (isRecording) {
      return { success: false, error: 'Already recording' }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      })

      streamRef.current = stream

      // Clear previous chunks
      chunksRef.current = []

      // Determine best MIME type
      const mimeTypes = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ]

      let selectedMimeType = ''
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }

      if (!selectedMimeType) {
        selectedMimeType = 'audio/webm' // Fallback
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000
      })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        } else {
          console.error('Received empty audio chunk')
        }
      }

      recorder.onstop = () => {
        if (chunksRef.current.length === 0) {
          console.error('No audio chunks recorded')
          showMessage('Recording Error', 'No audio data was recorded. Please try again.')
          return
        }

        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)

        if (totalSize === 0) {
          console.error('Zero bytes recorded')
          showMessage('Recording Error', 'No audio data captured.')
          return
        }

        const blob = new Blob(chunksRef.current, {
          type: selectedMimeType
        })

        if (blob.size === 0) {
          console.error('Audio blob is empty')
          showMessage('Recording Error', 'Audio blob creation failed.')
          return
        }

        const url = URL.createObjectURL(blob)

        setAudioBlob(blob)
        setAudioUrl(url)

        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        // Clear duration timer
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current)
          durationTimerRef.current = null
        }
      }

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setIsRecording(false)
        setMediaRecorder(null)

        // Cleanup on error
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }

        const errorMessage = event.error?.message || 'Unknown recording error'
        showMessage('Recording Error', `Recording failed: ${errorMessage}`)
      }

      recorder.onstart = () => {
        setIsRecording(true)
        setRecordingDuration(0)

        durationTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => {
            const next = prev + 1
            if (next >= MAX_DURATION) {
              recorder.stop()
              streamRef.current?.getTracks().forEach(track => track.stop())
              clearInterval(durationTimerRef.current)
              durationTimerRef.current = null
            }
            return next
          })
        }, 1000)
      }

      recorder.start(1000) // Collect data every 1 second

      setMediaRecorder(recorder)

      return { success: true }

    } catch (error) {
      console.error('Recording error:', error)

      let errorMessage = 'Microphone access failed: '

      switch (error.name) {
        case 'NotAllowedError':
          errorMessage += 'Permission denied. Please allow microphone access in your browser settings.'
          break
        case 'NotFoundError':
          errorMessage += 'No microphone found. Please check your audio devices.'
          break
        case 'NotSupportedError':
          errorMessage += 'Recording not supported in this browser.'
          break
        case 'OverconstrainedError':
          errorMessage += 'Microphone constraints cannot be satisfied.'
          break
        case 'SecurityError':
          errorMessage += 'Microphone access blocked due to security restrictions.'
          break
        case 'AbortError':
          errorMessage += 'Recording was aborted.'
          break
        default:
          errorMessage += error.message || 'Unknown error occurred.'
      }

      showMessage('Microphone Access Error', errorMessage)
      return { success: false, error: errorMessage }
    }
  }, [isSupported, isRecording, showMessage])


  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()

      // Stop the stream after stopping the recorder
      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }, 100) // Small delay to ensure recording finishes
    }

    setIsRecording(false)
    setMediaRecorder(null)

    return { success: true }
  }, [mediaRecorder])


  /**
   * Clear recorded audio
   */
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    setAudioUrl(null)
    setAudioBlob(null)
    setRecordingDuration(0)

    return { success: true }
  }, [audioUrl])

  /**
   * Cancel recording (stop and clear)
   */
  const cancelRecording = useCallback(() => {
    stopRecording()
    clearRecording()
    return { success: true }
  }, [stopRecording, clearRecording])

  /**
   * Format duration for display
   */
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])


  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current)
      }

      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, []) // NO DEPENDENCIES - only run on unmount

  // Computed values
  const hasRecording = !!audioUrl && !!audioBlob
  const canRecord = isSupported && !isRecording
  const formattedDuration = formatDuration(recordingDuration)

  return {
    // State
    isRecording,
    isSupported,
    audioUrl,
    audioBlob,
    recordingDuration,
    formattedDuration,
    hasRecording,
    canRecord,

    // Actions
    startRecording,
    stopRecording,
    clearRecording,
    cancelRecording,

    // Utilities
    formatDuration
  }
}

export default useMediaRecorder
