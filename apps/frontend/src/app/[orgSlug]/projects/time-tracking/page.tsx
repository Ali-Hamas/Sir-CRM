'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Search, Plus, Clock, Play, Pause, Square, Calendar, Filter, ArrowUpDown,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Timer, FileText, BarChart3
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
  project: { id: string; projectName: string } | null;
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
  SUBMITTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TimeTrackingPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'entries' | 'timesheet'>('entries');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billableFilter, setBillableFilter] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<{ id: string; projectName: string }[]>([]);
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

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
    description: '', date: new Date().toISOString().split('T')[0],
    startTime: '', endTime: '', duration: '', billable: false,
    projectId: '', taskId: '', status: 'DRAFT',
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (billableFilter) params.set('billable', billableFilter);
      if (projectId) params.set('projectId', projectId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', String(page));
      params.set('limit', '20');

      const data = await apiFetch(`/organizations/${orgSlug}/time-entries?${params.toString()}`);
      setEntries(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Failed to fetch time entries:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, search, statusFilter, billableFilter, projectId, startDate, endDate, page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    apiFetch(`/organizations/${orgSlug}/time-entries/stats`).then(setStats).catch(() => {});
    apiFetch(`/organizations/${orgSlug}/projects?limit=200`).then((data) => {
      setProjects(data.items?.map((p: any) => ({ id: p.id, projectName: p.projectName })) || []);
    }).catch(() => {});
    apiFetch(`/organizations/${orgSlug}/time-entries/timer/running`).then(setRunningTimer).catch(() => {});
  }, [orgSlug]);

  useEffect(() => {
    if (!runningTimer) return;
    const start = new Date(runningTimer.startTime).getTime();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [runningTimer]);

  const fetchTimesheet = useCallback(async () => {
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/time-entries/weekly?weekStart=${weekStart}`);
      setTimesheet(data);
    } catch (err) {
      console.error('Failed to fetch timesheet:', err);
    }
  }, [orgSlug, weekStart]);

  useEffect(() => { if (activeTab === 'timesheet') fetchTimesheet(); }, [activeTab, fetchTimesheet]);

  const formatDuration = (hours: number | null) => {
    if (!hours) return '0h';
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
        body: JSON.stringify({ billable: newEntry.billable, projectId: newEntry.projectId || undefined, description: newEntry.description || undefined }),
      });
      setRunningTimer(timer);
      setShowNewEntry(false);
    } catch (err: any) {
      alert(err.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async (entryId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/timer/${entryId}/stop`, { method: 'POST' });
      setRunningTimer(null);
      setElapsedTime(0);
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to stop timer');
    }
  };

  const handleCreateEntry = async () => {
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries`, {
        method: 'POST',
        body: JSON.stringify(newEntry),
      });
      setShowNewEntry(false);
      setNewEntry({ description: '', date: new Date().toISOString().split('T')[0], startTime: '', endTime: '', duration: '', billable: false, projectId: '', taskId: '', status: 'DRAFT' });
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to create entry');
    }
  };

  const handleSubmit = async (entryId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/${entryId}/submit`, { method: 'POST' });
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to submit entry');
    }
  };

  const handleApprove = async (entryId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/${entryId}/approve`, { method: 'POST' });
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to approve entry');
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this time entry?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/time-entries/${entryId}`, { method: 'DELETE' });
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  const changeWeek = (direction: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Track time, manage timesheets</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewEntry(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={16} /> New Entry
          </button>
        </div>
      </div>

      {/* Running Timer Banner */}
      {runningTimer && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <Timer size={20} />
              </div>
              <div>
                <p className="font-semibold text-lg font-mono">{formatTimer(elapsedTime)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {runningTimer.description || 'No description'}
                  {runningTimer.project && ` - ${runningTimer.project.projectName}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleStopTimer(runningTimer.id)}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Square size={16} /> Stop
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Total Entries</p>
            <p className="text-2xl font-bold mt-1">{stats.totalEntries}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Total Hours</p>
            <p className="text-2xl font-bold mt-1">{formatDuration(stats.totalDuration)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">Billable</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatDuration(stats.billableDuration)}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">This Week</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.thisWeekEntries}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <p className="text-xs text-gray-500 font-medium">This Month</p>
            <p className="text-2xl font-bold mt-1">{stats.thisMonthEntries}</p>
          </div>
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-500" />
              <p className="text-xs text-gray-500 font-medium">Active Timers</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.activeTimers}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-zinc-800">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('entries')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'entries' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2"><Clock size={16} /> Time Entries</div>
          </button>
          <button
            onClick={() => setActiveTab('timesheet')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timesheet' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2"><Calendar size={16} /> Weekly Timesheet</div>
          </button>
        </div>
      </div>

      {/* Time Entries Tab */}
      {activeTab === 'entries' && (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search entries..." className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="flex gap-2">
              <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPage(1); }} className="px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
                <option value="">All Projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
              </select>
              <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${showFilters || statusFilter || billableFilter ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50'}`}>
                <Filter size={16} /> Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4 bg-gray-50 dark:bg-zinc-900/50">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                    <option value="">All</option>
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
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Clock size={48} className="text-gray-300 dark:text-zinc-600 mb-4" />
                <h3 className="text-lg font-medium mb-1">No time entries found</h3>
                <p className="text-sm text-gray-500 mb-4">Start tracking your time</p>
                <button onClick={() => setShowNewEntry(true)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                  <Plus size={16} /> New Entry
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Description</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Project</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Task</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Duration</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Billable</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 font-medium text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-gray-200 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                        <td className="px-6 py-4 text-xs">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{e.description || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          {e.project ? <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">{e.project.projectCode}</span> : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-6 py-4 text-xs">{e.task?.title || '-'}</td>
                        <td className="px-6 py-4 font-medium">{formatDuration(e.duration)}</td>
                        <td className="px-6 py-4">
                          {e.billable ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-gray-300" />}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] || ''}`}>{e.status}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {e.status === 'DRAFT' && <button onClick={() => handleSubmit(e.id)} className="text-xs text-blue-600 hover:text-blue-800">Submit</button>}
                            {e.status === 'SUBMITTED' && <button onClick={() => handleApprove(e.id)} className="text-xs text-green-600 hover:text-green-800">Approve</button>}
                            <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                          </div>
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
        </>
      )}

      {/* Weekly Timesheet Tab */}
      {activeTab === 'timesheet' && timesheet && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => changeWeek(-1)} className="p-1.5 rounded-md border hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronLeft size={16} /></button>
              <span className="text-sm font-medium">
                Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <button onClick={() => changeWeek(1)} className="p-1.5 rounded-md border hover:bg-gray-100 dark:hover:bg-zinc-800"><ChevronRight size={16} /></button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">Total: {formatDuration(timesheet.totalDuration)}</span>
              <span className="text-green-600">Billable: {formatDuration(timesheet.billableDuration)}</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {Object.entries(timesheet.days).map(([date, dayEntries]: [string, any]) => {
              const d = new Date(date + 'T12:00:00');
              const dayTotal = dayEntries.reduce((sum: number, e: any) => sum + (e.duration || 0), 0);
              return (
                <div key={date} className="border border-gray-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 p-3 min-h-[200px]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">{DAY_LABELS[d.getDay()]}</p>
                      <p className="text-sm font-bold">{d.getDate()}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${dayTotal > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 dark:bg-zinc-800'}`}>
                      {formatDuration(dayTotal)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayEntries.map((entry: TimesheetEntry) => (
                      <div key={entry.id} className="bg-gray-50 dark:bg-zinc-800/50 rounded p-2 text-xs">
                        <p className="font-medium truncate">{entry.description || 'No description'}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-gray-500">{formatDuration(entry.duration)}</span>
                          {entry.billable && <span className="text-green-500">B</span>}
                        </div>
                        {entry.project && <p className="text-gray-400 truncate mt-0.5">{entry.project.projectCode}</p>}
                      </div>
                    ))}
                    {dayEntries.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No entries</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Entry Modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">New Time Entry</h2>
              <button onClick={() => setShowNewEntry(false)} className="text-gray-500 hover:text-gray-700">X</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <input type="text" value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" placeholder="What did you work on?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                  <input type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duration (hours)</label>
                  <input type="number" step="0.25" value={newEntry.duration} onChange={(e) => setNewEntry({ ...newEntry, duration: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" placeholder="e.g. 2.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
                  <input type="time" value={newEntry.startTime} onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
                  <input type="time" value={newEntry.endTime} onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
                <select value={newEntry.projectId} onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value })} className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm">
                  <option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newEntry.billable} onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })} className="rounded" />
                  Billable
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-zinc-800">
              <button onClick={() => setShowNewEntry(false)} className="px-4 py-2 rounded-md border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleStartTimer} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-200 text-blue-600 text-sm font-medium hover:bg-blue-50">
                <Play size={16} /> Start Timer
              </button>
              <button onClick={handleCreateEntry} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
                <Plus size={16} /> Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
