'use client';

import loadericon from '@/assets/loader_2.svg';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import FooterPattern from '../global/FooterPattern';

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
      const result = await signIn('credentials', {
        email,
        password,
        name,
        isRegistration: 'true',
        redirect: false,
      });

      if (result?.error) {
        setLoading(false);
        if (result.error.includes('already exists')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(result.error);
        }
      } else if (result?.ok) {
        router.push('/dashboard');
      } else {
        setLoading(false);
        setError('Something went wrong during registration');
      }
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    } 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8 bg-amber-100 p-8 border-2 border-black brutal-shadow-left reltive z-10">
        <div>
          <h2 className="heading-text-2 text-5xl font-anton text-center mb-3">
            SIGN UP
          </h2>
          <p className="mt-2 text-center text-lg font-freeman">
            Or{' '}
            <Link href="/auth/signin" className="text-amber-600 underline hover:text-black transition-all duration-300">
              sign in to your account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border-2 border-black p-4" role="alert">
              <span className="block font-freeman">{error}</span>
              {error.includes('already exists') && (
                <div className="mt-2">
                  <Link href="/auth/signin" className="text-black hover:text-white underline">
                    Click here to sign in
                  </Link>
                </div>
              )}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="font-freeman block mb-2">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label htmlFor="email" className="font-freeman block mb-2">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="font-freeman block mb-2">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 bg-white border-2 border-black font-freeman focus:outline-none focus:border-primary brutal-shadow-center"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="button-primary bg-primary w-full py-2 px-4 font-freeman text-xl"
            >
              {loading ? <span className='w-full flex gap-2 items-center justify-center'><Image src={loadericon} alt="loader" className='w-6 h-6 animate-spin' />Creating your dashboard</span> : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
      <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
    </div>
  );
} 