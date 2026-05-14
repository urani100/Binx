/**
 * User Avatar Component for BiNx React App
 * Purpose: Display user profile picture with initials fallback
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useState } from 'react'
 import PropTypes from 'prop-types'
 import { UserType } from '../../types'
 import { getInitial } from '../../utils/helpers'
 
 /**
  * UserAvatar Component
  * Shows profile picture or initials with error handling
  */
 const UserAvatar = ({ 
   user, 
   size = 'md',
   showHoverEffect = false,
   onClick,
   className = ''
 }) => {
   const [imageError, setImageError] = useState(false)
 
   const sizeClasses = {
     sm: 'w-8 h-8 text-sm',
     md: 'w-12 h-12 text-base',
     lg: 'w-16 h-16 text-lg',
     xl: 'w-24 h-24 text-2xl'
   }
 
   const baseClasses = `
     ${sizeClasses[size]}
     rounded-full
     flex
     items-center
     justify-center
     font-bold
     transition-all
     duration-200
     ${onClick ? 'cursor-pointer' : ''}
     ${showHoverEffect ? 'hover:scale-105' : ''}
     ${className}
   `
 
   // Determine if we should show profile picture
   const shouldShowProfilePic = 
     user?.profilePic && 
     user.profilePic !== "" && 
     user.profilePic !== "null" && 
     !imageError
 
   const handleImageError = () => {
     console.warn('Profile image failed to load:', user?.profilePic)
     setImageError(true)
   }
 
   const handleClick = () => {
     if (onClick) {
       onClick(user)
     }
   }
 
   const handleKeyDown = (e) => {
     if (onClick && (e.key === 'Enter' || e.key === ' ')) {
       e.preventDefault()
       handleClick()
     }
   }
 
   if (shouldShowProfilePic) {
     return (
       <div 
         className={baseClasses}
         onClick={handleClick}
         onKeyDown={handleKeyDown}
         tabIndex={onClick ? 0 : -1}
         role={onClick ? 'button' : 'img'}
         aria-label={`${user?.name || 'User'} profile picture`}
       >
         <img
           src={user.profilePic}
           alt={`${user?.name || 'User'} profile`}
           className="w-full h-full object-cover rounded-full"
           onError={handleImageError}
           loading="lazy"
         />
       </div>
     )
   }
 
   // Fallback to initials
   const initial = getInitial(user)
   
   return (
     <div
       className={baseClasses}
       onClick={handleClick}
       onKeyDown={handleKeyDown}
       tabIndex={onClick ? 0 : -1}
       role={onClick ? 'button' : 'img'}
       aria-label={`${user?.name || 'User'} initials: ${initial}`}
       style={{ 
         backgroundColor: 'var(--color-background)', 
         color: 'var(--color-text)' 
       }}
     >
       {initial}
     </div>
   )
 }
 
 UserAvatar.propTypes = {
   user: UserType,
   size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
   showHoverEffect: PropTypes.bool,
   onClick: PropTypes.func,
   className: PropTypes.string
 }
 
 export default UserAvatar