/**
 * Pin Card Component for BiNx React App - EXACT REPLICA
 * Purpose: Display individual pins exactly matching original index.html styling
 * Author: ML
 * Date: August 8, 2025
 */

 import React, { useRef, useState } from 'react'
 import PropTypes from 'prop-types'
 import { PinType } from '../../types'
 import { VibeTag } from '../ui'
 import { formatTimestamp } from '../../utils/helpers'
 
 /**
  * PinCard Component - Exact replica of original pin card styling and behavior
  */
 const PinCard = ({ 
   pin, 
   onClick, 
   onDelete, 
   onOpenPhoto,
   className = ''
 }) => {
   const [isPlayingAudio, setIsPlayingAudio] = useState(false)
   const audioRef = useRef(null)
 
   const { date, time } = formatTimestamp(pin.timestamp)
 
   /**
    * Handle audio play/pause - EXACT ORIGINAL LOGIC
    */
   const handlePlayPauseAudio = (e) => {
     e.stopPropagation() // Prevent click from bubbling to parent PinCard
     const audio = audioRef.current
     if (audio.paused) {
       audio.play()
       setIsPlayingAudio(true)
     } else {
       audio.pause()
       setIsPlayingAudio(false)
     }
   }
 
   /**
    * Handle camera/photo click - EXACT ORIGINAL LOGIC
    */
   const handleCameraClick = (e) => {
     e.stopPropagation() // Stop event from bubbling up to the PinCard's navigation
     if (pin.photo) {
       onOpenPhoto(pin.photo) // Call the function passed from MainView
     }
   }
 

  const handleDeleteClick = (e) => {
    e.preventDefault()  // Changed from stopPropagation to preventDefault
    onDelete(pin)
  }
 
   /**
    * Handle card click - EXACT ORIGINAL LOGIC
    */
   const handleCardClick = () => {
     onClick(pin)
   }
 
   return (
     <div className={`bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 transition-all ${className}`}>
       
       {/* Header Section - EXACT ORIGINAL */}
       <div className="flex justify-between items-start mb-3">
         <div
           className="flex-1 cursor-pointer"
           onClick={handleCardClick}
         >
           <h3 className="font-medium text-gray-900 text-sm mb-1">{pin.title}</h3>
           <p className="text-xs text-gray-500 mb-1">{pin.location.name}</p>
           <p className="text-xs text-gray-400">{date} • {time}</p>
         </div>
         
         <div className="flex flex-col items-end space-y-2">
           <div className="flex items-center space-x-2">
             {Array.isArray(pin.moods) && pin.moods.length > 0
             ? pin.moods.map(m => <VibeTag key={m} vibe={m} size="sm" />)
             : pin.mood
               ? <VibeTag vibe={pin.mood} size="sm" />
               : null
           }
             {/* Delete Button - EXACT ORIGINAL STYLING (NO PINK HOVER) */}
             <button
               onClick={handleDeleteClick}
               className="w-6 h-6 flex items-center justify-center rounded-full bg-customBackground text-customPurpleText transition-colors"
               title="Delete pin"
             >
               <i className="fas fa-trash-alt text-xs"></i>
             </button>
           </div>
           
           {/* Cultural Context FROM  MAIN PAGE - EXACT ORIGINAL */}
           {/* {pin.culturalContext && (
             <span className="text-xs text-gray-800 bg-gray-200 px-2 py-1 rounded-full">
               {pin.culturalContext}
             </span>
           )} */}
         </div>
       </div>
 
       {/* Main Content Area - EXACT ORIGINAL */}
       <div
         className="cursor-pointer"
         onClick={handleCardClick}
       >
         {/* Photo - EXACT ORIGINAL */}
         {pin.photo && (
           <img src={pin.photo} alt="Pin photo" className="w-full h-48 object-cover rounded-lg mb-3" />
         )}
 
         {/* Note - EXACT ORIGINAL */}
         <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">{pin.note}</p>
 
         {/* Media Controls Section - EXACT ORIGINAL */}
         <div className="flex justify-between items-center">
           <div className="flex items-center space-x-3">
             
             {/* Audio Control - EXACT ORIGINAL STYLING AND BEHAVIOR */}
             {pin.audioUrl && (
               <>
                 <audio 
                   ref={audioRef} 
                   src={pin.audioUrl} 
                   className="hidden" 
                   onEnded={() => setIsPlayingAudio(false)}
                 ></audio>
                 <button
                   onClick={handlePlayPauseAudio}
                   className="w-12 h-12 rounded-full flex items-center justify-center bg-customBackground text-customPurpleText transition-colors"
                   title={isPlayingAudio ? 'Pause audio' : 'Play audio'}
                 >
                   <i className={`fas ${isPlayingAudio ? 'fa-pause' : 'fa-play'} text-L`}></i>
                 </button>
               </>
             )}
             
             {/* Camera/Photo Button - EXACT ORIGINAL STYLING */}
             {pin.photo && (
               <button
                 onClick={handleCameraClick}
                 className="w-12 h-12 rounded-full flex items-center justify-center bg-customBackground text-customPurpleText transition-colors"
                 title="View photo"
               >
                 <i className="fas fa-camera text-L"></i>
               </button>
             )}
           </div>
         </div>
       </div>
     </div>
   )
 }
 
 PinCard.propTypes = {
   pin: PinType.isRequired,
   onClick: PropTypes.func,
   onDelete: PropTypes.func,
   onOpenPhoto: PropTypes.func,
   className: PropTypes.string
 }
 
 export default PinCard