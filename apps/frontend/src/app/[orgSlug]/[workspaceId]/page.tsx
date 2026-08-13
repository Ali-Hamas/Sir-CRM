'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiFetch } from '@/lib/api';
import { getGreetingTime, getUserDisplayName, isAdminRole } from '@/lib/permissions';
import {
  Loader2, Users, Briefcase, FolderKanban, Bot, Clock,
  FileText, BookOpen, Layers, CheckSquare, Sparkles, ArrowRight,
  TrendingUp, Calendar, ShieldCheck, Zap, AlertCircle, Plus, CheckCircle2,
  Video, ExternalLink, Activity
} from 'lucide-react';
import Link from 'next/link';

interface KpiCardProps {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  color: string;
  badge?: string;
  trend?: string;
  loading?: boolean;
}

function KpiCard({ title, value, subtext, icon: Icon, color, badge, trend, loading }: KpiCardProps) {
  return (
    <div className="glass-card-premium p-5 relative overflow-hidden group hover:border-primary/40 transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform duration-200`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-7 w-20 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{value}</h3>
            {trend && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp size={12} /> {trend}
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
          <p className="text-[11px] text-gray-500 dark:text-zinc-400">{subtext}</p>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary dark:bg-primary/20 border border-primary/20">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceDashboardPage() {
  const params = useParams();
  const orgSlug = (params?.orgSlug as string) || '';
  const workspaceId = (params?.workspaceId as string) || '';

  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdminRole(user?.role);

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!orgSlug) return;
    setLoadingStats(true);

    Promise.all([
      apiFetch(`/organizations/${orgSlug}/team/members?limit=1`).catch(() => ({ total: 0 })),
      workspaceId
        ? apiFetch(`/organizations/${orgSlug}/workspaces/${workspaceId}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([membersData, wsData]) => {
        setMemberCount(membersData?.total ?? 0);
        if (wsData?.name) setWorkspaceName(wsData.name);
      })
      .finally(() => setLoadingStats(false));
  }, [orgSlug, workspaceId]);

  const displayName = getUserDisplayName(user);
  const greeting = getGreetingTime();

  const quickActions = [
    { label: 'Tasks Kanban', href: `/${orgSlug}/projects/tasks`, icon: CheckSquare, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50' },
    { label: 'Time Tracking', href: `/${orgSlug}/projects/time-tracking`, icon: Clock, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50' },
    { label: 'Document Vault', href: `/${orgSlug}/documents`, icon: FileText, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50' },
    { label: 'AI Assistant', href: `/${orgSlug}/ai/assistant`, icon: Bot, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50' },
  ];

  const mockTasks = [
    { id: '1', title: 'Review Q3 Enterprise Contract & Security SLA', priority: 'URGENT', due: 'Today', dept: 'Engineering', status: 'In Progress' },
    { id: '2', title: 'Finalize Workspace Department Allocations', priority: 'HIGH', due: 'Tomorrow', dept: 'Operations', status: 'Pending' },
    { id: '3', title: 'Update Client Onboarding Knowledge Article', priority: 'MEDIUM', due: 'Aug 18', dept: 'Product', status: 'Scheduled' },
  ];

  const mockMeetings = [
    { id: 'm1', title: 'Enterprise Architecture & Security Sync', time: '3:00 PM - 3:45 PM', attendees: ['SK', 'JD', 'AL'], link: '#' },
    { id: 'm2', title: 'Q3 Product Roadmap Review', time: '5:30 PM - 6:00 PM', attendees: ['SK', 'MS'], link: '#' },
  ];

  const mockProjects = [
    { name: 'Enterprise SaaS Rebrand', dept: 'Design & Product', progress: 85, health: 'ON TRACK', color: 'bg-indigo-600' },
    { name: 'AI Assistant RAG Integration', dept: 'AI Engineering', progress: 62, health: 'ON TRACK', color: 'bg-purple-600' },
    { name: 'Q3 Financial Operations Audit', dept: 'Finance', progress: 40, health: 'AT RISK', color: 'bg-amber-600' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative z-10">
      {/* 2026 Multi-Gradient Glowing Border Hero Banner */}
      <div className="glow-border-2026 shadow-2xl">
        <div className="relative overflow-hidden rounded-[1.45rem] bg-gradient-to-r from-zinc-900/95 via-indigo-950/90 to-zinc-950/95 p-6 lg:p-8 text-white backdrop-blur-3xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Operational · All Systems Normal
                </span>
                <span className="text-xs text-zinc-600">|</span>
                <span className="text-xs font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-2.5 py-0.5 rounded-md">
                  {workspaceName ? workspaceName : 'Default Workspace'}
                </span>
                <span className="text-xs text-zinc-600">|</span>
                <span className="text-[10px] font-bold text-zinc-400">2026 Enterprise Edition</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                {greeting}, {displayName}!
              </h1>
              <p className="text-xs lg:text-sm text-zinc-300 max-w-xl leading-relaxed">
                Here is your live enterprise workspace dashboard. Monitor real-time KPIs, active projects, upcoming syncs, and AI operations.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isAdmin && (
                <Link
                  href={`/${orgSlug}/admin`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-md transition-all shadow-lg hover:-translate-y-0.5"
                >
                  <ShieldCheck size={15} /> Admin Panel
                </Link>
              )}
              <Link
                href={`/${orgSlug}/ai/assistant`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-extrabold rounded-xl text-xs shadow-xl transition-all hover:-translate-y-0.5"
              >
                <Sparkles size={15} /> Launch AI Assistant
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Projects"
          value="12 Active"
          subtext="3 completing this week"
          icon={FolderKanban}
          color="bg-indigo-600"
          badge="Portfolio"
          trend="+18.4% MoM"
          loading={false}
        />
        <KpiCard
          title="Assigned Tasks"
          value="8 Pending"
          subtext="2 marked urgent"
          icon={CheckSquare}
          color="bg-blue-600"
          badge="Actionable"
          trend="2 Urgent"
          loading={false}
        />
        <KpiCard
          title="Scheduled Meetings"
          value="3 Today"
          subtext="Next meeting at 3:00 PM"
          icon={Calendar}
          color="bg-purple-600"
          badge="Sync Ready"
          trend="Next: 3:00 PM"
          loading={false}
        />
        <KpiCard
          title="Vault Storage"
          value="1.4 GB"
          subtext="64 documents stored"
          icon={FileText}
          color="bg-emerald-600"
          badge="Encrypted"
          trend="Secure RAG"
          loading={false}
        />
      </div>

      {/* Quick Action Cards Suite */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="glass-card-premium p-4 flex items-center gap-3.5 group hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform shadow-xs`}>
              <action.icon size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{action.label}</h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">Quick Launch →</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Tasks Widget */}
          <div className="glass-card-premium p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <CheckSquare size={18} className="text-primary" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">My Assigned Tasks</h3>
              </div>
              <Link href={`/${orgSlug}/projects/tasks`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View All Tasks <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-3">
              {mockTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/50 dark:bg-zinc-950/60 border border-gray-100 dark:border-zinc-800/80 hover:border-primary/40 transition-all shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-md border border-gray-300 dark:border-zinc-700 flex items-center justify-center text-transparent hover:text-primary hover:border-primary cursor-pointer transition-colors">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{t.title}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                          {t.dept}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Due {t.due} · {t.status}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                    t.priority === 'URGENT' ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60' :
                    t.priority === 'HIGH' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60' :
                    'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                  }`}>
                    {t.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Meetings Timeline Widget */}
          <div className="glass-card-premium p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-purple-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Upcoming Meetings & Syncs</h3>
              </div>
              <Link href={`/${orgSlug}/crm?tab=meetings`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Schedule Sync <Plus size={13} />
              </Link>
            </div>

            <div className="space-y-3">
              {mockMeetings.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/50 dark:bg-zinc-950/60 border border-gray-100 dark:border-zinc-800/80 hover:border-purple-500/40 transition-all shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <Video size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{m.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500">{m.time}</span>
                        <span className="text-[10px] text-gray-300 dark:text-zinc-700">•</span>
                        <div className="flex -space-x-1 overflow-hidden">
                          {m.attendees.map((att, idx) => (
                            <div key={idx} className="inline-block h-4 w-4 rounded-full bg-primary/20 text-primary border border-white dark:border-zinc-900 text-[8px] font-bold text-center leading-4">
                              {att}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors">
                    Join Call <ExternalLink size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Projects Portfolio Widget */}
          <div className="glass-card-premium p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FolderKanban size={18} className="text-indigo-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Active Projects Portfolio</h3>
              </div>
              <Link href={`/${orgSlug}/projects`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View Portfolio <ArrowRight size={13} />
              </Link>
            </div>

            <div className="space-y-4">
              {mockProjects.map((p) => (
                <div key={p.name} className="space-y-2 p-3.5 rounded-xl bg-white/50 dark:bg-zinc-950/40 border border-gray-100 dark:border-zinc-800/60 shadow-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-900 dark:text-white">{p.name}</span>
                    <span className="font-extrabold text-gray-700 dark:text-zinc-300">{p.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                    <div className={`h-full ${p.color} transition-all duration-500 rounded-full`} style={{ width: `${p.progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 dark:text-zinc-500">Department: {p.dept}</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      p.health === 'ON TRACK' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' :
                      'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                    }`}>
                      {p.health}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          {/* AI Workspace Command Hub Card */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 p-6 text-white relative overflow-hidden shadow-xl border border-white/20">
            <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
              <Bot size={72} strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white">
                  <Sparkles size={12} /> AI Command Hub
                </span>
                <span className="text-[9px] font-mono bg-black/30 px-2 py-0.5 rounded text-indigo-200">
                  Gemini 1.5 Pro
                </span>
              </div>
              <h3 className="font-extrabold text-lg">AI Workspace Assistant</h3>
              <p className="text-xs text-indigo-100 leading-relaxed">
                Generate draft proposals, query company documents via RAG, or summarize workspace updates instantly.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-xs font-semibold cursor-pointer hover:bg-white/30 transition-colors">Summarize Workspace</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-xs font-semibold cursor-pointer hover:bg-white/30 transition-colors">Draft Proposal</span>
                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-xs font-semibold cursor-pointer hover:bg-white/30 transition-colors">Query Document Vault</span>
              </div>
              <Link
                href={`/${orgSlug}/ai/assistant`}
                className="inline-flex items-center justify-center gap-2 w-full text-center bg-white text-indigo-950 hover:bg-zinc-100 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md mt-2"
              >
                <Bot size={15} /> Launch Assistant (⌘J)
              </Link>
            </div>
          </div>

          {/* Workspace Details */}
          <div className="glass-card-premium p-6 space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm pb-2 border-b border-gray-100 dark:border-zinc-800">
              Workspace Overview
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Active Members</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {loadingStats ? '—' : `${memberCount ?? 0} members`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Workspace</span>
                <span className="font-semibold text-gray-900 dark:text-white">{workspaceName ?? workspaceId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Organization</span>
                <span className="font-semibold text-gray-900 dark:text-white">{orgSlug}</span>
              </div>
            </div>
            {isAdmin && (
              <Link
                href={`/${orgSlug}/users`}
                className="block text-center text-xs text-primary font-semibold hover:underline pt-2 border-t border-gray-100 dark:border-zinc-800"
              >
                Manage Members & Roles →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


