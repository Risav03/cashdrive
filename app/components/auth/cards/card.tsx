'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

export const AuthButton = () => {
    const {data:session} = useSession()

    if(session){
      redirect('/dashboard')
    }

  return (
      <Link 
        href="/auth/signin"
        className="button-primary bg-amber-50 text-accent px-8 font-bold text-xl py-2 mt-5"
      >
        GET STARTED
      </Link>
  )
}
