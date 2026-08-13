'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

export default function OrgPage({ params }: { params: { orgSlug: string } }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function redirectToWorkspace() {
      try {
        let org: any = null;

        // Fetch all user's organizations
        const orgs = await apiFetch('/organizations').catch(() => []);
        if (cancelled) return;

        // Find the org matching this slug
        org = orgs?.find((o: any) => o.slug === params.orgSlug || o.id === params.orgSlug);

        // If not found in user orgs list, try direct slug fetch
        if (!org) {
          org = await apiFetch(`/organizations/${params.orgSlug}`).catch(() => null);
        }

        if (!org || cancelled) {
          console.error('Organization not found for slug:', params.orgSlug);
          router.replace(`/${params.orgSlug}/settings`);
          return;
        }

        // Fetch workspaces for this org
        const workspaces = await apiFetch(`/organizations/${org.id}/workspaces`);
        if (cancelled) return;

        if (workspaces && workspaces.length > 0) {
          router.replace(`/${params.orgSlug}/${workspaces[0].id}`);
        } else {
          router.replace(`/${params.orgSlug}/settings`);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load workspace:', err);
      }
    }

    redirectToWorkspace();
    return () => { cancelled = true; };
  }, [params.orgSlug, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">
          Loading workspace...
        </p>
      </div>
    </div>
  );
}
