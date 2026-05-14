/**
 * Loading Spinner Component for BiNx React App
 * Purpose: Consistent loading indicator with customizable styling
 * Author: ML
 * Date: August 8, 2025
 */

 import React from 'react'
 import PropTypes from 'prop-types'
 
 /**
  * LoadingSpinner Component
  * Displays a spinning loading indicator
  */
 const LoadingSpinner = ({ 
   size = 'md',
   color = 'primary',
   text = '',
   className = ''
 }) => {
   const sizeClasses = {
     sm: 'w-4 h-4',
     md: 'w-8 h-8', 
     lg: 'w-12 h-12',
     xl: 'w-16 h-16'
   }
 
   const colorClasses = {
     primary: 'text-customPurple',
     text: 'text-customPurpleText',
     gray: 'text-gray-600',
     white: 'text-white'
   }
 
   return (
     <div className={`flex flex-col items-center justify-center ${className}`}>
       <div 
         className={`
           ${sizeClasses[size]} 
           ${colorClasses[color]}
           animate-spin
         `}
         role="status"
         aria-label="Loading"
       >
         <svg 
           className="w-full h-full" 
           fill="none" 
           viewBox="0 0 24 24"
           xmlns="http://www.w3.org/2000/svg"
         >
           <circle 
             className="opacity-25" 
             cx="12" 
             cy="12" 
             r="10" 
             stroke="currentColor" 
             strokeWidth="4"
           />
           <path 
             className="opacity-75" 
             fill="currentColor" 
             d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
           />
         </svg>
       </div>
       
       {text && (
         <p className={`mt-2 text-sm ${colorClasses[color]}`}>
           {text}
         </p>
       )}
     </div>
   )
 }
 
 LoadingSpinner.propTypes = {
   size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
   color: PropTypes.oneOf(['primary', 'text', 'gray', 'white']),
   text: PropTypes.string,
   className: PropTypes.string
 }
 
 export default LoadingSpinner