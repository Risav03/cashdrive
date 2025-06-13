'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import React from 'react'

export const DashboardCard = () => {
    const {data: session} = useSession()
  return (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard
          </h1>
          <p className="text-gray-600 mb-4">
            Welcome back, {session?.user?.name}!
          </p>
          <div className="space-x-4">
            <Link
              href="/"
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Back to Home
            </Link>
            <Link 
              href="/api/auth/signout"
              className="inline-block bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </div>
  )
}
