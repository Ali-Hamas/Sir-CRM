'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, Clock, Play, Square, Calendar, Filter,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Timer,
  AlertTriangle, RefreshCw, X, Check, Trash2
} from 'lucide-react';

interface TimeEntry {
  id: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  billable: boolean;
  status: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  project: { id: string; projectName: string; projectCode: string } | null;
  task: { id: string; title: string } | null;
  createdAt: string;
}

interface RunningTimer {
  id: string;
  description: string | null;
  startTime: string;
  project: { id: string; projectName: string; projectCode?: string } | null;
  task: { id: string; title: string } | null;
}

interface TimesheetEntry {
  id: string;
  description: string | null;
  date: string;
  duration: number | null;
  billable: boolean;
  status: string;
  project: { id: string; projectName: string; projectCode: string } | null;
  task: { id: string; title: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  RUNNING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  SUBMITTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimeTrackingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;

  const initialProjectId = searchParams.get('projectId') || '';
  const initialTaskId = searchParams.get('taskId') || '';

  const [activeTab, setActiveTab] = useState<'entries' | 'timesheet'>('entries');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billableFilter, setBillableFilter] = useState('');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<{ id: string; projectName: string; projectCode?: string }[]>([]);
  const [projectTasks, setProjectTasks] = useState<{ id: string; title: string }[]>([]);
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timesheet state
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  });
  const [timesheet, setTimesheet] = useState<any>(null);

  // New entry modal
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    duration: '',
    billable: true,
    projectId: initialProjectId,
    taskId: initialTaskId,
    status: 'DRAFT',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4500);
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      if (billableFilter) p.set('billable', billableFilter);
      if (projectId) p.set('projectId', projectId);
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
      p.set('page', String(page));
      p.set('limit', '20');

      const data = await apiFetch(`/organizations/${orgSlug}/time-entries?${p.toString()}`);
      setEntries(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to fetch time entries:', err);
      showError(err.message || 'Failed to fetch time entries');
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, statusFilter, billableFilter, projectId, startDate, endDate, page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const fetchStatsAndTimer = useCallback(async () => {
    try {
      const s = await apiFetch(`/organizations/${orgSlug}/time-entries/stats`);
      setStats(s);
      const timer = await apiFetch(`/organizations/${orgSlug}/time-entries/timer/running`);
      setRunningTimer(timer);
    } catch {}
  }, [orgSlug]);

  useEffect(() => {
    fetchStatsAndTimer();
    apiFetch(`/organizations/${orgSlug}/projects?limit=200`).then((data) => {
      setProjects(data.items?.map((p: any) => ({ id: p.id, projectName: p.projectName, projectCode: p.projectCode })) || []);
    }).catch(() => {});
  }, [fetchStatsAndTimer, orgSlug]);

  // Fetch tasks when selected project in new entry modal changes
  useEffect(() => {
    if (newEntry.projectId) {
      apiFetch(`/organizations/${orgSlug}/tasks?projectId=${newEntry.projectId}&limit=100`).then((data) => {
        setProjectTasks(data.items || []);
      }).catch(() => {
        setProjectTasks([]);
      });
    } else {
      setProjectTasks([]);
    }
  }, [orgSlug, newEntry.projectId]);

  useEffect(() => {
    if (!runningTimer) return;
    const start = new Date(runningTimer.startTime).getTime();
    setElapsedTime(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const interval = setInterval(() => {
      setElapsedTime(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  const fetchTimesheet = useCallback(async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/time-entries/weekly?weekStart=${weekStart}`);
      setTimesheet(data);
    } catch (err: any) {
      console.error('Failed to fetch timesheet:', err);
    }
  }, [orgSlug, weekStart]);

  useEffect(() => { if (activeTab === 'timesheet') fetchTimesheet(); }, [activeTab, fetchTimesheet]);

  const formatDuration = (hours: number | null) => {
    if (!hours || isNaN(hours)) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    try {
      const timer = await apiFetch(`/organizations/${orgSlug}/time-entries/timer/start`, {
        method: 'POST',
        body: JSON.stringify({
          billable: newEntry.billable,
          projectId: newEntry.projectId || undefined,
          taskId: newEntry.taskId || undefined,
          description: newEntry.description || undefined,
        }),
      });
      setRunningTimer(timer);
      setShowNewEntry(false);
      showToast('Live timer started!');
      fetchStatsAndTimer();
    } catch (err: any) {
      showError(err.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async (entryId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/timer/${entryId}/stop`, { method: 'POST' });
      setRunningTimer(null);
      setElapsedTime(0);
      showToast('Timer stopped & recorded as Draft entry');
      fetchEntries();
      fetchStatsAndTimer();
    } catch (err: any) {
      showError(err.message || 'Failed to stop timer');
    }
  };

  const handleCreateEntry = async () => {
    if (!newEntry.duration && !newEntry.startTime) {
      showError('Please specify duration in hours or start/end time');
      return;
    }
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries`, {
        method: 'POST',
        body: JSON.stringify(newEntry),
      });
      setShowNewEntry(false);
      setNewEntry({
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        duration: '',
        billable: true,
        projectId: '',
        taskId: '',
        status: 'DRAFT',
      });
      showToast('Time entry saved successfully');
      fetchEntries();
      fetchStatsAndTimer();
      if (activeTab === 'timesheet') fetchTimesheet();
    } catch (err: any) {
      showError(err.message || 'Failed to create entry');
    }
  };

  const handleSubmit = async (entryId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/${entryId}/submit`, { method: 'POST' });
      showToast('Entry submitted for review');
      fetchEntries();
    } catch (err: any) {
      showError(err.message || 'Failed to submit entry');
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/${entryId}/approve`, { method: 'POST' });
      showToast('Time entry approved');
      fetchEntries();
      fetchStatsAndTimer();
    } catch (err: any) {
      showError(err.message || 'Failed to approve entry');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/${deletingId}`, { method: 'DELETE' });
      setDeletingId(null);
      showToast('Time entry deleted');
      fetchEntries();
      fetchStatsAndTimer();
      if (activeTab === 'timesheet') fetchTimesheet();
    } catch (err: any) {
      showError(err.message || 'Failed to delete entry');
      setDeletingId(null);
    }
  };

  const changeWeek = (direction: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Notifications */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in">
          <CheckCircle size={16} />
          {toastMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">Time Tracking</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Track billable and project work hours with live counter and weekly timesheets</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewEntry(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Log Time / Start Timer
          </button>
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
        <Link
          href={`/${orgSlug}/projects/tasks`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Tasks List
        </Link>
        <Link
          href={`/${orgSlug}/projects/tasks/kanban`}
          className="px-3 py-1.5 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors"
        >
          Kanban Board
        </Link>
        <span
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold text-xs transition-colors"
        >
          Time Logs
        </span>
      </div>

      {/* Running Timer Banner */}
      {runningTimer && (
        <div className="border border-blue-200 dark:border-blue-800/80 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 p-4 shadow-sm animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Timer size={22} className="animate-spin duration-3000" />
              </div>
              <div>
                <p className="font-bold text-2xl font-mono text-blue-950 dark:text-blue-100 tracking-wider">
                  {formatTimer(elapsedTime)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">{runningTimer.description || 'Active Timer'}</span>
                  {runningTimer.project && (
                    <span className="ml-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                      {runningTimer.project.projectCode || runningTimer.project.projectName}
                    </span>
                  )}
                  {runningTimer.task && <span className="ml-2 text-gray-500">• {runningTimer.task.title}</span>}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleStopTimer(runningTimer.id)}
              className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
            >
              <Square size={16} /> Stop Timer
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Entries</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-zinc-100">{stats.totalEntries}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Total Hours</p>
            <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-zinc-100">{formatDuration(stats.totalDuration)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Billable</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{formatDuration(stats.billableDuration)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Non-Billable</p>
            <p className="text-2xl font-bold mt-1 text-gray-600 dark:text-zinc-400">{formatDuration(stats.nonBillableDuration)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">This Week</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.thisWeekEntries}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Active Timers</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.activeTimers}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('entries')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'entries' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2"><Clock size={16} /> Time Entries</div>
          </button>
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'timesheet' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2"><Calendar size={16} /> Weekly Timesheet</div>
          </button>
        </div>
      </div>

      {/* Time Entries Tab */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search entries by description..."
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
                  showFilters || statusFilter || billableFilter || startDate || endDate
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="RUNNING">Running</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Billable</label>
                  <select value={billableFilter} onChange={(e) => { setBillableFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                    <option value="">All</option>
                    <option value="true">Billable</option>
                    <option value="false">Non-Billable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Entries Table */}
          <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Clock size={48} className="text-gray-300 dark:text-zinc-600 mb-3" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-100">No time entries recorded</h3>
                <p className="text-xs text-gray-500 mb-4 max-w-sm">Use the timer or log your hours manually to track work and billing.</p>
                <button
                  onClick={() => setShowNewEntry(true)}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-medium hover:bg-primary/90 shadow-sm"
                >
                  <Plus size={15} /> Log Time Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Project / Task</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Billable</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-gray-100 dark:border-zinc-800/80 last:border-0 hover:bg-gray-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-5 py-3.5 text-xs font-medium text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                              {e.user?.firstName?.[0] || 'U'}
                            </div>
                            <span className="text-xs font-medium truncate max-w-[100px]">{e.user?.firstName} {e.user?.lastName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <p className="text-xs font-medium truncate text-gray-900 dark:text-zinc-100">{e.description || '-'}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          {e.project ? (
                            <div>
                              <span className="text-[10px] font-mono bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-zinc-300">
                                {e.project.projectCode}
                              </span>
                              {e.task && <p className="text-[10px] text-gray-400 truncate max-w-[130px] mt-0.5">{e.task.title}</p>}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-xs">
                          {formatDuration(e.duration)}
                        </td>
                        <td className="px-5 py-3.5">
                          {e.billable ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Billable
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Non-billable</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[e.status] || ''}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center gap-2 justify-end text-xs">
                            {e.status === 'DRAFT' && (
                              <button onClick={() => handleSubmit(e.id)} className="text-blue-600 hover:text-blue-800 font-semibold">
                                Submit
                              </button>
                            )}
                            {e.status === 'SUBMITTED' && (
                              <button onClick={() => handleApprove(e.id)} className="text-emerald-600 hover:text-emerald-800 font-semibold">
                                Approve
                              </button>
                            )}
                            <button onClick={() => setDeletingId(e.id)} className="text-red-500 hover:text-red-700 font-medium">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                <p className="text-xs text-gray-500">Page {page} of {totalPages} ({total} entries)</p>
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
      )}

      {/* Weekly Timesheet Tab */}
      {activeTab === 'timesheet' && timesheet && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg shadow-sm">
              <button onClick={() => changeWeek(-1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold">
                Week of {new Date(weekStart + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button onClick={() => changeWeek(1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-bold text-gray-900 dark:text-zinc-100">Weekly Total: {formatDuration(timesheet.totalDuration)}</span>
              <span className="text-emerald-600 font-semibold">Billable: {formatDuration(timesheet.billableDuration)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {Object.entries(timesheet.days || {}).map(([date, dayEntries]: [string, any]) => {
              const d = new Date(date + 'T12:00:00');
              const dayTotal = dayEntries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
              const isToday = new Date().toISOString().split('T')[0] === date;

              return (
                <div
                  key={date}
                  className={`border rounded-xl p-3 min-h-[220px] flex flex-col shadow-sm ${
                    isToday
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-zinc-800">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase">{DAY_LABELS[d.getDay()]}</p>
                      <p className={`text-sm font-bold ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      dayTotal > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400 dark:bg-zinc-800'
                    }`}>
                      {formatDuration(dayTotal)}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayEntries.map((entry: TimesheetEntry) => (
                      <div key={entry.id} className="bg-gray-50 dark:bg-zinc-800/60 rounded-lg p-2 text-xs border border-gray-100 dark:border-zinc-700/50">
                        <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">{entry.description || 'Logged work'}</p>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="font-bold text-gray-600 dark:text-zinc-400">{formatDuration(entry.duration)}</span>
                          {entry.billable && (
                            <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded">B</span>
                          )}
                        </div>
                        {entry.project && (
                          <p className="text-gray-400 text-[9px] font-mono truncate mt-1">
                            {entry.project.projectCode || entry.project.projectName}
                          </p>
                        )}
                      </div>
                    ))}
                    {dayEntries.length === 0 && (
                      <div className="h-full flex items-center justify-center py-8">
                        <p className="text-[11px] text-gray-400">No entries</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Time Entry / Start Timer Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                <h2 className="text-base font-bold">Log Time or Start Timer</h2>
              </div>
              <button onClick={() => setShowNewEntry(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="What are you working on?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">Project</label>
                  <select
                    value={newEntry.projectId}
                    onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value, taskId: '' })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">No Project Selected</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName} ({p.projectCode})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">Task</label>
                  <select
                    value={newEntry.taskId}
                    disabled={!newEntry.projectId || projectTasks.length === 0}
                    onChange={(e) => setNewEntry({ ...newEntry, taskId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                  >
                    <option value="">Select Task (optional)</option>
                    {projectTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={newEntry.duration}
                    onChange={(e) => setNewEntry({ ...newEntry, duration: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. 1.5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="billable"
                  checked={newEntry.billable}
                  onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="billable" className="text-xs font-semibold text-gray-700 dark:text-zinc-300 cursor-pointer">
                  Mark as Billable hours
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 rounded-b-xl">
              <button
                onClick={handleStartTimer}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 transition-colors shadow-sm"
              >
                <Play size={14} /> Start Live Timer
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewEntry(false)}
                  className="px-3.5 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs font-medium hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEntry}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 shadow-sm transition-colors"
                >
                  <Plus size={14} /> Save Log
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-zinc-800">
            <h3 className="text-base font-bold mb-2 text-gray-900 dark:text-zinc-100">Delete Time Entry</h3>
            <p className="text-xs text-gray-600 dark:text-zinc-400 mb-6">
              Are you sure you want to delete this time entry? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
