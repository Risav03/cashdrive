import React from 'react'
import loader1 from '@/assets/loader_1.svg'
import loader2 from '@/assets/loader_2.svg'
import loader3 from '@/assets/loader_3.svg'
import Image from 'next/image'

const Loader = () => {
  return (
    <div className='w-fit h-fit flex flex-row justify-center items-center gap-5'>
        <Image src={loader1} alt='loader' className='w-20 h-20 animate-spin' />
        <Image src={loader2} alt='loader' className='w-20 h-20 animate-spin' />
        <Image src={loader3} alt='loader' className='w-20 h-20 animate-spin' />
    </div>
  )
}

export default Loader