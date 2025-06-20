'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import FooterPattern from '@/app/components/global/FooterPattern';
import Loader from '@/app/components/global/Loader';

export default function SignOut() {
  useEffect(() => {
    signOut({ 
      callbackUrl: '/',
      redirect: true
    });
  }, []);

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center p-8 rounded-lg">
          <h2 className="heading-text-2 text-6xl font-anton mb-8">
            SIGNING OUT
          </h2>
          <div className="mt-12 flex justify-center">
          <div className="text-center">
            <div className='flex justify-center items-center mt-10'>
              <Loader />
            </div>
          </div>
          </div>
          <p className="font-freeman text-xl mt-8">
            Redirecting you to the homepage...
          </p>
        </div>
      </main>
      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
} 