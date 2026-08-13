'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Workflow, ArrowLeft, Plus, Trash2, Zap, AlertCircle
} from 'lucide-react';

const TRIGGER_OPTIONS = [
  { id: 'LEAD_CREATED', name: 'Lead Created', module: 'CRM' },
  { id: 'LEAD_CONVERTED', name: 'Lead Converted', module: 'CRM' },
  { id: 'OPPORTUNITY_WON', name: 'Opportunity Won', module: 'CRM' },
  { id: 'MEETING_SCHEDULED', name: 'Meeting Scheduled', module: 'CRM' },
  { id: 'PROPOSAL_APPROVED', name: 'Proposal Approved', module: 'CRM' },
  { id: 'CONTRACT_ACTIVATED', name: 'Contract Activated', module: 'CRM' },
  { id: 'PROJECT_CREATED', name: 'Project Created', module: 'Projects' },
  { id: 'PROJECT_COMPLETED', name: 'Project Completed', module: 'Projects' },
  { id: 'TASK_CREATED', name: 'Task Created', module: 'Tasks' },
  { id: 'TASK_COMPLETED', name: 'Task Completed', module: 'Tasks' },
  { id: 'KNOWLEDGE_ARTICLE_PUBLISHED', name: 'Knowledge Article Published', module: 'Knowledge' },
];

export default function EditWorkflowPage({ params }: { params: { orgSlug: string; id: string } }) {
  const { orgSlug, id } = params;
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [actions, setActions] = useState<{ type: string; config: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadWorkflow() {
      try {
        const wf = await apiFetch(`/organizations/${orgSlug}/workflows/${id}`);
        if (wf) {
          setName(wf.name || '');
          setDescription(wf.description || '');
          setStatus(wf.status || 'ACTIVE');
          setSelectedTriggers(wf.triggers?.map((t: any) => t.type) || []);
          setConditions(wf.conditions || []);
          setActions(
            wf.actions?.map((a: any) => ({
              type: a.type,
              config: typeof a.config === 'string' ? JSON.parse(a.config) : a.config,
            })) || []
          );
        }
      } catch (err) {
        console.error('Failed to load workflow:', err);
        setError('Failed to load workflow data.');
      } finally {
        setLoading(false);
      }
    }
    loadWorkflow();
  }, [orgSlug, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      await apiFetch(`/organizations/${orgSlug}/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          description,
          status,
          triggers: selectedTriggers.map((t) => ({ type: t })),
          conditions: conditions.map((c, i) => ({ ...c, stepOrder: i })),
          actions: actions.map((a, i) => ({ type: a.type, config: JSON.stringify(a.config), stepOrder: i })),
        }),
      });

      router.push(`/${orgSlug}/workflows`);
    } catch (err: any) {
      console.error('Failed to update workflow:', err);
      setError(err.message || 'Failed to update workflow rule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading workflow details...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-zinc-800 pb-4">
        <Link
          href={`/${orgSlug}/workflows`}
          className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Edit Workflow Rule
          </h1>
          <p className="text-xs text-gray-500">Modify triggers, conditions, and actions for this workflow.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Workflow Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/${orgSlug}/workflows`}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
