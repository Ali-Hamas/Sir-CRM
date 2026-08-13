'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthStore } from '../store/auth.store';
import { apiFetch } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ isLoading: true });

const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const userData = await apiFetch('/auth/me');
        if (cancelled) return;
        setUser(userData);

        // If authenticated and on a public auth page, redirect to root (which checks for orgs)
        if (PUBLIC_ROUTES.includes(pathname)) {
          router.replace('/');
        }
      } catch (err) {
        if (cancelled) return;
        setUser(null);
        // If not authenticated and on a protected route, redirect to login
        if (!PUBLIC_ROUTES.includes(pathname)) {
          router.replace('/auth/login');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    checkAuth();

    return () => { cancelled = true; };
  }, []); // Run once on mount only

  // Prevent flicker for protected routes
  if (isLoading && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-zinc-400 animate-pulse">
            Verifying secure session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
