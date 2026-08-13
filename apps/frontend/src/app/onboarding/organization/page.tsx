'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { AlertCircle, Loader2 } from 'lucide-react';

const orgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  legalName: z.string().optional(),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  industry: z.string().optional(),
  companySize: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

export default function CreateOrganizationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
  });

  const onSubmit = async (data: OrgFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/organizations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      router.replace(`/${response.slug}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Create your Organization
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
            Let's get your business set up on Blackdesk OS
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Company Name</label>
                <input
                  {...register('name')}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Acme Corp"
                  disabled={isLoading}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Workspace URL (Slug)</label>
                <div className="flex items-center mt-1">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-700 px-3 py-2 text-sm text-gray-500">
                    blackdesk.com/
                  </span>
                  <input
                    {...register('slug')}
                    className="block w-full min-w-0 flex-1 rounded-none rounded-r-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="acme-corp"
                    disabled={isLoading}
                  />
                </div>
                {errors.slug && <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Industry</label>
                <select
                  {...register('industry')}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isLoading}
                >
                  <option value="">Select industry</option>
                  <option value="tech">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Company Size</label>
                <select
                  {...register('companySize')}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isLoading}
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="201+">201+</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 flex justify-center py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-zinc-300 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-800"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Create Organization'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
