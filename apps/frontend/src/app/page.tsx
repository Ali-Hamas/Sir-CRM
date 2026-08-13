'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { isAdminRole } from '../lib/permissions';

export default function Home() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    async function redirectUser() {
      try {
        // Fetch profile to verify session and update auth store
        const currentUser = await apiFetch('/auth/me').catch(() => null);
        if (currentUser) {
          setUser(currentUser);
        }

        // Check if user has any organizations
        const orgs = await apiFetch('/organizations');
        if (Array.isArray(orgs) && orgs.length > 0) {
          const orgSlug = orgs[0].slug;
          if (currentUser && isAdminRole(currentUser.role)) {
            router.replace(`/${orgSlug}/admin`);
          } else {
            router.replace(`/${orgSlug}`);
          }
        } else {
          // No orgs — go to onboarding
          router.replace('/onboarding/organization');
        }
      } catch {
        // Not authenticated or error — go to login
        router.replace('/auth/login');
      }
    }
    redirectUser();
  }, [router, setUser]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
          Redirecting to workspace...
        </p>
      </div>
    </main>
  );
}
