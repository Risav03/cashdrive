import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]/route';
import Link from 'next/link';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Welcome to Our App
          </h1>
          
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
      </div>
    </div>
  );
}
