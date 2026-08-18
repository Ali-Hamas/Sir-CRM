'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Cpu, Plus, Play, Pause, XCircle, RotateCcw, CheckCircle2, XCircle as XCircleIcon,
  Clock, AlertTriangle, Layers, BarChart3, ListTodo, Loader2, RefreshCw,
  ChevronRight, Eye, Settings, Trash2, Calendar, FileText, Zap, Workflow,
} from 'lucide-react';

interface Process {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  priority: number;
  icon: string | null;
  color: string | null;
  createdAt: string;
  _count: { executions: number };
  template: { id: string; name: string } | null;
}

interface Execution {
  id: string;
  status: string;
  trigger: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  process: { id: string; name: string; icon: string | null; color: string | null };
  _count: { steps: number; approvals: number };
}

interface Approval {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  assignedTo: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  execution: { id: string; processId: string; status: string; createdAt: string } | null;
}

interface Stats {
  totalProcesses: number;
  activeProcesses: number;
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  pendingApprovals: number;
  successRate: number;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
  ACTIVE: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  DISABLED: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  ARCHIVED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  PENDING: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
  PLANNING: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  EXECUTING: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  PAUSED: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  COMPLETED: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  FAILED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function BusinessProcessesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'processes' | 'executions' | 'approvals'>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProcess, setNewProcess] = useState({ name: '', description: '', category: '' });
  const [apiError, setApiError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [statsData, processesData, executionsData, approvalsData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/business-processes/stats`),
        apiFetch(`/organizations/${orgSlug}/business-processes?limit=100`),
        apiFetch(`/organizations/${orgSlug}/business-processes/executions/all?limit=50`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/business-processes/approvals/pending`).catch(() => []),
      ]);
      setStats(statsData);
      setProcesses(processesData?.items || processesData || []);
      setExecutions(executionsData || []);
      setApprovals(approvalsData || []);
    } catch (err: any) {
      console.error('Failed to load business process data:', err);
      setApiError(err?.message || 'Failed to load Business Processes data');
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch(`/organizations/${orgSlug}/business-processes`, {
        method: 'POST',
        body: JSON.stringify(newProcess),
      });
      setShowCreateModal(false);
      setNewProcess({ name: '', description: '', category: '' });
      loadData();
    } catch (err) {
      console.error('Failed to create process:', err);
    }
  };

  const handleExecute = async (processId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/business-processes/${processId}/execute`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      loadData();
    } catch (err) {
      console.error('Failed to execute process:', err);
    }
  };

  const handleAction = async (executionId: string, action: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/business-processes/${executionId}/${action}`, {
        method: 'POST',
      });
      loadData();
    } catch (err) {
      console.error(`Failed to ${action} execution:`, err);
    }
  };

  const handleApprove = async (approvalId: string, status: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/business-processes/approvals/${approvalId}/decide`, {
        method: 'PATCH',
        body: JSON.stringify({ status, comment: '' }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to decide approval:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 via-violet-500/5 to-indigo-500/10 rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Cpu size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Processes</h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                Automate and orchestrate end-to-end business operations
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-medium transition-colors"
          >
            <Plus size={16} />
            New Process
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-zinc-800">
        {(['dashboard', 'processes', 'executions', 'approvals'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab === 'dashboard' && <BarChart3 size={15} className="inline mr-1.5" />}
            {tab === 'processes' && <Layers size={15} className="inline mr-1.5" />}
            {tab === 'executions' && <Play size={15} className="inline mr-1.5" />}
            {tab === 'approvals' && <CheckCircle2 size={15} className="inline mr-1.5" />}
            {tab}
            {tab === 'approvals' && approvals.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                {approvals.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Layers size={20} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProcesses}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Total Processes</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{stats.activeProcesses} active</p>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Play size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalExecutions}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Total Executions</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{stats.completedExecutions} completed</p>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <BarChart3 size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.successRate}%</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Success Rate</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-red-500">{stats.failedExecutions} failed</p>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApprovals}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">Pending Approvals</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-amber-600">Requires attention</p>
            </div>
          </div>

          {/* Recent Executions */}
          <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Executions</h3>
            </div>
            <div className="p-5">
              {executions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-8">No executions yet</p>
              ) : (
                <div className="space-y-2">
                  {executions.slice(0, 5).map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={ex.status} />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{ex.process.name}</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            {ex.createdAt ? new Date(ex.createdAt).toLocaleString() : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ex.status === 'EXECUTING' && (
                          <button onClick={() => handleAction(ex.id, 'pause')} className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg" title="Pause">
                            <Pause size={14} />
                          </button>
                        )}
                        {ex.status === 'PAUSED' && (
                          <button onClick={() => handleAction(ex.id, 'resume')} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg" title="Resume">
                            <Play size={14} />
                          </button>
                        )}
                        {ex.status === 'FAILED' && (
                          <button onClick={() => handleAction(ex.id, 'retry')} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg" title="Retry">
                            <RotateCcw size={14} />
                          </button>
                        )}
                        <span className="text-xs text-gray-400">{ex._count.steps} steps</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Processes Tab */}
      {activeTab === 'processes' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">All Processes</h3>
            <button onClick={loadData} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="p-5">
            {processes.length === 0 ? (
              <div className="text-center py-12">
                <Cpu size={40} className="mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm text-gray-500 dark:text-zinc-400">No business processes defined</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Create your first process
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {processes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${p.color || 'from-purple-500 to-indigo-500'} flex items-center justify-center text-white`}>
                        <Zap size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">
                          {p.category || 'Uncategorized'} &middot; {p._count.executions} executions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <button
                        onClick={() => handleExecute(p.id)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg"
                        title="Execute"
                      >
                        <Play size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">All Executions</h3>
            <button onClick={loadData} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-zinc-400">Process</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-zinc-400">Status</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-zinc-400">Trigger</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-zinc-400">Started</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-zinc-400">Steps</th>
                  <th className="px-5 py-3 font-medium text-gray-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {executions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">{ex.process.name}</td>
                    <td className="px-5 py-3"><StatusBadge status={ex.status} /></td>
                    <td className="px-5 py-3 text-gray-500 dark:text-zinc-400">{ex.trigger || 'Manual'}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-zinc-400">
                      {ex.startedAt ? new Date(ex.startedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-zinc-400">{ex._count.steps}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {ex.status === 'FAILED' && (
                          <button onClick={() => handleAction(ex.id, 'retry')} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg" title="Retry">
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {(ex.status === 'EXECUTING' || ex.status === 'PLANNING') && (
                          <button onClick={() => handleAction(ex.id, 'cancel')} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg" title="Cancel">
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {executions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-8">No executions found</p>
            )}
          </div>
        </div>
      )}

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pending Approvals</h3>
          </div>
          <div className="p-5">
            {approvals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 size={40} className="mx-auto text-emerald-300 dark:text-emerald-700 mb-3" />
                <p className="text-sm text-gray-500 dark:text-zinc-400">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvals.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                        {a.description && (
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{a.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Created {new Date(a.createdAt).toLocaleString()}
                          {a.execution && ` · Process: ${a.execution.processId}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(a.id, 'APPROVED')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                        >
                          <CheckCircle2 size={12} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApprove(a.id, 'REJECTED')}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50"
                        >
                          <XCircleIcon size={12} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Business Process</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newProcess.name}
                  onChange={(e) => setNewProcess({ ...newProcess, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Description</label>
                <textarea
                  value={newProcess.description}
                  onChange={(e) => setNewProcess({ ...newProcess, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Category</label>
                <select
                  value={newProcess.category}
                  onChange={(e) => setNewProcess({ ...newProcess, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
                >
                  <option value="">Select category</option>
                  <option value="LEAD_QUALIFICATION">Lead Qualification</option>
                  <option value="PROPOSAL_GENERATION">Proposal Generation</option>
                  <option value="CLIENT_ONBOARDING">Client Onboarding</option>
                  <option value="PROJECT_INITIALIZATION">Project Initialization</option>
                  <option value="TASK_BREAKDOWN">Task Breakdown</option>
                  <option value="MEETING_PREPARATION">Meeting Preparation</option>
                  <option value="REPORT_GENERATION">Report Generation</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-xl hover:bg-primary/90"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
