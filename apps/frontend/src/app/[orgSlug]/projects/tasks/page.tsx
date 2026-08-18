'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, CheckSquare, Calendar, Users, AlertTriangle,
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, LayoutGrid, List, Columns3, Clock
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
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  IN_REVIEW: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DONE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
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
  const searchParams = useSearchParams();
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
  const [projectId, setProjectId] = useState(searchParams.get('projectId') || '');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (status) p.set('status', status);
      if (priority) p.set('priority', priority);
      if (projectId) p.set('projectId', projectId);
      p.set('sortBy', sortBy);
      p.set('sortOrder', sortOrder);
      p.set('page', String(page));
      p.set('limit', '20');

      const data = await apiFetch(`/organizations/${orgSlug}/tasks?${p.toString()}`);
      setTasks(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">Tasks</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Manage and track project tasks, deadlines, and assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${orgSlug}/projects/tasks/kanban${projectId ? `?projectId=${projectId}` : ''}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-sm transition-colors"
          >
            <Columns3 size={16} /> Kanban View
          </Link>
          <Link
            href={`/${orgSlug}/projects/tasks/new${projectId ? `?projectId=${projectId}` : ''}`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Task
          </Link>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <Link
          href={`/${orgSlug}/projects`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Projects Overview
        </Link>
        <span
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-xs transition-colors"
        >
          Tasks List
        </span>
        <Link
          href={`/${orgSlug}/projects/tasks/kanban`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Kanban Board
        </Link>
        <Link
          href={`/${orgSlug}/projects/time-tracking`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Time Logs
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Tasks</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-zinc-100">{stats.total}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.byStatus?.IN_PROGRESS || 0}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.completed}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red-500" />
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Overdue</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">In Review</p>
            <p className="text-2xl font-bold mt-1 text-purple-600">{stats.byStatus?.IN_REVIEW || 0}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tasks by title, description, or labels..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm shadow-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shadow-sm ${
              showFilters || status || priority
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50'
            }`}
          >
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-xl p-4 bg-gray-50/70 dark:bg-zinc-900/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
              >
                {PRIORITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckSquare size={48} className="text-gray-300 dark:text-zinc-600 mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">No tasks found</h3>
            <p className="text-xs text-gray-500 mb-4 max-w-sm">Create tasks to track action items, assignees, and deadlines.</p>
            <Link
              href={`/${orgSlug}/projects/tasks/new${projectId ? `?projectId=${projectId}` : ''}`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-medium hover:bg-primary/90 shadow-sm"
            >
              <Plus size={15} /> Create Task
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('title')}>
                    <div className="flex items-center gap-1">Task / Project <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('priority')}>
                    <div className="flex items-center gap-1">Priority <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Assignees</th>
                  <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('dueDate')}>
                    <div className="flex items-center gap-1">Due Date <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
                  return (
                    <tr
                      key={task.id}
                      className="border-b border-gray-100 dark:border-zinc-800/80 last:border-0 hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/${orgSlug}/projects/tasks/${task.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900 dark:text-zinc-100 hover:text-primary transition-colors text-xs">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                            {task.project.projectCode}
                          </span>
                          <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{task.project.projectName}</span>
                          {task.milestone && <span className="text-[10px] text-primary/80 truncate max-w-[120px]">🎯 {task.milestone.title}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[task.status] || ''}`}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_COLORS[task.priority] || ''}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex -space-x-1">
                          {task.assignees.length > 0 ? (
                            task.assignees.slice(0, 3).map((a, idx) => (
                              <div
                                key={idx}
                                className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold border border-white dark:border-zinc-800"
                                title={`${a.user?.firstName || ''} ${a.user?.lastName || ''}`}
                              >
                                {a.user?.firstName?.[0] || 'U'}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-600 dark:text-zinc-400'}`}>
                          <Calendar size={12} />
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                          {isOverdue && <span className="text-[10px] font-bold">(Overdue)</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${orgSlug}/projects/time-tracking?taskId=${task.id}&projectId=${task.project.id}`}
                            className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600"
                            title="Log Time"
                          >
                            <Clock size={15} />
                          </Link>
                          <Link
                            href={`/${orgSlug}/projects/tasks/${task.id}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View &rarr;
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
            <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} tasks)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1 rounded-md border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1 rounded-md border disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
