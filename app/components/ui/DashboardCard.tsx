'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import React from 'react'
import { Background } from '../ui/Background'

export const DashboardCard = () => {
    const {data: session} = useSession()
  return (
    <div className="w-full">
      <Background />
      <div className="w-full bg-white/5 glass rounded-lg shadow-xl shadow-black/50 px-6 py-4 fixed top-0 left-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <p className="text-lg text-white/60">
            Welcome, <span className="text-purple-400 font-semibold">{session?.user?.name}</span>
          </p>
          <div className="flex space-x-4">
            <Link
              href="/"
              className="px-6 py-2 text-sm font-bold rounded-full cursor-pointer text-white bg-black/40 hover:bg-black/30 hover:shadow-lg shadow-black/20 hover:translate-y-[-2px] duration-200 glass"
            >
              Home
            </Link>
            <Link 
              href="/api/auth/signout"
              className="px-6 py-2 text-sm font-bold rounded-full cursor-pointer text-white bg-black/40 hover:bg-black/30 hover:shadow-lg shadow-black/20 hover:translate-y-[-2px] duration-200 glass"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
