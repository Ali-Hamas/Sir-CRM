'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import {
  Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, Bot,
  FolderKanban, ShieldCheck, Sparkles, ArrowRight, CheckCircle2, Zap
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setUser(response.user);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-zinc-950 text-white antialiased overflow-hidden select-none relative">
      {/* Ambient Mesh Glow Orbs */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-1/3 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-0 w-[450px] h-[450px] bg-blue-600/12 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none z-0" />

      {/* Left Column — Brand Showcase & Live Highlights */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-12 lg:p-16 relative z-10 border-r border-zinc-800/60 bg-gradient-to-br from-zinc-950/80 via-zinc-900/60 to-zinc-950/90 backdrop-blur-2xl">
        {/* Top Brand Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg glow-indigo">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                  Britsync
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  2026 Enterprise Edition
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">B2B Agency & Workspace Automation</p>
            </div>
          </div>

          <div className="space-y-3 pt-6 max-w-xl">
            <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
              The Operating System for Modern B2B Agencies & Workspaces
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Unified AI assistant, RAG document vault, client CRM pipelines, time tracking, and enterprise RBAC security in one seamless platform.
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-8 max-w-2xl">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-2 hover:border-indigo-500/40 transition-all">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit border border-indigo-500/20">
              <Bot size={18} />
            </div>
            <h4 className="text-xs font-bold text-white">AI Workspace RAG</h4>
            <p className="text-[11px] text-zinc-400 leading-normal">Contextual AI assistant for instant document query & proposal generation.</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-2 hover:border-purple-500/40 transition-all">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 w-fit border border-purple-500/20">
              <FolderKanban size={18} />
            </div>
            <h4 className="text-xs font-bold text-white">Unified CRM & Projects</h4>
            <p className="text-[11px] text-zinc-400 leading-normal">Seamless pipeline management, deal tracking, and team allocations.</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md space-y-2 hover:border-blue-500/40 transition-all">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 w-fit border border-blue-500/20">
              <ShieldCheck size={18} />
            </div>
            <h4 className="text-xs font-bold text-white">Enterprise RBAC</h4>
            <p className="text-[11px] text-zinc-400 leading-normal">Strict multi-tenant workspace isolation & permission management.</p>
          </div>
        </div>

        {/* Live Trust Metric Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800/80 max-w-2xl text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold text-zinc-200">10,000+ Teams Worldwide</span>
          </div>
          <span className="text-zinc-500">•</span>
          <span className="font-medium text-zinc-300">99.99% Uptime SLA Guarantee</span>
        </div>
      </div>

      {/* Right Column — Deluxe Form Card */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Badge */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg mx-auto mb-2 glow-indigo">
              B
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Britsync</h1>
            <p className="text-xs text-zinc-400 mt-1">Sign in to your enterprise workspace</p>
          </div>

          {/* Form Header */}
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">Welcome Back</h2>
            <p className="text-xs text-zinc-400">Enter your account credentials to access your workspace dashboard.</p>
          </div>

          {/* Deluxe Luminous Glass Form Card */}
          <div className="glow-border-2026 shadow-2xl">
            <div className="bg-zinc-900/90 backdrop-blur-3xl rounded-[1.45rem] p-7 space-y-5 border border-zinc-800/80">
              {error && (
                <div className="flex items-center gap-3 p-3.5 text-xs text-red-300 bg-red-950/50 border border-red-800/60 rounded-xl animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="admin@britsync.com"
                      className="block w-full pl-10 pr-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.email.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                      Password
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-10 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-400 mt-1 font-medium">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-950 text-primary focus:ring-primary/40"
                    />
                    <span>Remember my session</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold rounded-xl text-xs shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In to Workspace</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-3 border-t border-zinc-800/80">
                <p className="text-xs text-zinc-400">
                  New to Britsync?{' '}
                  <Link
                    href="/auth/register"
                    className="text-primary font-bold hover:underline ml-1"
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

