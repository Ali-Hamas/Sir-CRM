'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Loader2, Check, AlertCircle, Layers, Palette, Trash2 } from 'lucide-react';

const inputClass =
  'w-full rounded-md border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';
const labelClass = 'block text-xs font-semibold mb-1.5 text-gray-700 dark:text-zinc-300 uppercase tracking-wide';

const COLOR_PRESETS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#f97316', '#6366f1',
];

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) || '';
  const workspaceId = (params?.workspaceId as string) || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
    },
  });

  const watchedColor = watch('color');

  // ── Load workspace ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!orgSlug || !workspaceId) return;
    setLoading(true);
    apiFetch(`/organizations/${orgSlug}/workspaces/${workspaceId}`)
      .then((workspace) => {
        const vals = {
          name: workspace.name || '',
          description: workspace.description || '',
          color: workspace.color || '#3b82f6',
        };
        reset(vals);
        setWorkspaceName(workspace.name || workspaceId);
      })
      .catch((err) => showToast('error', err.message || 'Failed to load workspace settings'))
      .finally(() => setLoading(false));
  }, [orgSlug, workspaceId, reset]);

  // ── Save settings ─────────────────────────────────────────────────────────
  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      reset(data);
      setWorkspaceName(updated.name || data.name);
      showToast('success', 'Workspace settings saved');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save workspace settings');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete workspace ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteConfirmName !== workspaceName) return;
    setDeleting(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/workspaces/${workspaceId}`, { method: 'DELETE' });
      // Redirect to org root after deletion
      router.replace(`/${orgSlug}`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to delete workspace');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Workspace Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage preferences for <strong className="text-gray-700 dark:text-zinc-300">{workspaceName || workspaceId}</strong>.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
          {toast.text}
        </div>
      )}

      {/* ── Settings Form ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Workspace Details</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-500">Basic information and visual configuration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className={labelClass}>Workspace Name *</label>
            {loading ? (
              <div className="h-9 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />
            ) : (
              <input
                {...register('name', { required: true })}
                className={inputClass}
                placeholder="e.g. Product Team, Client Portal"
              />
            )}
          </div>

          <div>
            <label className={labelClass}>Description</label>
            {loading ? (
              <div className="h-20 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />
            ) : (
              <textarea
                {...register('description')}
                rows={3}
                className={inputClass}
                placeholder="What is this workspace for?"
              />
            )}
          </div>

          <div>
            <label className={labelClass}>
              <div className="flex items-center gap-1.5">
                <Palette size={12} /> Brand Color
              </div>
            </label>
            {loading ? (
              <div className="h-9 w-48 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse" />
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue('color', c, { shouldDirty: true })}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      backgroundColor: c,
                      boxShadow: watchedColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                    }}
                  />
                ))}
                <div className="flex items-center gap-2 ml-1">
                  <input
                    type="color"
                    value={watchedColor}
                    onChange={(e) => setValue('color', e.target.value, { shouldDirty: true })}
                    className="h-8 w-12 rounded border border-gray-200 dark:border-zinc-700 cursor-pointer p-0.5"
                  />
                  <span className="text-xs text-gray-400 font-mono">{watchedColor}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800">
            {isDirty && !saving && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Unsaved changes
              </p>
            )}
            <button
              type="submit"
              disabled={saving || loading}
              className="ml-auto flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : (
                <><Check size={14} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-6 bg-red-50/50 dark:bg-red-950/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
            <Trash2 size={16} />
          </div>
          <div>
            <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">Danger Zone</h3>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
              Deleting this workspace is permanent. All workspace-specific data will be archived.
            </p>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete Workspace
          </button>
        ) : (
          <div className="space-y-3 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              Type <strong className="font-mono">{workspaceName}</strong> to confirm deletion:
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={workspaceName}
              className="w-full rounded-md border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName(''); }}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-zinc-700 rounded-md hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirmName !== workspaceName || deleting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {deleting && <Loader2 size={13} className="animate-spin" />}
                Permanently Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
