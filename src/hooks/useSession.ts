'use client';

import { useSession as useNextAuthSession } from 'next-auth/react';

export const useSession = () => {
  const { data: session, status } = useNextAuthSession();

  return {
    user: session?.user,
    role: session?.user?.role,
    userId: session?.user?.id,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    status,
  };
};
