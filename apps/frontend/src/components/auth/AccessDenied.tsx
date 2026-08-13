'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  orgSlug?: string;
}

export function AccessDenied({
  title = 'Access Denied',
  message = 'You do not have administrative privileges to access this area. If you believe this is an error, please contact your organization administrator.',
  orgSlug,
}: AccessDeniedProps) {
  const targetHref = orgSlug ? `/${orgSlug}` : '/';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
          <ShieldAlert size={36} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs font-mono text-red-500 uppercase tracking-widest">
            HTTP 403 Forbidden
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-400 leading-relaxed pt-2">
            {message}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={targetHref}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-xl text-sm hover:bg-primary/95 shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <LayoutDashboard size={16} />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
