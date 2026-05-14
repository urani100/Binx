/**
 * Vibe Tag Component for BiNx React App
 * Purpose: Reusable vibe selection button with consistent styling
 * Author: ML
 * Date: August 8, 2025
 */

 import React from 'react'
 import PropTypes from 'prop-types'
 
 /**
  * VibeTag Component
  * Displays a vibe as a clickable tag with selection state
  */
 const VibeTag = ({ 
   vibe, 
   selected = false, 
   onClick, 
   size = 'md',
   disabled = false,
   className = ''
 }) => {
   const sizeClasses = {
     sm: 'px-3 py-1 text-xs',
     md: 'px-4 py-2 text-sm', 
     lg: 'px-6 py-3 text-base'
   }
 
   const baseClasses = `
     ${sizeClasses[size]} 
     rounded-full 
     font-medium 
     transition-all 
     duration-200
     ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
     ${className}
   `
 
     const stateClasses = selected
     ? 'bg-customPurple text-customPurpleText shadow-md'
     : 'bg-customBackground text-customPurpleText'
 
   const handleClick = () => {
     if (!disabled && onClick) {
       onClick(vibe)
     }
   }
 
   const handleKeyDown = (e) => {
     if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
       e.preventDefault()
       handleClick()
     }
   }
 
   return (
     <button
       type="button"
       onClick={handleClick}
       onKeyDown={handleKeyDown}
       disabled={disabled}
       className={`${baseClasses} ${stateClasses}`}
       aria-pressed={selected}
       aria-label={`Select ${vibe} vibe`}
       title={`${vibe} vibe`}
     >
       {vibe}
     </button>
   )
 }
 
 VibeTag.propTypes = {
   vibe: PropTypes.string.isRequired,
   selected: PropTypes.bool,
   onClick: PropTypes.func,
   size: PropTypes.oneOf(['sm', 'md', 'lg']),
   disabled: PropTypes.bool,
   className: PropTypes.string
 }
 
 export default VibeTag