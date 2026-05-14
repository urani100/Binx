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
    console.log('🎤 === RECORDING DIAGNOSTICS START ===')
    console.log('🎤 Browser:', navigator.userAgent)
    console.log('🎤 MediaRecorder supported:', !!window.MediaRecorder)
    console.log('🎤 getUserMedia supported:', !!navigator.mediaDevices?.getUserMedia)

    // Test MIME type support
    const testTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ]

    testTypes.forEach(type => {
      const supported = MediaRecorder.isTypeSupported(type)
      console.log(`🎤 ${type}: ${supported}`)
    })

    if (!isSupported) {
      showMessage('Not Supported', 'Audio recording is not supported in this browser.')
      return { success: false, error: 'Not supported' }
    }

    if (isRecording) {
      console.warn('🎤 Recording already in progress')
      return { success: false, error: 'Already recording' }
    }

    try {
      console.log('🎤 Requesting microphone access...')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      })

      streamRef.current = stream
      console.log('🎤 Stream obtained:', stream)
      console.log('🎤 Audio tracks:', stream.getAudioTracks())
      console.log('🎤 Track settings:', stream.getAudioTracks()[0]?.getSettings())

      // Clear previous chunks
      chunksRef.current = []
      console.log('🎤 Chunks array cleared')

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

      console.log('🎤 Selected MIME type:', selectedMimeType)

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000
      })

      console.log('🎤 MediaRecorder created with state:', recorder.state)

      recorder.ondataavailable = (event) => {
        console.log('🎤 === DATA AVAILABLE EVENT ===')
        console.log('🎤 Event data size:', event.data.size)
        console.log('🎤 Event data type:', event.data.type)
        console.log('🎤 Event timecode:', event.timecode)

        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('🎤 Chunk added. Total chunks:', chunksRef.current.length)
          console.log('🎤 Total size so far:', chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0))
        } else {
          console.error('🎤 ❌ Received EMPTY chunk!')
        }
      }

      recorder.onstop = () => {
        console.log('🎤 === RECORDING STOPPED ===')
        console.log('🎤 Final chunks count:', chunksRef.current.length)
        console.log('🎤 Final chunks sizes:', chunksRef.current.map(chunk => chunk.size))

        if (chunksRef.current.length === 0) {
          console.error('🎤 ❌ NO CHUNKS COLLECTED!')
          showMessage('Recording Error', 'No audio data was recorded. Please try again.')
          return
        }

        const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
        console.log('🎤 Total audio data size:', totalSize)

        if (totalSize === 0) {
          console.error('🎤 ❌ ZERO BYTES COLLECTED!')
          showMessage('Recording Error', 'No audio data captured.')
          return
        }

        const blob = new Blob(chunksRef.current, {
          type: selectedMimeType
        })

        console.log('🎤 Blob created:', {
          size: blob.size,
          type: blob.type,
          selectedMimeType: selectedMimeType
        })

        if (blob.size === 0) {
          console.error('🎤 ❌ BLOB IS EMPTY!')
          showMessage('Recording Error', 'Audio blob creation failed.')
          return
        }

        const url = URL.createObjectURL(blob)
        console.log('🎤 Blob URL created:', url)

        setAudioBlob(blob)
        setAudioUrl(url)

        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop()
            console.log('🎤 Track stopped:', track.label)
          })
          streamRef.current = null
        }

        // Clear duration timer
        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current)
          durationTimerRef.current = null
        }
      }

      recorder.onerror = (event) => {
        console.error('🎤 ❌ MediaRecorder error:', event)
        console.error('🎤 Error details:', event.error)
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

      // Add event listener for when recording actually starts
      recorder.onstart = () => {
        console.log('🎤 === RECORDING ACTUALLY STARTED ===')
        console.log('🎤 MediaRecorder state:', recorder.state)
        setIsRecording(true)
        setRecordingDuration(0)

        // Start duration timer here instead
        durationTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1)
        }, 1000)
      }

      // Start recording with timeslice to ensure data collection
      console.log('🎤 Starting recording with 1-second timeslice...')
      recorder.start(1000) // Collect data every 1 second
      console.log('🎤 recorder.start(1000) called, state:', recorder.state)

      setMediaRecorder(recorder)

      return { success: true }

    } catch (error) {
      console.error('🎤 ❌ Recording error:', error)
      console.error('🎤 Error name:', error.name)
      console.error('🎤 Error message:', error.message)

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
    console.log('🎤 Stop recording requested...')

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      console.log('🎤 MediaRecorder.stop() called')

      // Stop the stream after stopping the recorder
      setTimeout(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop()
            console.log('🎤 Track stopped after recording:', track.label)
          })
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

    console.log('Recording cleared')
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


  // Cleanup on unmount
  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log('🎤 Component unmounting, cleaning up...')

      // Stop recording if in progress
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('Cleanup: Stopping active recording')
        mediaRecorder.stop()
      }

      // Stop stream
      if (streamRef.current) {
        console.log('Cleanup: Stopping media stream')
        streamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log('Track stopped:', track.label)
        })
      }

      // Clear timer
      if (durationTimerRef.current) {
        console.log('Cleanup: Clearing duration timer')
        clearInterval(durationTimerRef.current)
      }

      // Cleanup audio URL
      if (audioUrl && audioUrl.startsWith('blob:')) {
        console.log('Cleanup: Revoking blob URL:', audioUrl)
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