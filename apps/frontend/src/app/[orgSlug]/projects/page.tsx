'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, FolderKanban, Calendar, Building2, Users,
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, AlertTriangle, Clock
} from 'lucide-react';

interface Project {
  id: string;
  projectName: string;
  projectCode: string;
  description: string | null;
  status: string;
  priority: string;
  budget: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  company: { id: string; name: string } | null;
  client: { id: string; companyName: string } | null;
  contract: { id: string; title: string } | null;
  projectManager: { id: string; firstName: string; lastName: string } | null;
  _count: { members: number; phases: number; milestones: number };
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ON_HOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  IN_PROGRESS: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function formatBudget(value: number | null, currency: string) {
  if (!value) return '-';
  return `${currency} ${value.toLocaleString()}`;
}

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '15');

      const data = await apiFetch(`/organizations/${orgSlug}/projects?${params.toString()}`);
      setProjects(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, status, priority, sortBy, sortOrder, page]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/projects/stats`).then(setStats).catch(() => {});
  }, [orgSlug]);

  const toggleSort = (field: string) => {
    setSortBy(field);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage projects and track progress</p>
        </div>
        <Link href={`/${orgSlug}/projects/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus size={16} /> New Project
        </Link>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-3">
        <Link
          href={`/${orgSlug}/projects`}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-xs transition-colors"
        >
          Projects Overview
        </Link>
        <Link
          href={`/${orgSlug}/projects/tasks`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Tasks & Kanban
        </Link>
        <Link
          href={`/${orgSlug}/projects/time-tracking`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Time Logs
        </Link>
        <Link
          href={`/${orgSlug}/projects/resources`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Resource Allocation
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Total Projects</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">In Progress</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.byStatus?.IN_PROGRESS || 0}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Completed</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.completed}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <p className="text-xs text-gray-500 font-medium">On Hold</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.byStatus?.ON_HOLD || 0}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search projects..." className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters || status || priority ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}>
            <Filter size={16} /> Filters
          </button>
          <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); setPage(1); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
            <option value="createdAt-desc">Newest</option>
            <option value="createdAt-asc">Oldest</option>
            <option value="progress-desc">Most Progress</option>
            <option value="priority-desc">Priority</option>
          </select>
        </div>
      </div>

      {showFilters && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4 bg-gray-50 dark:bg-zinc-900/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Projects Table */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderKanban size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium mb-1">No projects found</h3>
            <p className="text-sm text-gray-500 mb-4">{search || status || priority ? 'Try adjusting your filters' : 'Create your first project'}</p>
            <Link href={`/${orgSlug}/projects/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> New Project
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Company</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 font-medium text-gray-500">Status <ArrowUpDown size={14} /></button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Priority</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Progress</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Manager</th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 cursor-pointer" onClick={() => router.push(`/${orgSlug}/projects/${p.id}`)}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{p.projectName}</p>
                      <p className="text-xs text-gray-500">{p.projectCode}</p>
                    </td>
                    <td className="px-6 py-4">
                      {p.company ? <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400"><Building2 size={14} />{p.company.name}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || ''}`}>{p.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[p.priority] || ''}`}>{p.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">
                      {p.projectManager ? `${p.projectManager.firstName} ${p.projectManager.lastName}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/${orgSlug}/projects/${p.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-primary text-sm">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-md border disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
