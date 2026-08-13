'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AdminGuard } from '@/components/auth/AdminGuard';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { getGreetingTime, getUserDisplayName } from '@/lib/permissions';
import {
  Shield, Users, Briefcase, Settings, PieChart, Activity,
  Radio, Sparkles, Wrench, UserCheck, Database, Cpu,
  Layers, FolderKanban, BookOpen, FileText, Workflow,
  Plus, ChevronRight, CheckCircle2, UserPlus, Sliders, ShieldCheck
} from 'lucide-react';

interface StatMetric {
  users: number;
  teams: number;
  departments: number;
  roles: number;
}

export default function AdminPanelPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';
  const user = useAuthStore((state) => state.user);

  const [metrics, setMetrics] = useState<StatMetric>({ users: 0, teams: 0, departments: 0, roles: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    if (!orgSlug) return;
    setLoadingMetrics(true);

    Promise.all([
      apiFetch(`/organizations/${orgSlug}/team/members?limit=1`).catch(() => ({ total: 0 })),
      apiFetch(`/organizations/${orgSlug}/team/teams`).catch(() => []),
      apiFetch(`/organizations/${orgSlug}/departments`).catch(() => []),
      apiFetch(`/organizations/${orgSlug}/roles`).catch(() => []),
    ])
      .then(([membersData, teamsData, deptsData, rolesData]) => {
        setMetrics({
          users: membersData?.total ?? 0,
          teams: Array.isArray(teamsData) ? teamsData.length : 0,
          departments: Array.isArray(deptsData) ? deptsData.length : 0,
          roles: Array.isArray(rolesData) ? rolesData.length : 0,
        });
      })
      .finally(() => setLoadingMetrics(false));
  }, [orgSlug]);

  const greeting = getGreetingTime();
  const displayName = getUserDisplayName(user);

  const adminSections = [
    {
      title: 'Administration',
      badge: 'Core Admin',
      description: 'Manage users, teams, security roles, and organization policies',
      items: [
        { name: 'User Management', href: `/${orgSlug}/users`, icon: Users, desc: 'View, invite, activate, deactivate & change roles' },
        { name: 'Teams', href: `/${orgSlug}/teams`, icon: Users, desc: 'Organize members into functional teams' },
        { name: 'Departments', href: `/${orgSlug}/departments`, icon: Briefcase, desc: 'Structure organization departments & leadership' },
        { name: 'Roles & Permissions', href: `/${orgSlug}/roles`, icon: ShieldCheck, desc: 'Configure granular custom role permission matrix' },
        { name: 'Organization Settings', href: `/${orgSlug}/settings`, icon: Settings, desc: 'Branding, timezone, currency & general profile' },
        { name: 'Communications Settings', href: `/${orgSlug}/settings/communications`, icon: Radio, desc: 'Configure SMS, Email & Webhook providers' },
      ],
    },
    {
      title: 'System & Intelligence',
      badge: 'Platform',
      description: 'Enterprise analytics, AI orchestration, integrations, and automation engine',
      items: [
        { name: 'Enterprise Analytics', href: `/${orgSlug}/analytics`, icon: PieChart, desc: 'Platform-wide operational & performance metrics' },
        { name: 'Executive AI Dashboard', href: `/${orgSlug}/executive`, icon: Activity, desc: 'Executive overview & AI intelligence summaries' },
        { name: 'AI Settings', href: `/${orgSlug}/settings/ai`, icon: Sparkles, desc: 'Configure LLM providers, model selection & API keys' },
        { name: 'AI Tools Engine', href: `/${orgSlug}/ai/tools`, icon: Wrench, desc: 'Manage custom AI function calling & capabilities' },
        { name: 'AI Autonomous Agents', href: `/${orgSlug}/ai/agents`, icon: UserCheck, desc: 'Deploy & monitor autonomous AI agent execution' },
        { name: 'RAG Knowledge Engine', href: `/${orgSlug}/ai/rag`, icon: Database, desc: 'Vector storage, embeddings & Retrieval Augmented Generation' },
        { name: 'Business Process Automation', href: `/${orgSlug}/ai/business-processes`, icon: Cpu, desc: 'Automate approvals & business process rules' },
        { name: 'System Audit Activity', href: `/${orgSlug}/activity`, icon: Activity, desc: 'Real-time audit log of user & admin actions' },
      ],
    },
    {
      title: 'Business Modules',
      badge: 'Operations',
      description: 'Admin overview access to enterprise business applications',
      items: [
        { name: 'Enterprise CRM Hub', href: `/${orgSlug}/crm`, icon: Layers, desc: 'Manage companies, contacts, leads, deals & contracts' },
        { name: 'Projects & Tasks', href: `/${orgSlug}/projects`, icon: FolderKanban, desc: 'Monitor project portfolios, task assignees & timelines' },
        { name: 'Knowledge Base', href: `/${orgSlug}/knowledge`, icon: BookOpen, desc: 'Manage central wiki articles & documentation' },
        { name: 'Document Vault', href: `/${orgSlug}/documents`, icon: FileText, desc: 'Enterprise file storage & document permissions' },
        { name: 'Workflow Automation', href: `/${orgSlug}/workflows`, icon: Workflow, desc: 'Custom workflow triggers & background automation' },
      ],
    },
  ];

  return (
    <AdminGuard>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 text-white p-6 lg:p-8 shadow-2xl">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                  <Shield size={13} /> Admin Panel
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {user?.role || 'ADMIN'}
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                {greeting}, {displayName}!
              </h1>
              <p className="text-sm text-zinc-400 max-w-xl">
                Welcome to the central BlackDesk OS Administration Control Panel. Manage users, security roles, system configurations, and enterprise operations.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${orgSlug}/users`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-xs shadow-lg transition-all hover:-translate-y-0.5"
              >
                <UserPlus size={15} /> Invite Users
              </Link>
              <Link
                href={`/${orgSlug}/roles`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-xs border border-zinc-700 transition-all hover:-translate-y-0.5"
              >
                <Sliders size={15} /> Role Permissions
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-zinc-800/80">
            <div className="bg-zinc-800/50 backdrop-blur border border-zinc-700/50 rounded-xl p-4">
              <p className="text-xs text-zinc-400 font-medium">Total Organization Users</p>
              <p className="text-2xl font-bold text-white mt-1">
                {loadingMetrics ? '...' : metrics.users}
              </p>
            </div>
            <div className="bg-zinc-800/50 backdrop-blur border border-zinc-700/50 rounded-xl p-4">
              <p className="text-xs text-zinc-400 font-medium">Active Teams</p>
              <p className="text-2xl font-bold text-white mt-1">
                {loadingMetrics ? '...' : metrics.teams}
              </p>
            </div>
            <div className="bg-zinc-800/50 backdrop-blur border border-zinc-700/50 rounded-xl p-4">
              <p className="text-xs text-zinc-400 font-medium">Departments</p>
              <p className="text-2xl font-bold text-white mt-1">
                {loadingMetrics ? '...' : metrics.departments}
              </p>
            </div>
            <div className="bg-zinc-800/50 backdrop-blur border border-zinc-700/50 rounded-xl p-4">
              <p className="text-xs text-zinc-400 font-medium">Custom Roles</p>
              <p className="text-2xl font-bold text-white mt-1">
                {loadingMetrics ? '...' : metrics.roles}
              </p>
            </div>
          </div>
        </div>

        {/* Categorized Admin Modules */}
        <div className="space-y-8">
          {adminSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      {section.title}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                      {section.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="group p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-primary/50 dark:hover:border-primary/50 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {item.name}
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
