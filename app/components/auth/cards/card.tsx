'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import React from 'react'

export const Card = () => {
    const {data:session} = useSession()
  return (
    <div>
        {session ? (
            <div className="space-y-4">
              <p className="text-xl text-gray-600">
                Signed in as {session.user.email}
              </p>
              <div className="space-x-4">
                <Link
                  href="/dashboard"
                  className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                >
                  Go to Dashboard
                </Link>
                <Link 
                  href="/api/auth/signout"
                  className="inline-block bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                >
                  Sign Out
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xl text-gray-600">
                Please sign in to continue
              </p>
              <div className="space-x-4">
                <Link 
                  href="/auth/signin"
                  className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup"
                  className="inline-block bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
    </div>
  )
}
