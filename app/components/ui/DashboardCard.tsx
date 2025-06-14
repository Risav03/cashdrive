'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Link
              href="/marketplace"
              className="flex items-center justify-center bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Marketplace
            </Link>
            <Link
              href="/transactions"
              className="flex items-center justify-center bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 transition-colors"
            >
              Transactions
            </Link>
            <Link
              href="/shared-links"
              className="flex items-center justify-center bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 transition-colors"
            >
              Shared Links
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center bg-gray-600 text-white px-4 py-3 rounded-md hover:bg-gray-700 transition-colors"
            >
              Home
            </Link>
          </div>
          <div className="flex justify-end">
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
