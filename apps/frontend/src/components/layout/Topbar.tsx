'use client';

import { useTheme } from 'next-themes';
import { Bell, Search, Sun, Moon, LogOut, Sparkles, Command } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { getUserDisplayName } from '@/lib/permissions';
import { NotificationDropdown } from './NotificationDropdown';

export function Topbar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const orgSlug = (params?.orgSlug as string) || '';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api-proxy/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    logout();
    router.push('/auth/login');
  };

  const displayName = getUserDisplayName(user);
  const userInitials = (() => {
    if (displayName && displayName !== 'User') {
      const parts = displayName.split(' ').filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].substring(0, 2).toUpperCase();
      }
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'BD';
  })();

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-gray-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-30 select-none">
      {/* Left Context / Breadcrumbs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center text-xs font-semibold tracking-tight text-gray-500 dark:text-zinc-400">
          <span className="text-gray-900 dark:text-white font-bold">{orgSlug || 'Organization'}</span>
          <span className="mx-2 text-gray-300 dark:text-zinc-700">/</span>
          <span className="text-gray-600 dark:text-zinc-400 font-medium">Workspace</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* Search Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center text-xs text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 w-60 hover:bg-gray-200/80 dark:hover:bg-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 transition-all group"
        >
          <Search size={13} className="mr-2 text-gray-400 group-hover:text-primary transition-colors" />
          <span className="truncate">Search commands, pages...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1 font-mono text-[9px] font-semibold text-gray-500 dark:text-zinc-400 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        <button
          className="md:hidden p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          onClick={onOpenCommandPalette}
          title="Search"
        >
          <Search size={16} />
        </button>

        {/* Ask AI Direct Link Button */}
        {orgSlug && (
          <button
            onClick={() => router.push(`/${orgSlug}/ai/assistant`)}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20"
            title="Ask AI Assistant (⌘J)"
          >
            <Sparkles size={13} />
            <span>Ask AI</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        {orgSlug && <NotificationDropdown orgSlug={orgSlug} />}

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* User Menu Dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-sm hover:opacity-90 transition-opacity ring-2 ring-white dark:ring-zinc-900"
          >
            {userInitials}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl py-1 z-50 animate-fade-in">
              <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-zinc-800">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                  {user?.email}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase font-mono tracking-wider mt-0.5">
                  {user?.role || 'User'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
