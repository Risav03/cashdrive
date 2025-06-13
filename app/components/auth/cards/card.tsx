'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import React from 'react'

export const Card = () => {
    const {data:session} = useSession()
    
    return (
        <div className="flex flex-col items-start space-y-4 relative z-10">
            {session ? (
                <div className="space-y-4 w-full">
                    <p className="text-xl text-white/80">
                        Signed in as <span className="text-purple-400">{session.user.email}</span>
                    </p>
                    <div className="flex space-x-4">
                        <Link
                            href="/dashboard"
                            className="bg-purple-500/10 glass px-8 py-2 text-lg rounded-full hover:scale-105 transition-all duration-200 cursor-pointer text-white/80 font-bold"
                        >
                            Dashboard
                        </Link>
                        <Link 
                            href="/api/auth/signout"
                            className="bg-purple-500/10 glass px-8 py-2 text-lg rounded-full hover:scale-105 transition-all duration-200 cursor-pointer text-white/80 font-bold"
                        >
                            Sign Out
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="space-y-4 w-fit">
                    <div className="flex justify-center">
                        <Link 
                            href="/auth/signin"
                            className="bg-purple-500/10 glass px-8 py-2 text-lg rounded-full hover:scale-105 transition-all duration-200 cursor-pointer text-white/80 font-bold"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
