/**
 * Error Boundary Component for BiNx React App
 * Purpose: Catch and handle React component errors gracefully
 * Author: ML
 * Date: August 8, 2025
 */

 import React from 'react'
 import PropTypes from 'prop-types'
 import { handleComponentError } from '../../services/errorInterceptor'
 
 /**
  * Error Fallback Component
  * Displays when an error is caught by the boundary
  */
 const ErrorFallback = ({ error, resetError, title, message, canRetry = true }) => (
   <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
     <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg text-center">
       <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
         <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
       </div>
       
       <h2 className="text-xl font-semibold text-gray-900 mb-2">
         {title || 'Something went wrong'}
       </h2>
       
       <p className="text-gray-600 mb-6 leading-relaxed">
         {message || 'An unexpected error occurred. Please try refreshing the page.'}
       </p>
       
       {process.env.NODE_ENV === 'development' && (
         <details className="mb-6 text-left">
           <summary className="cursor-pointer text-sm text-gray-500 mb-2">
             Error Details (Development)
           </summary>
           <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto text-red-600">
             {error.stack}
           </pre>
         </details>
       )}
       
       <div className="flex flex-col sm:flex-row gap-3">
         {canRetry && (
           <button
             onClick={resetError}
             className="flex-1 bg-customPurple text-white py-3 px-4 rounded-xl font-medium transition-colors hover:opacity-90"
           >
             Try Again
           </button>
         )}
         
         <button
           onClick={() => window.location.reload()}
           className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors hover:bg-gray-50"
         >
           Refresh Page
         </button>
       </div>
       
       <div className="mt-4 pt-4 border-t border-gray-200">
         <p className="text-xs text-gray-400">
           If this problem persists, please contact support.
         </p>
       </div>
     </div>
   </div>
 )
 
 ErrorFallback.propTypes = {
   error: PropTypes.object.isRequired,
   resetError: PropTypes.func.isRequired,
   title: PropTypes.string,
   message: PropTypes.string,
   canRetry: PropTypes.bool
 }
 
 /**
  * Error Boundary Class Component
  * Catches JavaScript errors anywhere in the child component tree
  */
 class ErrorBoundary extends React.Component {
   constructor(props) {
     super(props)
     this.state = {
       hasError: false,
       error: null,
       errorInfo: null,
       errorId: null
     }
   }
 
   static getDerivedStateFromError(error) {
     // Update state so the next render will show the fallback UI
     return {
       hasError: true,
       error,
       errorId: Date.now()
     }
   }
 
   componentDidCatch(error, errorInfo) {
     // Log error details
     const errorDetails = handleComponentError(error, errorInfo)
     
     this.setState({
       error,
       errorInfo,
       errorDetails
     })
   }
 
   resetError = () => {
     this.setState({
       hasError: false,
       error: null,
       errorInfo: null,
       errorDetails: null,
       errorId: null
     })
   }
 
   render() {
     if (this.state.hasError) {
       // Custom fallback component
       if (this.props.fallback) {
         return this.props.fallback(
           this.state.error,
           this.resetError,
           this.state.errorDetails
         )
       }
 
       // Default fallback
       return (
         <ErrorFallback
           error={this.state.error}
           resetError={this.resetError}
           title={this.state.errorDetails?.title}
           message={this.state.errorDetails?.message}
           canRetry={this.state.errorDetails?.canRetry}
         />
       )
     }
 
     return this.props.children
   }
 }
 
 ErrorBoundary.propTypes = {
   children: PropTypes.node.isRequired,
   fallback: PropTypes.func
 }
 
 export default ErrorBoundary
 
 /**
  * Higher-Order Component for Error Boundaries
  * Wraps components with error boundary protection
  */
 export const withErrorBoundary = (Component, fallback) => {
   const WrappedComponent = (props) => (
     <ErrorBoundary fallback={fallback}>
       <Component {...props} />
     </ErrorBoundary>
   )
   
   WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
   
   return WrappedComponent
 }
 
 /**
  * Error Boundary Hook for Functional Components
  * Provides error state and reset functionality
  */
 export const useErrorHandler = () => {
   const [error, setError] = React.useState(null)
 
   const resetError = React.useCallback(() => {
     setError(null)
   }, [])
 
   const handleError = React.useCallback((error) => {
     setError(error)
   }, [])
 
   // Effect to handle errors thrown in event handlers
   React.useEffect(() => {
     const handleUnhandledError = (event) => {
       setError(event.error)
     }
 
     const handleUnhandledRejection = (event) => {
       setError(new Error(event.reason))
     }
 
     window.addEventListener('error', handleUnhandledError)
     window.addEventListener('unhandledrejection', handleUnhandledRejection)
 
     return () => {
       window.removeEventListener('error', handleUnhandledError)
       window.removeEventListener('unhandledrejection', handleUnhandledRejection)
     }
   }, [])
 
   return {
     error,
     resetError,
     handleError,
     hasError: !!error
   }
 }