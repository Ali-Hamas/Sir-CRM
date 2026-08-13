'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default function IntegrationsRootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectIntegrations() {
      try {
        const orgs = await apiFetch('/organizations');
        if (Array.isArray(orgs) && orgs.length > 0) {
          router.replace(`/${orgs[0].slug}/settings/integrations`);
        } else {
          router.replace('/onboarding/organization');
        }
      } catch {
        router.replace('/auth/login');
      }
    }
    redirectIntegrations();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
          Directing to Integration Hub...
        </p>
      </div>
    </div>
  );
}
