"use client"

import Image from 'next/image'
import React from 'react'
import banner from '@/assets/banner_full.svg'
import { AuthButton } from './components/auth/cards/card'
import Navbar from './components/global/Navbar'

const Test = () => {
  return (
    <div className='w-screen h-screen bg-amber-50 flex flex-col items-center justify-start pt-16'>
        <Navbar/>
            <div className='w-screen h-[400px] max-md:h-[300px] max-sm relative overflow-hidden border-b-2 border-black'>
                <Image src={banner} alt='banner' className='absolute bottom-0 left-1/2 -translate-x-1/2 w-[200vw] translate-y-1/2 origin-center slow-spin scale-[2] max-md:scale-[5]' />
                <div className='absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center'>
                    <h1 className='heading-text-3 max-md:heading-text-2 text-8xl max-sm:text-5xl font-anton'>
                        CA<span className='text-secondary text-9xl max-sm:text-6xl'>$</span>H DRIVE
                    </h1>
                    <AuthButton/>
                </div>
            </div>
    </div>
  )
}

export default Test