'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

export const AuthButton = () => {
    const {data:session} = useSession()

    if(session)
      return (
        <Link 
          href="/dashboard"
          className="button-primary bg-white text-accent px-8 font-bold text-xl py-2 mt-5"
        >
          DASHBOARD
        </Link>
      )

      return (
          <Link 
            href="/auth/signin"
            className="button-primary bg-white text-accent px-8 font-bold text-xl py-2 mt-5"
          >
            GET STARTED
          </Link>
      )
}
