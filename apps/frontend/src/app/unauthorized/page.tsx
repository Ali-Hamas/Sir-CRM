'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-6 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        403 - Access Denied
      </h1>
      <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400 max-w-md">
        You do not have the required permissions to access this page or resource. Contact your organization administrator if you believe this is an error.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-md transition-all"
        >
          <ArrowLeft size={16} />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
