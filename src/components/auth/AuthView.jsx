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
  const { login, register, loading } = useAuth()
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
                    className={`w-full p-3 border rounded-xl outline-none transition-colors focus:ring-2 focus:ring-gray-600 focus:border-transparent ${validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
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
                  className={`w-full p-3 border rounded-xl outline-none transition-colors focus:ring-2 focus:ring-gray-600 focus:border-transparent ${validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
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
                  className={`w-full p-3 border rounded-xl outline-none transition-colors focus:ring-2 focus:ring-gray-600 focus:border-transparent ${validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
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
          </>
        )}
      </div>
    </div>
  )
}

AuthView.propTypes = {}

export default AuthView
