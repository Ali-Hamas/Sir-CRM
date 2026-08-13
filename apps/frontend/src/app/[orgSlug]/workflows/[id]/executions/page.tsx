'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Workflow, ArrowLeft, History, CheckCircle2, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';

export default function WorkflowExecutionsPage({ params }: { params: { orgSlug: string; id: string } }) {
  const { orgSlug, id } = params;
  const [workflow, setWorkflow] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wf, execs] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/workflows/${id}`),
        apiFetch(`/organizations/${orgSlug}/workflows/${id}/executions`),
      ]);
      setWorkflow(wf);
      setExecutions(execs?.items || []);
    } catch (err) {
      console.error('Failed to load executions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgSlug, id]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${orgSlug}/workflows`}
            className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Execution Logs: {workflow?.name || 'Workflow'}
            </h1>
            <p className="text-xs text-gray-500">Real-time audit log of engine evaluations and action results.</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading execution logs...
          </div>
        ) : executions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <h3 className="font-semibold text-gray-900 dark:text-white">No Executions Recorded</h3>
            <p className="text-xs text-gray-500 mt-1">This workflow has not been triggered by system events yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-zinc-800">
            {executions.map((exec) => (
              <div key={exec.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        exec.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : exec.status === 'SKIPPED'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}
                    >
                      {exec.status === 'SUCCESS' ? <CheckCircle2 size={12} /> : exec.status === 'SKIPPED' ? <AlertCircle size={12} /> : <XCircle size={12} />}
                      {exec.status}
                    </span>
                    <span className="text-xs font-mono font-medium text-gray-700 dark:text-zinc-300">
                      Trigger: {exec.triggerType}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({exec.entityType} #{exec.entityId})
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(exec.createdAt).toLocaleString()}
                  </span>
                </div>

                {exec.error && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-mono">
                    Error: {exec.error}
                  </div>
                )}

                {exec.logs && (
                  <pre className="p-3 rounded-lg bg-gray-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-48 border border-zinc-800">
                    {exec.logs}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
