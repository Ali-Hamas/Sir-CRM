'use client';

import { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { isAdminRole } from '@/lib/permissions';
import { AccessDenied } from './AccessDenied';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const user = useAuthStore((state) => state.user);
  const { isLoading } = useAuth();
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
          Verifying administrative credentials...
        </p>
      </div>
    );
  }

  if (!user || !isAdminRole(user.role)) {
    return <AccessDenied orgSlug={orgSlug} />;
  }

  return <>{children}</>;
}
