'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/lib/auth-store';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user, tenant } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome, {user?.firstName}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Workspace: <span className="font-medium text-foreground">{tenant?.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Contacts', count: 0, href: '/contacts', icon: '👥' },
            { label: 'Open Deals', count: 0, href: '/deals', icon: '💼' },
            { label: 'Tasks Due', count: 0, href: '/tasks', icon: '✅' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl">{item.icon}</div>
              <div className="mt-2 text-2xl font-bold">{item.count}</div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </a>
          ))}
        </div>

        <div className="mt-8 rounded-xl border bg-amber-50 border-amber-200 p-4">
          <p className="text-sm text-amber-800">
            <strong>🎯 Trial active</strong> — You have 14 days to explore all features.
            <a href="/billing" className="ml-2 underline">Upgrade now</a>
          </p>
        </div>
      </div>
    </div>
  );
}
