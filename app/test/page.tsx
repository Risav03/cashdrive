"use client"

import Image from 'next/image'
import React from 'react'
import banner from '@/assets/banner_full.svg'
import { AuthButton } from '../components/auth/cards/card'

const Test = () => {
  return (
    <div className='w-screen h-screen bg-white flex flex-col items-center justify-start'>
        

            <div className=' flex flex-row justify-between items-center px-5 w-full h-fit py-5 mx-auto border-b-4 border-black bg-primary '>
                <div className='w-1/2 h-fit '>
                    <h1 className='heading-text-2 text-5xl  font-anton -mt-3 cursor-pointer '>
                        <span className='text-yellow-300 hover:text-white'>$$$</span>
                    </h1>
                </div>
                <div className='w-1/2 text-xl h-full flex flex-row gap-5 justify-end items-center font-freeman'>
                    <h3 className='hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer'>HOME</h3>
                    <h3 className='hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer'>MARKETPLACE</h3>
                    <h3 className='hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer'>GITHUB</h3>
                </div>
            </div>

            <div className='w-screen h-[1000px] relative overflow-hidden'>
                <Image src={banner} alt='banner' className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 origin-center slow-spin scale-200' />
                <div className='absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center'>
                    <h1 className='heading-text-3 text-8xl font-anton'>
                        CA<span className='text-secondary text-9xl'>$</span>H DRIVE
                    </h1>
                    <AuthButton/>
                </div>
            </div>


        

        

        <div className='flex flex-col items-center justify-center w-full h-full p-10'>
            <div className='w-80 h-full bg-amber-100 border-2 border-black brutal-shadow-left'>
                <div className='w-full h-full '>
                    <h1>
                        Hello
                    </h1>
                </div>
            </div>
        </div>

    </div>
  )
}

export default Test