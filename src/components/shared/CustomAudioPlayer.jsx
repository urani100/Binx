/**
 * Custom Audio Player Component for BiNx React App
 * Purpose: Audio playback with custom controls and styling
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useRef, useState, useEffect } from 'react'
 import PropTypes from 'prop-types'
 
 /**
  * CustomAudioPlayer Component
  * Provides custom-styled audio controls with progress and volume
  */
 const CustomAudioPlayer = ({ src, className = '' }) => {
   const audioRef = useRef(null)
   const progressBarRef = useRef(null)
   const volumeSliderRef = useRef(null)
 
   const [isPlaying, setIsPlaying] = useState(false)
   const [currentTime, setCurrentTime] = useState('0:00')
   const [duration, setDuration] = useState('0:00')
   const [isLoaded, setIsLoaded] = useState(false)
 
   /**
    * Format time helper
    */
   const formatTime = (seconds) => {
     if (isNaN(seconds) || !isFinite(seconds)) return '0:00'
     const mins = Math.floor(seconds / 60)
     const secs = Math.floor(seconds % 60)
     return `${mins}:${secs.toString().padStart(2, '0')}`
   }
 
   /**
    * Setup audio event listeners
    */
   useEffect(() => {
     const audio = audioRef.current
     if (!audio) return
 
     const handleTimeUpdate = () => {
       const progress = (audio.currentTime / audio.duration) * 100
       if (progressBarRef.current) {
         progressBarRef.current.style.width = progress + '%'
       }
       setCurrentTime(formatTime(audio.currentTime))
     }
 
     const handleLoadedMetadata = () => {
       if (!isNaN(audio.duration) && isFinite(audio.duration)) {
         setDuration(formatTime(audio.duration))
         setIsLoaded(true)
       } else {
         setDuration('0:00')
       }
     }
 
     const handleEnded = () => {
       setIsPlaying(false)
       if (progressBarRef.current) {
         progressBarRef.current.style.width = '0%'
       }
       setCurrentTime('0:00')
     }
 
     const handleCanPlay = () => {
       setIsLoaded(true)
     }
 
     const handleError = (e) => {
       console.error('Audio playback error:', e)
       setIsLoaded(false)
       setIsPlaying(false)
     }
 
     // Add event listeners
     audio.addEventListener('timeupdate', handleTimeUpdate)
     audio.addEventListener('loadedmetadata', handleLoadedMetadata)
     audio.addEventListener('ended', handleEnded)
     audio.addEventListener('canplay', handleCanPlay)
     audio.addEventListener('error', handleError)
 
     // Initialize volume
     audio.volume = 1
     if (volumeSliderRef.current) {
       volumeSliderRef.current.value = 100
     }
 
     // Set initial duration if available
     if (audio.readyState >= 1 && !isNaN(audio.duration) && isFinite(audio.duration)) {
       setDuration(formatTime(audio.duration))
       setIsLoaded(true)
     }
 
     return () => {
       audio.removeEventListener('timeupdate', handleTimeUpdate)
       audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
       audio.removeEventListener('ended', handleEnded)
       audio.removeEventListener('canplay', handleCanPlay)
       audio.removeEventListener('error', handleError)
     }
   }, [src])
 
   /**
    * Toggle play/pause
    */
   const togglePlayPause = async () => {
     const audio = audioRef.current
     if (!audio || !isLoaded) return
 
     try {
       if (audio.paused) {
         await audio.play()
         setIsPlaying(true)
       } else {
         audio.pause()
         setIsPlaying(false)
       }
     } catch (error) {
       console.error('Audio play error:', error)
       setIsPlaying(false)
     }
   }
 
   /**
    * Handle progress bar click
    */
   const handleProgressBarClick = (e) => {
     const audio = audioRef.current
     const progressContainer = progressBarRef.current?.parentElement
     if (!audio.duration || !progressContainer || !isLoaded) return
 
     const rect = progressContainer.getBoundingClientRect()
     const percent = (e.clientX - rect.left) / rect.width
     const newTime = percent * audio.duration
     
     if (newTime >= 0 && newTime <= audio.duration) {
       audio.currentTime = newTime
     }
   }
 
   /**
    * Handle volume change
    */
   const handleVolumeChange = (e) => {
     const audio = audioRef.current
     if (!audio) return
     
     const volume = e.target.value / 100
     audio.volume = Math.max(0, Math.min(1, volume))
   }
 
   /**
    * Handle keyboard controls
    */
   const handleKeyDown = (e) => {
     if (e.key === ' ' || e.key === 'Enter') {
       e.preventDefault()
       togglePlayPause()
     }
   }
 
   if (!src) {
     return (
       <div className={`w-full max-w-lg mx-auto ${className}`}>
         <div className="custom-audio-player rounded-xl p-2 flex items-center gap-2 border border-gray-300">
           <div className="text-sm text-gray-500">No audio available</div>
         </div>
       </div>
     )
   }

   // Add demo audio handling right after the !src check:  FOR DEMO ONLY... REMOVE BEFORE GOING LIVE
if (src === 'demo-audio') {
  return (
    <div className={`w-full max-w-lg mx-auto ${className}`}>
      <div 
        className="custom-audio-player rounded-xl p-2 flex items-center gap-2 border"
        style={{ borderColor: 'var(--color-primary)' }}
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm bg-gray-400">
          ▶
        </div>
        <div className="flex-1 text-sm text-gray-600 bg-gray-100 rounded p-2">
          🎵 Demo audio - real audio would play here
        </div>
        <div className="text-xs text-gray-500 min-w-[65px] text-center">
          0:00 / 1:23
        </div>
      </div>
    </div>
  )
}
 
   return (
     <div className={`w-full max-w-lg mx-auto ${className}`}>
       <audio 
         ref={audioRef} 
         src={src} 
         preload="metadata"
         className="hidden"
       />
 
       <div 
         className="custom-audio-player rounded-xl p-2 flex items-center gap-2 border"
         style={{ borderColor: 'var(--color-primary)' }}
       >
         {/* Play/Pause Button */}
         <button
           onClick={togglePlayPause}
           onKeyDown={handleKeyDown}
           disabled={!isLoaded}
           className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1"
           style={{ backgroundColor: 'var(--color-background)' }}
           aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
           title={isPlaying ? 'Pause' : 'Play'}
         >
           {isPlaying ? '⏸' : '▶'}
         </button>
 
         {/* Progress Bar */}
         <div
           className="progress-container flex-1 h-1.5 rounded-sm cursor-pointer relative"
           style={{ backgroundColor: 'var(--color-background)' }}
           onClick={handleProgressBarClick}
           role="slider"
           aria-label="Audio progress"
           tabIndex={isLoaded ? 0 : -1}
           onKeyDown={(e) => {
             if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
               e.preventDefault()
               const audio = audioRef.current
               if (audio && isLoaded) {
                 const step = e.key === 'ArrowRight' ? 5 : -5
                 audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + step))
               }
             }
           }}
         >
           <div
             ref={progressBarRef}
             className="progress-bar h-full rounded-sm transition-all duration-100"
             style={{ backgroundColor: 'var(--color-primary)', width: '0%' }}
           />
         </div>
 
         {/* Time Display */}
         <div 
           className="time-display text-xs font-bold min-w-[65px] text-center flex-shrink-0"
           style={{ color: 'var(--color-text)' }}
           aria-live="polite"
         >
           {currentTime} / {duration}
         </div>
 
         {/* Volume Control */}
         <div className="volume-container flex items-center gap-2 flex-shrink-0 self-center">
           <input
             type="range"
             ref={volumeSliderRef}
             className="volume-slider w-20 h-1 rounded-sm outline-none cursor-pointer self-center"
             min="0"
             max="200"
             defaultValue="50"
             onInput={handleVolumeChange}
             aria-label="Volume control"
            //  title="Adjust volume"
           />
         </div>
       </div>
     </div>
   )
 }
 
 CustomAudioPlayer.propTypes = {
   src: PropTypes.string,
   className: PropTypes.string
 }
 
 export default CustomAudioPlayer