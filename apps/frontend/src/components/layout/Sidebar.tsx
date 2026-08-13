'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Briefcase, CheckSquare,
  BookOpen, FileText, Bot, Network,
  Workflow, PieChart, Bell, Shield, Settings, FileCode, Sparkles, Brain, Wrench, Database, UserCheck, Cpu,
  ChevronLeft, ChevronRight, Activity, Building2, UserCircle, Zap, Target, CalendarCheck, FileSignature, ScrollText, FolderKanban, Clock, UsersRound, Layers, Radio, ShieldAlert
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { isAdminRole } from '@/lib/permissions';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  adminOnly?: boolean;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { name: 'Dashboard', href: '', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Business',
    items: [
      { name: 'CRM', href: '/crm', icon: Layers },
      { name: 'Projects', href: '/projects', icon: FolderKanban },
      { name: 'Knowledge', href: '/knowledge', icon: BookOpen },
      { name: 'Documents', href: '/documents', icon: FileText },
      { name: 'Workflows', href: '/workflows', icon: Workflow },
    ],
  },
  {
    title: 'AI',
    items: [
      { name: 'AI Workspace', href: '/ai/assistant', icon: Sparkles, badge: 'AI' },
      { name: 'Executive Dashboard', href: '/executive', icon: Activity },
      { name: 'Analytics', href: '/analytics', icon: PieChart },
    ],
  },
  {
    title: 'Administration',
    adminOnly: true,
    items: [
      { name: 'Admin Panel', href: '/admin', icon: Shield, adminOnly: true, badge: 'ADMIN' },
      { name: 'Users', href: '/users', icon: Users, adminOnly: true },
      { name: 'Teams', href: '/teams', icon: UsersRound, adminOnly: true },
      { name: 'Departments', href: '/departments', icon: Briefcase, adminOnly: true },
      { name: 'Roles', href: '/roles', icon: ShieldAlert, adminOnly: true },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Integrations', href: '/settings/integrations', icon: Cpu },
      { name: 'Communications', href: '/settings/communications', icon: Radio },
      { name: 'AI Settings', href: '/settings/ai', icon: Bot },
    ],
  },
];

export function Sidebar({ orgSlug, workspaceId }: { orgSlug: string; workspaceId?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminRole(user?.role);

  const basePath = `/${orgSlug}`;

  // Filter sections based on admin status
  const visibleSections = navSections
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-all duration-300 select-none z-20 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand & Organization Switcher Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-gray-200 dark:border-zinc-800/80">
        <Link href={`/${orgSlug}`} className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
            B
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-bold text-sm text-gray-900 dark:text-white tracking-tight block truncate">
                BlackDesk OS
              </span>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 block truncate font-mono uppercase tracking-wider">
                {workspaceId || orgSlug}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-hide">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">
                {section.title}
              </h4>
            )}
            {section.items.map((item) => {
              const href = `${basePath}${item.href}`;
              const isActive =
                pathname === href || (item.href !== '' && pathname.startsWith(href));

              return (
                <Link
                  key={item.name}
                  href={href}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 relative group',
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 font-semibold shadow-xs'
                      : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-900 hover:text-gray-900 dark:hover:text-zinc-100',
                    collapsed ? 'justify-center py-2' : 'justify-between'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-gray-400 dark:text-zinc-500 group-hover:text-gray-700 dark:group-hover:text-zinc-300'
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                      {item.badge}
                    </span>
                  )}

                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-full" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
