/**
 * Authentication View Component for BiNx React App
 * Purpose: Login and registration interface
 * Author: ML
 * Date: August 8, 2025
 */

import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../ui'

const AuthView = () => {
  const { login, loginWithGoogle, register, loading } = useAuth()
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setValidationErrors({})

    try {
      if (authMode === 'login') {
        await login(authForm.email, authForm.password)
      } else {
        const result = await register(authForm.email, authForm.password, authForm.name)
        if (result?.success) {
          setRegisteredEmail(authForm.email)
          setRegistrationSuccess(true)
        }
      }
    } catch (_) {}
  }

  const handleInputChange = (field, value) => {
    setAuthForm(prev => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

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

        {registrationSuccess ? (
          <div className="text-center space-y-4">
            <p className="text-gray-700 font-medium">Check your email</p>
            <p className="text-sm text-gray-500">We sent a confirmation link to</p>
            <p className="text-sm font-medium text-gray-900 break-all">{registeredEmail}</p>
            <p className="text-sm text-gray-500">
              Click the link in the email to activate your account, then sign in.
            </p>
            <button
              type="button"
              onClick={() => {
                setRegistrationSuccess(false)
                setAuthMode('login')
                setAuthForm({ email: '', password: '', name: '' })
              }}
              className="w-full bg-customPurple text-white py-3 rounded-xl font-medium transition-colors mt-4"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <input
                    type="text"
                    placeholder="Name"
                    value={authForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full p-3 border rounded-xl outline-none transition-colors ${validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
                    disabled={loading}
                    aria-invalid={!!validationErrors.name}
                    aria-describedby={validationErrors.name ? 'name-error' : undefined}
                  />
                  {validationErrors.name && (
                    <p id="name-error" className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                  )}
                </div>
              )}

              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full p-3 border rounded-xl outline-none transition-colors ${validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
                  disabled={loading}
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={validationErrors.email ? 'email-error' : undefined}
                />
                {validationErrors.email && (
                  <p id="email-error" className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full p-3 border rounded-xl outline-none transition-colors ${validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
                  disabled={loading}
                  aria-invalid={!!validationErrors.password}
                  aria-describedby={validationErrors.password ? 'password-error' : undefined}
                />
                {validationErrors.password && (
                  <p id="password-error" className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-customPurple text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 text-center flex items-center justify-center"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  authMode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

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

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-4 text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl bg-white text-gray-700 text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  )
}

AuthView.propTypes = {}

export default AuthView
