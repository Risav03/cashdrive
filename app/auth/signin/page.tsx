'use client';

import SignInForm from '@/app/components/auth/SignInForm';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  return (
    <div>
      {registered && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50">
          <p>Registration successful! Please sign in with your new account.</p>
        </div>
      )}
      <SignInForm />
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}