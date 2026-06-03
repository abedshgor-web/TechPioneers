'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { api, ApiError } from '@/lib/api-client';

const schema = z.object({
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await api.auth.resetPassword(token, data.password);
      router.push('/auth/login?reset=1');
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Something went wrong.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>Choose a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...register('password')} error={errors.password?.message} />
            </div>
            {serverError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>}
            <Button type="submit" className="w-full" loading={isSubmitting}>Reset password</Button>
            <Link href="/auth/login" className="block text-center text-sm text-muted-foreground hover:underline">Back to sign in</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
