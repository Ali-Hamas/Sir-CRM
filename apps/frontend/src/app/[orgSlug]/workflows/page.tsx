'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Workflow, Zap, Play, CheckCircle2, XCircle, AlertCircle, Plus,
  Search, Filter, RefreshCw, Layers, History, Settings, ChevronRight
} from 'lucide-react';

export default function WorkflowsDashboardPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalWorkflows: 0, activeWorkflows: 0, totalExecutions: 0, successRate: 100 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedWorkflowForLogs, setSelectedWorkflowForLogs] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const [workflowsRes, statsRes] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/workflows`),
        apiFetch(`/organizations/${orgSlug}/workflows/stats`),
      ]);
      setWorkflows(workflowsRes?.items || []);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [orgSlug]);

  const handleToggleStatus = async (workflow: any) => {
    const nextStatus = workflow.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await apiFetch(`/organizations/${orgSlug}/workflows/${workflow.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchWorkflows();
    } catch (err) {
      console.error('Failed to update workflow status:', err);
    }
  };

  const handleViewLogs = async (workflow: any) => {
    setSelectedWorkflowForLogs(workflow);
    setLoadingLogs(true);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/workflows/${workflow.id}/executions`);
      setLogs(res?.items || []);
    } catch (err) {
      console.error('Failed to load execution logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) || (w.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Workflow className="h-7 w-7 text-primary" />
            Business Automation & Workflow Engine
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Automate enterprise business logic across CRM, Projects, Tasks, and Knowledge Base.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchWorkflows}
            className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-zinc-300"
            title="Refresh Workflows"
          >
            <RefreshCw size={16} />
          </button>
          <Link
            href={`/${orgSlug}/workflows/new`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Create Workflow
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total Engine Rules</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalWorkflows}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers size={20} />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Active Workflows</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeWorkflows}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Zap size={20} />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Total Executions</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.totalExecutions}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <History size={20} />
          </div>
        </div>

        <div className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Engine Success Rate</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.successRate}%</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium">Status:</span>
          {['ALL', 'ACTIVE', 'DRAFT', 'DISABLED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Workflows List Table */}
      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-zinc-400">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading business workflows...
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="p-12 text-center">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No Workflows Found</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
              Create your first workflow automation rule to automatically assign tasks, trigger notifications, or update records.
            </p>
            <Link
              href={`/${orgSlug}/workflows/new`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors mt-4"
            >
              <Plus size={16} />
              Build Workflow
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 text-xs font-medium text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Workflow Name</th>
                  <th className="px-6 py-3.5">Triggers</th>
                  <th className="px-6 py-3.5">Actions</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Executions</th>
                  <th className="px-6 py-3.5 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {filteredWorkflows.map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{workflow.name}</div>
                      {workflow.description && (
                        <div className="text-xs text-gray-500 dark:text-zinc-400 truncate max-w-xs">{workflow.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {workflow.triggers?.map((t: any) => (
                          <span key={t.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            {t.type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {workflow.actions?.map((a: any) => (
                          <span key={a.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            {a.type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(workflow)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          workflow.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : workflow.status === 'DRAFT'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                            : 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 hover:bg-gray-500/20'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${workflow.status === 'ACTIVE' ? 'bg-emerald-500' : workflow.status === 'DRAFT' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                        {workflow.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-zinc-400">
                      <button
                        onClick={() => handleViewLogs(workflow)}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <History size={14} />
                        {workflow._count?.executions || 0} Runs
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/${orgSlug}/workflows/${workflow.id}/edit`}
                          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-colors"
                          title="Edit Workflow"
                        >
                          <Settings size={16} />
                        </Link>
                        <Link
                          href={`/${orgSlug}/workflows/${workflow.id}/executions`}
                          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-800 text-primary transition-colors"
                          title="Full Execution History"
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Log Inspector Drawer */}
      {selectedWorkflowForLogs && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full p-6 overflow-y-auto border-l border-gray-200 dark:border-zinc-800 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{selectedWorkflowForLogs.name}</h3>
                <p className="text-xs text-gray-500">Execution History Logs</p>
              </div>
              <button
                onClick={() => setSelectedWorkflowForLogs(null)}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            {loadingLogs ? (
              <div className="p-8 text-center text-gray-500">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No execution logs recorded yet.</div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold px-2 py-0.5 rounded ${log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                        {log.status}
                      </span>
                      <span className="text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-xs font-mono text-gray-600 dark:text-zinc-300">
                      Trigger: {log.triggerType} ({log.entityType} - {log.entityId})
                    </div>
                    {log.logs && (
                      <pre className="text-[11px] bg-black/80 text-emerald-400 p-2 rounded overflow-x-auto max-h-36">
                        {log.logs}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
