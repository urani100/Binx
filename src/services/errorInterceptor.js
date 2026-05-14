/**
 * Error Interceptor Service for BiNx React App
 * Purpose: Centralized error handling and logging for API calls and Firebase operations
 * Author: ML
 * Date: August 8, 2025
 */

 import { ERROR_MESSAGES } from '../utils/constants'

 /**
  * Supabase Error Handler
  * Translates Supabase error messages to user-friendly messages
  */
 export const handleSupabaseError = (error) => {
   console.error('Supabase Error:', error)

   const message = error?.message || ''

   if (message.includes('Invalid login credentials')) return ERROR_MESSAGES.AUTH.WRONG_PASSWORD
   if (message.includes('Email not confirmed')) return 'Please verify your email before logging in.'
   if (message.includes('User already registered')) return ERROR_MESSAGES.AUTH.EMAIL_IN_USE
   if (message.includes('Password should be at least')) return ERROR_MESSAGES.AUTH.WEAK_PASSWORD
   if (message.includes('Unable to validate email') || message.includes('invalid email')) return ERROR_MESSAGES.AUTH.INVALID_EMAIL
   if (message.includes('Too many requests')) return 'Too many failed attempts. Please try again later.'
   if (message.includes('not authorized') || error?.statusCode === 403) return 'Permission denied. Please check your authentication.'
   if (message.includes('timed out') || message.includes('deadline')) return 'Request timed out. Please try again.'
   if (message.includes('network') || message.includes('fetch')) return ERROR_MESSAGES.GENERAL.NETWORK_ERROR

   return message || ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
 }

 /**
  * API Error Handler
  * Handles errors from external API calls (Weather, Geocoding)
  */
 export const handleApiError = (error, context = 'API') => {
   console.error(`${context} Error:`, error)
 
   if (!error) {
     return ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
   }
 
   // Network errors
   if (error.name === 'NetworkError' || error.message?.includes('network')) {
     return ERROR_MESSAGES.GENERAL.NETWORK_ERROR
   }
 
   // Timeout errors
   if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
     return `${context} request timed out. Please try again.`
   }
 
   // Permission errors
   if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
     return `Access denied to ${context}. Please check your permissions.`
   }
 
   // Rate limiting
   if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
     return `${context} rate limit exceeded. Please try again later.`
   }
 
   // Return the original error message or default
   return error.message || ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR
 }
 
 /**
  * Media Error Handler
  * Handles errors related to media recording and file operations
  */
 export const handleMediaError = (error) => {
   console.error('Media Error:', error)
 
   const errorMappings = {
     'NotAllowedError': ERROR_MESSAGES.MEDIA.MIC_PERMISSION_DENIED,
     'NotFoundError': ERROR_MESSAGES.MEDIA.MIC_UNAVAILABLE,
     'NotSupportedError': ERROR_MESSAGES.MEDIA.RECORDING_NOT_SUPPORTED,
     'OverconstrainedError': 'Microphone constraints cannot be satisfied.',
     'SecurityError': 'Microphone access blocked due to security restrictions.',
     'AbortError': 'Media operation was aborted.',
     'NetworkError': 'Network error during media operation.',
     'TimeoutError': 'Media operation timed out.'
   }
 
   return errorMappings[error.name] || error.message || ERROR_MESSAGES.MEDIA.RECORDING_FAILED
 }
 
 /**
  * Location Error Handler
  * Handles geolocation errors
  */
 export const handleLocationError = (error) => {
   console.error('Location Error:', error)
 
   const errorMappings = {
     1: ERROR_MESSAGES.LOCATION.PERMISSION_DENIED, // PERMISSION_DENIED
     2: ERROR_MESSAGES.LOCATION.UNAVAILABLE,       // POSITION_UNAVAILABLE
     3: ERROR_MESSAGES.LOCATION.TIMEOUT            // TIMEOUT
   }
 
   return errorMappings[error.code] || error.message || ERROR_MESSAGES.LOCATION.UNAVAILABLE
 }
 
 /**
  * File Validation Error Handler
  * Handles file upload validation errors
  */
 export const handleFileError = (file, maxSize = 10 * 1024 * 1024) => {
   if (!file) {
     return 'No file selected.'
   }
 
   if (file.size > maxSize) {
     return ERROR_MESSAGES.GENERAL.FILE_TOO_LARGE
   }
 
   const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
   const supportedAudioTypes = ['audio/wav', 'audio/mp4', 'audio/webm', 'audio/mpeg']
   const allSupportedTypes = [...supportedImageTypes, ...supportedAudioTypes]
 
   if (!allSupportedTypes.includes(file.type)) {
     return ERROR_MESSAGES.GENERAL.UNSUPPORTED_FILE_TYPE
   }
 
   return null // No error
 }
 
 /**
  * Global Error Logger
  * Logs errors to console and potentially external services
  */
 export const logError = (error, context = 'Application', additionalData = {}) => {
   const errorInfo = {
     timestamp: new Date().toISOString(),
     context,
     error: {
       name: error.name,
       message: error.message,
       stack: error.stack
     },
     additionalData,
     userAgent: navigator.userAgent,
     url: window.location.href
   }
 
   console.error('Error logged:', errorInfo)
 
   // In production, you might want to send this to an error tracking service
   // Example: Sentry, LogRocket, or custom analytics
   if (process.env.NODE_ENV === 'production') {
     // Send to error tracking service
     // analytics.track('error', errorInfo)
   }
 
   return errorInfo
 }
 
 /**
  * Async Error Handler Wrapper
  * Wraps async functions to handle errors consistently
  */
 export const withErrorHandling = (asyncFn, context = 'Operation') => {
   return async (...args) => {
     try {
       return await asyncFn(...args)
     } catch (error) {
       logError(error, context)
       
       // Determine error type and handle appropriately
       if (error.name && ['NotAllowedError', 'NotFoundError', 'NotSupportedError'].includes(error.name)) {
         throw new Error(handleMediaError(error))
       } else if (error.code && [1, 2, 3].includes(error.code)) {
         throw new Error(handleLocationError(error))
       } else {
         throw new Error(handleApiError(error, context))
       }
     }
   }
 }
 
 /**
  * React Error Boundary Error Handler
  * Formats errors for React Error Boundary display
  */
 export const handleComponentError = (error, errorInfo) => {
   logError(error, 'React Component', { errorInfo })
   
   return {
     title: 'Something went wrong',
     message: process.env.NODE_ENV === 'development' 
       ? `${error.message}\n\nComponent Stack:\n${errorInfo.componentStack}`
       : 'An unexpected error occurred. Please refresh the page and try again.',
     canRetry: true
   }
 }