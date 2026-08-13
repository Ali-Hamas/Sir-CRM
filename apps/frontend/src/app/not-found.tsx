'use client';

import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 px-6 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
        <FileQuestion size={32} />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        404 - Page Not Found
      </h1>
      <p className="mt-3 text-base text-gray-500 dark:text-zinc-400 max-w-md">
        Sorry, the page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-md transition-all"
        >
          <Home size={16} />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
