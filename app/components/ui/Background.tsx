import React from 'react'
import bg4 from '@/assets/backgrounds/bg4.jpg'
import bg5 from '@/assets/backgrounds/bg5.jpg'
import Image from 'next/image'

export const Background = () => {
  return (
    <div className="absolute -z-50 top-0 left-0 w-full h-screen">
      <Image 
        src={bg5} 
        alt="bg4" 
        className="absolute -z-20 top-0 left-0 w-full h-full object-cover brightness-[0.6]" 
      />
      <div className="absolute -z-10 top-0 left-0 w-full h-full bg-gradient-to-br from-black/60 via-transparent to-black/60 opacity-80"></div>
    </div>
  )
}
