'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';

export function AppLayout({
  children,
  orgSlug,
  workspaceId,
}: {
  children: ReactNode;
  orgSlug: string;
  workspaceId?: string;
}) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (orgSlug) {
          router.push(`/${orgSlug}/ai/assistant`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orgSlug, router]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/80 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans antialiased relative">
      {/* 2026 Ambient Mesh Glow System */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-10 right-10 w-[500px] h-[500px] bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/10 dark:bg-blue-600/12 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none z-0" />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        orgSlug={orgSlug}
      />

      <Sidebar orgSlug={orgSlug} workspaceId={workspaceId} />

      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0 z-10">
        <Topbar onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
