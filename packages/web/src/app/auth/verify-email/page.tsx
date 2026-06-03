'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';

export default function VerifyEmailPage() {
  const token = useSearchParams().get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    api.auth.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-8 pb-6">
          {status === 'loading' && (
            <div>
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          )}
          {status === 'success' && (
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl">✓</div>
              <h2 className="text-xl font-semibold">Email verified!</h2>
              <p className="mt-2 text-sm text-muted-foreground">Your account is now active.</p>
              <Link href="/auth/login" className="mt-4 inline-block rounded-md bg-primary px-6 py-2 text-sm text-primary-foreground hover:opacity-90">
                Go to sign in
              </Link>
            </div>
          )}
          {status === 'error' && (
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 text-3xl">✗</div>
              <h2 className="text-xl font-semibold">Verification failed</h2>
              <p className="mt-2 text-sm text-muted-foreground">This link may have expired. Please request a new one.</p>
              <Link href="/auth/login" className="mt-4 inline-block text-sm text-primary hover:underline">Back to sign in</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
