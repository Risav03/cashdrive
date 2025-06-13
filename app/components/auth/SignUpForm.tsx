'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Background } from '../ui/Background';
import { Input } from '../ui/Input';

export default function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'User already exists') {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          throw new Error(data.error || 'Something went wrong');
        }
      } else {
        // Redirect to sign in page after successful registration
        router.push('/auth/signin?registered=true');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Background />
      <div className="max-w-md bg-white/5 w-full space-y-8 glass rounded-2xl px-6 py-12">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white/80">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-purple-600 hover:text-purple-500">
              Sign in
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
              {error.includes('already exists') && (
                <div className="mt-2">
                  <Link href="/auth/signin" className="text-red-700 underline">
                    Click here to sign in
                  </Link>
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            <Input
              id="name"
              name="name"
              type="text"
              label="Full name"
              required
              className="glass"
              placeholder="Full name"
            />
            
            <Input
              id="email"
              name="email"
              type="email"
              label="Email address"
              required
              className="glass"
              placeholder="Email address"
            />
            
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              required
              className="glass"
              placeholder="Password"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className=" group glass relative w-full flex justify-center py-2 px-4 text-md font-bold rounded-full cursor-pointer text-white bg-black/40 hover:bg-black/30 hover:shadow-lg shadow-black/20 hover:translate-y-[-2px] duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 