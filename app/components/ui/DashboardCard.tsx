'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export const DashboardCard = () => {
  const {data: session} = useSession()
  
  return (
    <div className="max-w-4xl mx-auto mb-12">
      <div className="bg-amber-100 border-2 border-black brutal-shadow-left p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <p className="font-freeman text-xl mb-1">
              Welcome back,
            </p>
            <h1 className="font-anton text-3xl">
              {session?.user?.name}!
            </h1>
          </div>
          <Link 
            href="/api/auth/signout"
            className="button-primary bg-red-100 px-4 py-2 mt-4 sm:mt-0"
          >
            Sign Out
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/marketplace"
            className="bg-[#FFD000] border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all p-4 text-center font-freeman"
          >
            Marketplace
          </Link>
          <Link
            href="/transactions"
            className="bg-white border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all p-4 text-center font-freeman"
          >
            Transactions
          </Link>
          <Link
            href="/shared-links"
            className="bg-white border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all p-4 text-center font-freeman"
          >
            Shared Links
          </Link>
          <Link
            href="/"
            className="bg-white border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all p-4 text-center font-freeman"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
