import React from 'react'

const Navbar = () => {
  return (
    <div className=' fixed top-0 left-0 z-50 flex flex-row justify-between items-center px-5 w-full h-fit py-5 mx-auto border-b-2 border-black bg-[#FFD000] shadow-lg shadow-black/50 '>
        <div className='w-1/2 h-fit '>
            <h1 className='heading-text-2 text-4xl  font-anton -mt-3 cursor-pointer '>
                C<span className='text-yellow-300 text-5xl hover:text-white'>$</span>D
            </h1>
        </div>
        <div className='w-1/2 text-xl h-full flex flex-row gap-5 justify-end items-center font-freeman'>
            <h3 className='hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer'>HOME</h3>
            <h3 className='hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer'>MARKETPLACE</h3>
            <h3 className='hover:text-white hover:scale-105 transition-all duration-300 cursor-pointer'>GITHUB</h3>
        </div>
    </div>
  )
}

export default Navbar