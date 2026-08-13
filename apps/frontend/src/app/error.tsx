'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled platform error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-6 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-6">
        <AlertTriangle size={32} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-gray-500 dark:text-zinc-400 max-w-md">
        An unexpected error occurred while processing your request. Please try again.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-md transition-all"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    </div>
  );
}
