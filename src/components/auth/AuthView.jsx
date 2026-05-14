/**
 * Authentication View Component for BiNx React App
 * Purpose: Login and registration interface with demo access
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useState } from 'react'
 import PropTypes from 'prop-types'
 import { useAuth } from '../../hooks/useAuth'
 import { LoadingSpinner } from '../ui'
 import { DEMO_USER } from '../../utils/constants'
 
 /**
  * AuthView Component
  * Handles user login and registration with demo mode
  */
 const AuthView = () => {
   const { login, register, loading } = useAuth()
   const [authMode, setAuthMode] = useState('login')
   const [authForm, setAuthForm] = useState({ 
     email: '', 
     password: '', 
     name: '' 
   })
   const [validationErrors, setValidationErrors] = useState({})
 
   /**
    * Validate form inputs
    */
   const validateForm = () => {
     const errors = {}
 
     if (authMode === 'register' && (!authForm.name || authForm.name.trim().length < 2)) {
       errors.name = 'Name must be at least 2 characters'
     }
 
     if (!authForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authForm.email)) {
       errors.email = 'Please enter a valid email address'
     }
 
     if (!authForm.password || authForm.password.length < 6) {
       errors.password = 'Password must be at least 6 characters'
     }
 
     setValidationErrors(errors)
     return Object.keys(errors).length === 0
   }
 
   /**
    * Handle form submission
    */
   const handleSubmit = async (e) => {
     e.preventDefault()
     
     if (!validateForm()) {
       return
     }
 
     setValidationErrors({})
 
     try {
       let result
       if (authMode === 'login') {
         result = await login(authForm.email, authForm.password)
       } else {
         result = await register(authForm.email, authForm.password, authForm.name)
       }
 
     } catch (_) {
     }
   }
 
   /**
    * Handle demo login
    */
   const handleDemoLogin = async () => {
     setValidationErrors({})
     try {
       await login(DEMO_USER.email, '')
     } catch (_) {
     }
   }
 
   /**
    * Handle input changes
    */
   const handleInputChange = (field, value) => {
     setAuthForm(prev => ({ ...prev, [field]: value }))
     
     // Clear validation error when user starts typing
     if (validationErrors[field]) {
       setValidationErrors(prev => ({ ...prev, [field]: '' }))
     }
   }
 
   /**
    * Toggle between login and register modes
    */
   const toggleAuthMode = () => {
     setAuthMode(prev => prev === 'login' ? 'register' : 'login')
     setValidationErrors({})
     setAuthForm({ email: '', password: '', name: '' })
   }
 
   return (
     <div className="max-w-sm mx-auto bg-gray-50 min-h-screen flex items-center justify-center">
       <div className="w-full p-6">
         {/* Header */}
         <div className="text-center mb-8">
           <h1 className="text-3xl font-light text-gray-900 mb-2">BiNx</h1>
           <p className="text-sm text-gray-600">Drop a vibe, not just a pin</p>
         </div>
 
         {/* Auth Form */}
         <form onSubmit={handleSubmit} className="space-y-4">
           {/* Name Field (Register Only) */}
           {authMode === 'register' && (
             <div>
               <input
                 type="text"
                 placeholder="Name"
                 value={authForm.name}
                 onChange={(e) => handleInputChange('name', e.target.value)}
                 className={`
                   w-full p-3 border rounded-xl outline-none transition-colors
                   focus:ring-2 focus:ring-gray-600 focus:border-transparent
                   ${validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-100'}
                 `}
                 disabled={loading}
                 aria-invalid={!!validationErrors.name}
                 aria-describedby={validationErrors.name ? 'name-error' : undefined}
               />
               {validationErrors.name && (
                 <p id="name-error" className="text-red-500 text-xs mt-1">
                   {validationErrors.name}
                 </p>
               )}
             </div>
           )}
 
           {/* Email Field */}
           <div>
             <input
               type="email"
               placeholder="Email"
               value={authForm.email}
               onChange={(e) => handleInputChange('email', e.target.value)}
               className={`
                 w-full p-3 border rounded-xl outline-none transition-colors
                 focus:ring-2 focus:ring-gray-600 focus:border-transparent
                 ${validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-100'}
               `}
               disabled={loading}
               aria-invalid={!!validationErrors.email}
               aria-describedby={validationErrors.email ? 'email-error' : undefined}
             />
             {validationErrors.email && (
               <p id="email-error" className="text-red-500 text-xs mt-1">
                 {validationErrors.email}
               </p>
             )}
           </div>
 
           {/* Password Field */}
           <div>
             <input
               type="password"
               placeholder="Password"
               value={authForm.password}
               onChange={(e) => handleInputChange('password', e.target.value)}
               className={`
                 w-full p-3 border rounded-xl outline-none transition-colors
                 focus:ring-2 focus:ring-gray-600 focus:border-transparent
                 ${validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-100'}
               `}
               disabled={loading}
               aria-invalid={!!validationErrors.password}
               aria-describedby={validationErrors.password ? 'password-error' : undefined}
             />
             {validationErrors.password && (
               <p id="password-error" className="text-red-500 text-xs mt-1">
                 {validationErrors.password}
               </p>
             )}
           </div>
 
           {/* Submit Button */}
           <button
             type="submit"
             disabled={loading}
             className="w-full bg-customPurple text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 text-center flex items-center justify-center"
           >
             {loading ? (
               <LoadingSpinner size="sm" color="white" />
             ) : (
               <>
                 {authMode === 'login' ? '🚀 Sign In' : '✨ Create Account'}
               </>
             )}
           </button>
 
           {/* Demo Login Button */}
           <button
             type="button"
             onClick={handleDemoLogin}
             disabled={loading}
             className="w-full bg-customPurple text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
           >
             🎯 Quick Demo Login
           </button>
         </form>
 
         {/* Mode Toggle */}
         <div className="text-center mt-6">
           <button
             type="button"
             onClick={toggleAuthMode}
             disabled={loading}
             className="text-sm text-gray-800 underline hover:text-gray-600 transition-colors disabled:opacity-50"
           >
             {authMode === 'login' 
               ? 'Need an account? Sign up' 
               : 'Have an account? Sign in'
             }
           </button>
         </div>
 
         {/* Demo Instructions */}
         <div className="mt-6 p-4 bg-gray-200 rounded-xl">
           <p className="text-xs text-gray-900 text-center">
             <strong> Try BiNx </strong><br />
             1. Click "Quick Demo Login" for instant access<br />
             {/* 2. Or use: binx@example.com + any password<br /> */}
             2. Create your first vibe! 
           </p>
         </div>
       </div>
     </div>
   )
 }
 
 AuthView.propTypes = {
   // No props - uses hooks for state management
 }
 
 export default AuthView