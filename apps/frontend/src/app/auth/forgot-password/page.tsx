'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import { Mail, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-6">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
            We will send you instructions to reset your password
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4 text-center py-4 animate-in zoom-in-95 duration-200">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Check your email</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                We have sent password recovery instructions to your email address.
              </p>
              <div className="pt-4">
                <Link
                  href="/auth/login"
                  className="inline-flex justify-center w-full py-2.5 px-4 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm transition-all"
                >
                  Back to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="name@company.com"
                    className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex justify-center items-center py-2.5 px-4 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-lg shadow-primary/20 transition-all hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send Instructions'
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="text-center pt-2 border-t border-gray-100 dark:border-zinc-800/80">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Remember your password?{' '}
                <Link
                  href="/auth/login"
                  className="text-primary font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
