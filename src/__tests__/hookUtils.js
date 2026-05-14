/**
 * Hook Testing Utilities for BiNx React App
 * Purpose: Provide utilities for testing custom hooks (React 18+ compatible)
 * Author: ML
 * Date: August 8, 2025
 */

 import { render } from '@testing-library/react'
 import { useState } from 'react'
 
 /**
  * Test custom hooks by rendering them in a test component
  * This replaces @testing-library/react-hooks for React 18+
  */
 export const renderHook = (hook, options = {}) => {
   const { initialProps, ...renderOptions } = options
   let result = { current: null }
   let rerender
 
   function TestComponent(props) {
     result.current = hook(props)
     return null
   }
 
   const renderResult = render(<TestComponent {...initialProps} />, renderOptions)
   
   rerender = (newProps) => {
     renderResult.rerender(<TestComponent {...newProps} />)
   }
 
   return {
     result,
     rerender,
     unmount: renderResult.unmount
   }
 }
 
 /**
  * Helper to test hooks that use state updates
  */
 export const renderHookWithState = (hook, initialState = {}) => {
   let hookResult = { current: null }
   let stateSetters = {}
 
   function TestComponent() {
     // Create state for each key in initialState
     Object.keys(initialState).forEach(key => {
       const [value, setter] = useState(initialState[key])
       stateSetters[key] = setter
       initialState[key] = value
     })
 
     hookResult.current = hook(initialState)
     return null
   }
 
   const renderResult = render(<TestComponent />)
 
   return {
     result: hookResult,
     setState: (key, value) => {
       if (stateSetters[key]) {
         stateSetters[key](value)
       }
     },
     unmount: renderResult.unmount
   }
 }
 
 /**
  * Helper to test async hooks
  */
 export const renderAsyncHook = async (hook, options = {}) => {
   const result = renderHook(hook, options)
   
   // Wait for any async operations to complete
   await new Promise(resolve => setTimeout(resolve, 0))
   
   return result
 }
 
 /**
  * Helper to test hooks with error boundaries
  */
 export const renderHookWithErrorBoundary = (hook, options = {}) => {
   let error = null
   
   const ErrorBoundary = ({ children }) => {
     try {
       return children
     } catch (e) {
       error = e
       return null
     }
   }
 
   const result = renderHook(hook, {
     ...options,
     wrapper: ErrorBoundary
   })
 
   return {
     ...result,
     error
   }
 }