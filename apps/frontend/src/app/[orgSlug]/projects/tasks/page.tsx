'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, CheckSquare, Calendar, Users, AlertTriangle,
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, LayoutGrid, List, Columns3
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  labels: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  completedAt: string | null;
  project: { id: string; projectName: string; projectCode: string };
  milestone: { id: string; title: string } | null;
  reporter: { id: string; firstName: string; lastName: string };
  assignees: { user: { id: string; firstName: string; lastName: string } }[];
  _count: { comments: number; attachments: number; checklists: number };
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'BLOCKED', label: 'Blocked' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  TODO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  IN_REVIEW: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function TasksPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [tasks, setTasks] = useState<Task[]>([]);
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
  const [projects, setProjects] = useState<{ id: string; projectName: string }[]>([]);
  const [projectId, setProjectId] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (projectId) params.set('projectId', projectId);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', String(page));
      params.set('limit', '20');

      const data = await apiFetch(`/organizations/${orgSlug}/tasks?${params.toString()}`);
      setTasks(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, status, priority, projectId, sortBy, sortOrder, page]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/tasks/stats${projectId ? `?projectId=${projectId}` : ''}`).then(setStats).catch(() => {});
    apiFetch(`/organizations/${orgSlug}/projects?limit=200`).then((data) => {
      setProjects(data.items?.map((p: any) => ({ id: p.id, projectName: p.projectName })) || []);
    }).catch(() => {});
  }, [orgSlug, projectId]);

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
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and track project tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${orgSlug}/projects/tasks/kanban${projectId ? `?projectId=${projectId}` : ''}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800">
            <Columns3 size={16} /> Kanban
          </Link>
          <Link href={`/${orgSlug}/projects/tasks/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={16} /> New Task
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Total Tasks</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">In Progress</p>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.byStatus?.IN_PROGRESS || 0}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Completed</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.completed}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" />
              <p className="text-xs text-gray-500 font-medium">Overdue</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Critical</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.byPriority?.CRITICAL || 0}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search tasks..." className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <div className="flex gap-2">
          <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPage(1); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
            <option value="">All Projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters || status || priority ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}>
            <Filter size={16} /> Filters
          </button>
          <select value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [f, o] = e.target.value.split('-'); setSortBy(f); setSortOrder(o); setPage(1); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
            <option value="createdAt-desc">Newest</option>
            <option value="createdAt-asc">Oldest</option>
            <option value="priority-desc">Priority</option>
            <option value="dueDate-asc">Due Date</option>
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

      {/* Tasks Table */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckSquare size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium mb-1">No tasks found</h3>
            <p className="text-sm text-gray-500 mb-4">{search || status || priority ? 'Try adjusting your filters' : 'Create your first task'}</p>
            <Link href={`/${orgSlug}/projects/tasks/new`} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> New Task
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-500">Task</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 font-medium text-gray-500">Status <ArrowUpDown size={14} /></button>
                  </th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('priority')} className="inline-flex items-center gap-1 font-medium text-gray-500">Priority <ArrowUpDown size={14} /></button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500">Assignees</th>
                  <th className="px-6 py-3">
                    <button onClick={() => toggleSort('dueDate')} className="inline-flex items-center gap-1 font-medium text-gray-500">Due Date <ArrowUpDown size={14} /></button>
                  </th>
                  <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id} className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30 cursor-pointer" onClick={() => router.push(`/${orgSlug}/projects/tasks/${t.id}`)}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {t.labels && <span className="text-xs text-gray-500 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{t.labels}</span>}
                        {t.milestone && <span className="text-xs text-gray-500">Milestone: {t.milestone.title}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-500">{t.project.projectCode}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || ''}`}>{t.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[t.priority] || ''}`}>{t.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex -space-x-1">
                        {t.assignees.slice(0, 3).map((a) => (
                          <div key={a.user.id} className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold border border-white dark:border-zinc-900" title={`${a.user.firstName} ${a.user.lastName}`}>{a.user.firstName?.[0]}{a.user.lastName?.[0]}</div>
                        ))}
                        {t.assignees.length > 3 && <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-zinc-700 text-gray-600 flex items-center justify-center text-[10px] font-bold border border-white dark:border-zinc-900">+{t.assignees.length - 3}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {t.dueDate ? (
                        <span className={`flex items-center gap-1 ${new Date(t.dueDate) < new Date() && t.status !== 'DONE' ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                          <Calendar size={12} />{new Date(t.dueDate).toLocaleDateString()}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/${orgSlug}/projects/tasks/${t.id}/edit`} onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-primary text-sm">Edit</Link>
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
