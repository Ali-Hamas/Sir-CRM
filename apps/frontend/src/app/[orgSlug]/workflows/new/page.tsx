'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Workflow, ArrowLeft, Plus, Trash2, Zap, CheckCircle2,
  Sliders, Layers, Sparkles, AlertCircle
} from 'lucide-react';

const TRIGGER_OPTIONS = [
  { id: 'LEAD_CREATED', name: 'Lead Created', module: 'CRM', desc: 'Fires when a new lead enters the CRM pipeline' },
  { id: 'LEAD_CONVERTED', name: 'Lead Converted', module: 'CRM', desc: 'Fires when a lead is converted into a contact/company' },
  { id: 'OPPORTUNITY_WON', name: 'Opportunity Won', module: 'CRM', desc: 'Fires when an opportunity moves to Closed Won' },
  { id: 'MEETING_SCHEDULED', name: 'Meeting Scheduled', module: 'CRM', desc: 'Fires when a meeting is created' },
  { id: 'PROPOSAL_APPROVED', name: 'Proposal Approved', module: 'CRM', desc: 'Fires when a proposal gets client approval' },
  { id: 'CONTRACT_ACTIVATED', name: 'Contract Activated', module: 'CRM', desc: 'Fires when a contract becomes active' },
  { id: 'PROJECT_CREATED', name: 'Project Created', module: 'Projects', desc: 'Fires when a project is initialized' },
  { id: 'PROJECT_COMPLETED', name: 'Project Completed', module: 'Projects', desc: 'Fires when a project reaches 100% completion' },
  { id: 'TASK_CREATED', name: 'Task Created', module: 'Tasks', desc: 'Fires when a task is created' },
  { id: 'TASK_COMPLETED', name: 'Task Completed', module: 'Tasks', desc: 'Fires when a task status changes to Done' },
  { id: 'KNOWLEDGE_ARTICLE_PUBLISHED', name: 'Knowledge Article Published', module: 'Knowledge', desc: 'Fires when an article is published' },
];

const ACTION_OPTIONS = [
  { id: 'SEND_NOTIFICATION', name: 'Send Notification', icon: '🔔', desc: 'Push alert notification to user' },
  { id: 'CREATE_TASK', name: 'Create Task', icon: '✅', desc: 'Automatically generate a follow-up task' },
  { id: 'CREATE_ACTIVITY', name: 'Log Activity', icon: '📝', desc: 'Record an entry in the activity timeline' },
  { id: 'ASSIGN_USER', name: 'Assign User', icon: '👤', desc: 'Assign lead, project, or task owner' },
  { id: 'CREATE_PROJECT', name: 'Create Project', icon: '📁', desc: 'Generate a project from a template or trigger' },
  { id: 'UPDATE_RECORD', name: 'Update Record', icon: '🔄', desc: 'Modify field values on the target record' },
  { id: 'CREATE_RECORD', name: 'Create Custom Record', icon: '⚡', desc: 'Create a custom data object' },
  { id: 'EMAIL_ACTION', name: 'Email Action', icon: '📧', desc: 'Queue automated email response' },
  { id: 'DELAY_ACTION', name: 'Delay Action', icon: '⏱️', desc: 'Pause workflow execution flow' },
];

export default function CreateWorkflowPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>(['LEAD_CREATED']);
  const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [actions, setActions] = useState<{ type: string; config: any }[]>([
    { type: 'SEND_NOTIFICATION', config: { title: 'Workflow Alert', message: 'Automated workflow rule triggered.' } },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleTrigger = (triggerId: string) => {
    if (selectedTriggers.includes(triggerId)) {
      if (selectedTriggers.length === 1) return; // Keep at least 1 trigger
      setSelectedTriggers(selectedTriggers.filter((t) => t !== triggerId));
    } else {
      setSelectedTriggers([...selectedTriggers, triggerId]);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'status', operator: 'EQUALS', value: 'ACTIVE' }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, key: string, val: string) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], [key]: val };
    setConditions(next);
  };

  const addAction = (type: string) => {
    setActions([...actions, { type, config: { title: `${type} Action`, message: 'Automated step' } }]);
  };

  const removeAction = (idx: number) => {
    setActions(actions.filter((_, i) => i !== idx));
  };

  const updateActionConfig = (idx: number, key: string, val: any) => {
    const next = [...actions];
    next[idx].config = { ...next[idx].config, [key]: val };
    setActions(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a workflow name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiFetch(`/organizations/${orgSlug}/workflows`, {
        method: 'POST',
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
      console.error('Failed to create workflow:', err);
      setError(err.message || 'Failed to save workflow automation rule.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
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
              <Workflow className="h-6 w-6 text-primary" />
              Create Automation Workflow
            </h1>
            <p className="text-xs text-gray-500">Configure trigger events, matching rules, and automated execution steps.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Basic Information */}
        <div className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800/80 pb-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
            <h2 className="font-semibold text-base text-gray-900 dark:text-white">Workflow Identity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Workflow Name *</label>
              <input
                type="text"
                placeholder="e.g. Auto Assign Lead & Notify Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Initial Engine Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ACTIVE">ACTIVE (Live Execution)</option>
                <option value="DRAFT">DRAFT (Testing mode)</option>
                <option value="DISABLED">DISABLED (Paused)</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300 mb-1">Description</label>
              <textarea
                placeholder="Describe what business rule this workflow automates..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Trigger Event Picker */}
        <div className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800/80 pb-3">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
            <h2 className="font-semibold text-base text-gray-900 dark:text-white">Trigger Event (When this happens...)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TRIGGER_OPTIONS.map((trigger) => {
              const isSelected = selectedTriggers.includes(trigger.id);
              return (
                <div
                  key={trigger.id}
                  onClick={() => toggleTrigger(trigger.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                      : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 bg-gray-50/50 dark:bg-zinc-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Zap className={`h-3.5 w-3.5 ${isSelected ? 'text-primary' : 'text-gray-400'}`} />
                      {trigger.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                      {trigger.module}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">{trigger.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Condition Rules Builder */}
        <div className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="font-semibold text-base text-gray-900 dark:text-white">Conditions (Only if...)</h2>
            </div>
            <button
              type="button"
              onClick={addCondition}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus size={14} /> Add Condition Rule
            </button>
          </div>

          {conditions.length === 0 ? (
            <p className="text-xs text-gray-500 italic bg-gray-50 dark:bg-zinc-950 p-4 rounded-lg border border-dashed border-gray-200 dark:border-zinc-800">
              No conditions set. This workflow will fire for all matching trigger events.
            </p>
          ) : (
            <div className="space-y-3">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-gray-50 dark:bg-zinc-950 p-3 rounded-lg border border-gray-200 dark:border-zinc-800">
                  <input
                    type="text"
                    placeholder="Field name (e.g. status, value, priority)"
                    value={cond.field}
                    onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                    className="w-full sm:w-1/3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                  />
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                    className="w-full sm:w-1/3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                  >
                    <option value="EQUALS">EQUALS</option>
                    <option value="NOT_EQUALS">NOT EQUALS</option>
                    <option value="CONTAINS">CONTAINS</option>
                    <option value="GREATER_THAN">GREATER THAN</option>
                    <option value="LESS_THAN">LESS THAN</option>
                    <option value="IS_SET">IS SET</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Target value"
                    value={cond.value}
                    onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                    className="w-full sm:w-1/3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeCondition(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step 4: Action Sequence Configurator */}
        <div className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
              <h2 className="font-semibold text-base text-gray-900 dark:text-white">Actions (Execute steps...)</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pb-3">
            {ACTION_OPTIONS.map((act) => (
              <button
                type="button"
                key={act.id}
                onClick={() => addAction(act.id)}
                className="flex flex-col items-center p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800 hover:border-primary/50 bg-gray-50/50 dark:bg-zinc-950 transition-colors text-center"
              >
                <span className="text-lg mb-1">{act.icon}</span>
                <span className="text-[11px] font-semibold text-gray-800 dark:text-zinc-200">{act.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {actions.map((act, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-900 dark:text-white">
                  <span>Step {idx + 1}: {act.type}</span>
                  <button
                    type="button"
                    onClick={() => removeAction(idx)}
                    className="text-rose-500 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 size={14} /> Remove Step
                  </button>
                </div>

                {act.type === 'SEND_NOTIFICATION' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Notification Title"
                      value={act.config.title || ''}
                      onChange={(e) => updateActionConfig(idx, 'title', e.target.value)}
                      className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Notification Message"
                      value={act.config.message || ''}
                      onChange={(e) => updateActionConfig(idx, 'message', e.target.value)}
                      className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                    />
                  </div>
                )}

                {act.type === 'CREATE_TASK' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Task Title"
                      value={act.config.title || ''}
                      onChange={(e) => updateActionConfig(idx, 'title', e.target.value)}
                      className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                    />
                    <select
                      value={act.config.priority || 'MEDIUM'}
                      onChange={(e) => updateActionConfig(idx, 'priority', e.target.value)}
                      className="rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                    >
                      <option value="LOW">Priority: LOW</option>
                      <option value="MEDIUM">Priority: MEDIUM</option>
                      <option value="HIGH">Priority: HIGH</option>
                    </select>
                  </div>
                )}

                {act.type === 'CREATE_ACTIVITY' && (
                  <input
                    type="text"
                    placeholder="Activity Log Action Name"
                    value={act.config.action || ''}
                    onChange={(e) => updateActionConfig(idx, 'action', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/${orgSlug}/workflows`}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-sm font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? 'Deploying Workflow Engine...' : 'Deploy Workflow Rule'}
          </button>
        </div>
      </form>
    </div>
  );
}
