'use client';

import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { role, isLoading, isAuthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (role === 'admin') {
        router.push('/dashboard/admin');
      } else if (role === 'tutor') {
        router.push('/dashboard/tutor');
      } else {
        router.push('/dashboard/student');
      }
    }
  }, [role, isLoading, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Redirecting to your portal...</p>
      </div>
    </div>
  );
}
