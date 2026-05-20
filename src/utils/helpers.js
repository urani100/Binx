/**
 * Utility Helper Functions for BiNx React App
 * Purpose: Pure utility functions with no React dependencies
 * Author: ML
 * Date: August 8, 2025
 */

 import { PALETTES } from './constants'

 /**
  * Apply theme colors to CSS variables
  */
 export const applyTheme = (palette) => {
   if (!palette) return
   
   document.documentElement.style.setProperty('--color-background', palette.background)
   document.documentElement.style.setProperty('--color-primary', palette.primary)
   document.documentElement.style.setProperty('--color-text', palette.text)
 }
 
 /**
  * Get current location using browser geolocation
  */
 export const getCurrentLocation = () => {
   return new Promise((resolve) => {
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (position) => resolve({
           lat: position.coords.latitude,
           lng: position.coords.longitude
         }),
         () => resolve({ lat: 48.8566, lng: 2.3522 }) // Paris fallback
       )
     } else {
       resolve({ lat: 48.8566, lng: 2.3522 })
     }
   })
 }
 
 /**
  * Sort pins by timestamp (most recent first)
  */
 export const sortPinsByTimestamp = (pins) => {
   return [...pins].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
 }
 
 /**
  * Format timestamp for display
  */
 export const formatTimestamp = (timestamp) => {
   const date = new Date(timestamp)
   return {
     date: date.toLocaleDateString(),
     time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
   }
 }
 
 /**
  * Get dynamic greeting based on time of day
  */
 export const getGreeting = () => {
   const hour = new Date().getHours()
   if (hour < 12) {
     return "Good morning"
   } else if (hour < 18) {
     return "Good afternoon"
   } else {
     return "Good evening"
   }
 }
 
 export const getCurrentTimeOfDay = () => {
   const hour = new Date().getHours()
   if (hour >= 5  && hour < 12) return 'morning'
   if (hour >= 12 && hour < 17) return 'afternoon'
   if (hour >= 17 && hour < 21) return 'evening'
   return 'night'
 }

 /**
  * Get user initial for avatar
  */
 export const getInitial = (user) => {
   if (!user?.name || user.name.trim() === '') {
     return 'U'
   }
   return user.name.trim().charAt(0).toUpperCase()
 }
 
 /**
  * Convert data URL to File object
  */
 export const dataURLtoFile = (dataurl, filename) => {
   const arr = dataurl.split(',')
   const mime = arr[0].match(/:(.*?);/)[1]
   const bstr = atob(arr[1])
   let n = bstr.length
   const u8arr = new Uint8Array(n)
   while (n--) {
     u8arr[n] = bstr.charCodeAt(n)
   }
   return new File([u8arr], filename, { type: mime })
 }
 
 /**
  * Convert audio blob to File
  */
 export const blobToFile = (blob, filename) => {
   return new File([blob], filename, { type: blob.type })
 }
 
 /**
  * Convert file input to File object
  */
 export const fileInputToFile = (input) => {
   return input.files && input.files[0] ? input.files[0] : null
 }
 
 /**
  * Email validation
  */
 export const validateEmail = (email) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   return emailRegex.test(email)
 }
 
 /**
  * Password validation
  */
 export const validatePassword = (password) => {
   return password && password.length >= 6
 }
 
 /**
  * Required field validation
  */
 export const validateRequired = (value) => {
   return value && value.trim().length > 0
 }
 
 /**
  * File size validation
  */
 export const validateFileSize = (file, maxSize = 10 * 1024 * 1024) => {
   return file && file.size <= maxSize
 }
 
 /**
  * Image type validation
  */
 export const validateImageType = (file) => {
   const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
   return file && supportedTypes.includes(file.type)
 }
 
 /**
  * Audio type validation
  */
 export const validateAudioType = (file) => {
   const supportedTypes = ['audio/wav', 'audio/mp4', 'audio/webm', 'audio/mpeg']
   return file && supportedTypes.includes(file.type)
 }