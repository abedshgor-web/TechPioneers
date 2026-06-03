'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api-client';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    await api.auth.forgotPassword(data.email).catch(() => null);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 text-2xl">✓</div>
            <h2 className="text-lg font-semibold">Check your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If this email is registered, you&apos;ll receive a password reset link shortly.
            </p>
            <Link href="/auth/login" className="mt-4 inline-block text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Enter your email and we&apos;ll send you a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} error={errors.email?.message} placeholder="john@acmecorp.com" />
            </div>
            <Button type="submit" className="w-full" loading={isSubmitting}>Send reset link</Button>
            <Link href="/auth/login" className="block text-center text-sm text-muted-foreground hover:underline">
              Back to sign in
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
