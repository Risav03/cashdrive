'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const DashboardCard = () => {
  const { data: session } = useSession()
  const pathname = usePathname()
  
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
            className="button-primary bg-red-400 px-4 py-2 mt-4 sm:mt-0 duration-100"
          >
            Sign Out
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            href="/marketplace"
            className={`border-2 border-black button-primary transition-all p-4 text-center font-freeman ${
              pathname === '/marketplace' ? 'bg-primary button-primary-pressed' : 'bg-white'
            }`}
          >
            Marketplace
          </Link>
          <Link
            href="/transactions"
            className={`border-2 border-black button-primary transition-all p-4 text-center font-freeman ${
              pathname === '/transactions' ? 'bg-primary button-primary-pressed' : 'bg-white'
            }`}
          >
            Transactions
          </Link>
          <Link
            href="/shared-links"
            className={`border-2 border-black button-primary transition-all p-4 text-center font-freeman ${
              pathname === '/shared-links' ? 'bg-primary button-primary-pressed' : 'bg-white'
            }`}
          >
            Shared Links
          </Link>

          <Link
            href="/affiliates"
            className={`border-2 border-black button-primary transition-all p-4 text-center font-freeman ${
              pathname === '/affiliates' ? 'bg-primary button-primary-pressed' : 'bg-white'
            }`}
          >
            Affiliates
          </Link>
          <Link
            href="/dashboard"
            className={`border-2 border-black button-primary transition-all p-4 text-center font-freeman ${
              pathname === '/dashboard' ? 'bg-primary button-primary-pressed' : 'bg-white'
            }`}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
