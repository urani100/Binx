/**
 * Type Definitions for BiNx React App
 * Purpose: Centralized PropTypes and type checking
 * Author: ML
 * Date: August 8, 2025
 */

 import PropTypes from 'prop-types'

 // User Profile Type
 export const UserProfileType = PropTypes.shape({
   alterEgo: PropTypes.string,
   currentResidence: PropTypes.string,
   occupation: PropTypes.string,
   currentlyReading: PropTypes.string,
   lastMovieWatched: PropTypes.string,
   nextMovie: PropTypes.string,
   currentlyWearing: PropTypes.string,
   favoriteBrand: PropTypes.string,
   favoriteAuthors: PropTypes.string,
   favoriteVibe: PropTypes.string,
   idealSunday: PropTypes.string,
   onboardingCompleted: PropTypes.bool
 })
 
 // User Type
 export const UserType = PropTypes.shape({
   id: PropTypes.string.isRequired,
   email: PropTypes.string.isRequired,
   name: PropTypes.string.isRequired,
   profilePic: PropTypes.string,
   profile: UserProfileType
 })
 
 // Location Type
 export const LocationType = PropTypes.shape({
   name: PropTypes.string.isRequired,
   lat: PropTypes.number.isRequired,
   lng: PropTypes.number.isRequired
 })
 
 // User Location Type (with weather data)
 export const UserLocationType = PropTypes.shape({
   lat: PropTypes.number.isRequired,
   lng: PropTypes.number.isRequired,
   temperature: PropTypes.number,
   condition: PropTypes.string,
   weatherIcon: PropTypes.string,
   city: PropTypes.string,
   locality: PropTypes.string,
   sublocality: PropTypes.string,
   state: PropTypes.string,
   country: PropTypes.string,
   displayLocation: PropTypes.string,
   address: PropTypes.string
 })
 
 // Pin Type
 export const PinType = PropTypes.shape({
   id: PropTypes.string.isRequired,
   userId: PropTypes.string.isRequired,
   title: PropTypes.string.isRequired,
   location: LocationType.isRequired,
   mood: PropTypes.string.isRequired,
   note: PropTypes.string.isRequired,
   photo: PropTypes.string,
   audioUrl: PropTypes.string,
   timestamp: PropTypes.instanceOf(Date).isRequired,
   culturalContext: PropTypes.string
 })
 
 // Palette Type
 export const PaletteType = PropTypes.shape({
   name: PropTypes.string.isRequired,
   background: PropTypes.string.isRequired,
   primary: PropTypes.string.isRequired,
   text: PropTypes.string.isRequired
 })
 
 // Guide Type
 export const GuideType = PropTypes.shape({
   name: PropTypes.string.isRequired,
   svgFile: PropTypes.string.isRequired,
   mood: PropTypes.string.isRequired,
   description: PropTypes.string.isRequired
 })
 
 // Modal State Type
 export const ModalStateType = PropTypes.shape({
   isOpen: PropTypes.bool.isRequired,
   title: PropTypes.string,
   message: PropTypes.string
 })
 
 // Photo Modal Type
 export const PhotoModalType = PropTypes.shape({
   isOpen: PropTypes.bool.isRequired,
   imageUrl: PropTypes.string
 })
 
 // Auth Form Type
 export const AuthFormType = PropTypes.shape({
   email: PropTypes.string.isRequired,
   password: PropTypes.string.isRequired,
   name: PropTypes.string
 })
 
 // API Response Type
 export const ApiResponseType = PropTypes.shape({
   success: PropTypes.bool.isRequired,
   error: PropTypes.string,
   data: PropTypes.any
 })
 
 // Error Type
 export const ErrorType = PropTypes.shape({
   message: PropTypes.string.isRequired,
   code: PropTypes.string,
   stack: PropTypes.string
 })
 
 // Common Props
 export const CommonProps = {
   // Loading states
   loading: PropTypes.bool,
   loadingPins: PropTypes.bool,
   
   // Event handlers
   onClick: PropTypes.func,
   onChange: PropTypes.func,
   onSubmit: PropTypes.func,
   onClose: PropTypes.func,
   onOpen: PropTypes.func,
   
   // Component props
   className: PropTypes.string,
   children: PropTypes.node,
   disabled: PropTypes.bool,
   selected: PropTypes.bool,
   
   // Data props
   user: UserType,
   pin: PinType,
   pins: PropTypes.arrayOf(PinType),
   userLocation: UserLocationType,
   
   // Modal props
   isOpen: PropTypes.bool,
   title: PropTypes.string,
   message: PropTypes.string,
   
   // Callback props
   onAuth: PropTypes.func,
   onLogout: PropTypes.func,
   onCreatePin: PropTypes.func,
   onDeletePin: PropTypes.func,
   onSelectPin: PropTypes.func,
   onUpdateProfile: PropTypes.func,
   onUpdateProfilePicture: PropTypes.func,
   onRemoveProfilePicture: PropTypes.func,
   onSelectPalette: PropTypes.func,
   onSelectGuide: PropTypes.func,
   setMessageModal: PropTypes.func
 }
 
 // Validation helpers
 export const validateEmail = (email) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
   return emailRegex.test(email)
 }
 
 export const validatePassword = (password) => {
   return password && password.length >= 6
 }
 
 export const validateRequired = (value) => {
   return value && value.trim().length > 0
 }
 
 export const validateFileSize = (file, maxSize = 10 * 1024 * 1024) => {
   return file && file.size <= maxSize
 }
 
 export const validateImageType = (file) => {
   const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
   return file && supportedTypes.includes(file.type)
 }
 
 export const validateAudioType = (file) => {
   const supportedTypes = ['audio/wav', 'audio/mp4', 'audio/webm', 'audio/mpeg']
   return file && supportedTypes.includes(file.type)
 }