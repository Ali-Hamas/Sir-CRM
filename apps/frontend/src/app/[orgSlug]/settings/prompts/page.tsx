'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  FileCode, Plus, Search, Filter, History, Copy, Trash2, Edit2, Play,
  Tag, Sliders, CheckCircle2, AlertCircle, Cpu, FolderPlus, RefreshCw, X, ChevronRight
} from 'lucide-react';

const STATUS_PRESETS: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: 'Published', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  DRAFT: { label: 'Draft', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  ARCHIVED: { label: 'Archived', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20' },
};

export default function PromptLibraryPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  const [prompts, setPrompts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Create / Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [tagsInput, setTagsInput] = useState('crm, lead');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewingPrompt, setPreviewingPrompt] = useState<any>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Version History Modal State
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionPrompt, setVersionPrompt] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const fetchPromptsData = async () => {
    setLoading(true);
    try {
      const [promptsRes, catRes] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/prompts?search=${search}&status=${statusFilter}&categoryId=${categoryFilter}`),
        apiFetch(`/organizations/${orgSlug}/prompts/categories`),
      ]);
      setPrompts(promptsRes || []);
      setCategories(catRes || []);
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromptsData();
  }, [orgSlug, search, statusFilter, categoryFilter]);

  const handleOpenAddModal = () => {
    setEditingPrompt(null);
    setName('CRM Lead Qualification Prompt');
    setDescription('Evaluates incoming CRM leads and generates next action recommendations');
    setCategoryId(categories[0]?.id || '');
    setSystemPrompt('You are an expert enterprise AI sales strategist for {{company_name}}.');
    setUserPrompt('Analyze the following lead info:\nLead Name: {{client_name}}\nNotes: {{meeting_notes}}\n\nProvide lead score (1-100) and next steps.');
    setStatus('DRAFT');
    setTagsInput('crm, sales, qualification');
    setTemperature(0.7);
    setMaxTokens(4096);
    setModalError('');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (prompt: any) => {
    setEditingPrompt(prompt);
    setName(prompt.name);
    setDescription(prompt.description || '');
    setCategoryId(prompt.categoryId || '');
    setSystemPrompt(prompt.systemPrompt || '');
    setUserPrompt(prompt.userPrompt || '');
    setStatus(prompt.status);
    setTagsInput(Array.isArray(prompt.tags) ? prompt.tags.join(', ') : '');
    setTemperature(prompt.temperature);
    setMaxTokens(prompt.maxTokens);
    setModalError('');
    setIsEditModalOpen(true);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userPrompt.trim()) return;

    setSaving(true);
    setModalError('');

    const tagsArray = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      if (editingPrompt) {
        await apiFetch(`/organizations/${orgSlug}/prompts/${editingPrompt.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name,
            description,
            categoryId: categoryId || undefined,
            systemPrompt,
            userPrompt,
            status,
            tags: tagsArray,
            temperature,
            maxTokens,
            changeSummary: `Updated parameters and prompt structure`,
          }),
        });
      } else {
        await apiFetch(`/organizations/${orgSlug}/prompts`, {
          method: 'POST',
          body: JSON.stringify({
            name,
            description,
            categoryId: categoryId || undefined,
            systemPrompt,
            userPrompt,
            status,
            tags: tagsArray,
            temperature,
            maxTokens,
          }),
        });
      }

      setIsEditModalOpen(false);
      fetchPromptsData();
    } catch (err: any) {
      console.error('Failed to save prompt:', err);
      setModalError(err.message || 'Failed to save prompt template');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPreviewModal = async (prompt: any) => {
    setPreviewingPrompt(prompt);
    const initialVals: Record<string, string> = {};
    if (prompt.variables) {
      prompt.variables.forEach((v: any) => {
        initialVals[v.name] = v.defaultValue || `Sample ${v.name}`;
      });
    }
    setPreviewValues(initialVals);
    setIsPreviewModalOpen(true);
    runPreview(prompt.systemPrompt, prompt.userPrompt, initialVals);
  };

  const runPreview = async (sys: string, user: string, vals: Record<string, string>) => {
    setPreviewLoading(true);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/prompts/preview`, {
        method: 'POST',
        body: JSON.stringify({
          systemPrompt: sys,
          userPrompt: user,
          variables: vals,
        }),
      });
      setPreviewResult(res);
    } catch (err) {
      console.error('Failed to generate prompt preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenVersionModal = async (prompt: any) => {
    setVersionPrompt(prompt);
    setVersionLoading(true);
    setIsVersionModalOpen(true);
    try {
      const versionsRes = await apiFetch(`/organizations/${orgSlug}/prompts/${prompt.id}/versions`);
      setVersions(versionsRes || []);
    } catch (err) {
      console.error('Failed to load prompt versions:', err);
    } finally {
      setVersionLoading(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore this previous version as current?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/prompts/${versionPrompt.id}/restore/${versionId}`, {
        method: 'POST',
      });
      setIsVersionModalOpen(false);
      fetchPromptsData();
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  };

  const handleDuplicatePrompt = async (id: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/prompts/${id}/duplicate`, {
        method: 'POST',
      });
      fetchPromptsData();
    } catch (err) {
      console.error('Failed to duplicate prompt:', err);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to archive this prompt template?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/prompts/${id}`, {
        method: 'DELETE',
      });
      fetchPromptsData();
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/prompts/categories`, {
        method: 'POST',
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });
      setNewCatName('');
      setNewCatDesc('');
      setIsCategoryModalOpen(false);
      fetchPromptsData();
    } catch (err) {
      console.error('Failed to create category:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <FileCode className="h-7 w-7 text-primary" />
            Enterprise Prompt Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Centralized prompt library with variable interpolation, version control, and live preview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <FolderPlus size={15} /> Add Category
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={15} /> Create Prompt
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search prompt templates or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-transparent"
          >
            <option value="">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-gray-500">Loading prompt templates...</div>
        ) : prompts.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
            <FileCode className="h-12 w-12 text-gray-400 mx-auto mb-3 opacity-40" />
            <h3 className="font-semibold text-gray-900 dark:text-white">No Prompt Templates Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Create your first enterprise prompt template to standardize AI prompts across CRM, Projects, and Workflows.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium mt-4"
            >
              <Plus size={14} /> Create First Prompt
            </button>
          </div>
        ) : (
          prompts.map((prompt) => {
            const statusInfo = STATUS_PRESETS[prompt.status] || STATUS_PRESETS.DRAFT;
            return (
              <div
                key={prompt.id}
                className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">{prompt.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        v{prompt.currentVersion}
                      </span>
                    </div>
                    {prompt.category && (
                      <span className="text-[11px] text-gray-500 font-medium">{prompt.category.name}</span>
                    )}
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2">{prompt.description}</p>

                {/* Prompt Preview Code Snippet */}
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 font-mono text-[11px] text-gray-800 dark:text-zinc-300 line-clamp-3">
                  {prompt.userPrompt}
                </div>

                {/* Metadata & Variables */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Sliders size={12} /> Temp: {prompt.temperature} | Max: {prompt.maxTokens}
                  </span>
                  {prompt.variables?.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded font-mono">
                      {prompt.variables.length} Variables ({prompt.variables.map((v: any) => `{{${v.name}}}`).join(', ')})
                    </span>
                  )}
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
                  <button
                    onClick={() => handleOpenPreviewModal(prompt)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Play size={13} /> Live Preview
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenVersionModal(prompt)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                      title="Version History"
                    >
                      <History size={15} />
                    </button>
                    <button
                      onClick={() => handleDuplicatePrompt(prompt.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                      title="Duplicate Prompt"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(prompt)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                      title="Edit Prompt"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20"
                      title="Archive Prompt"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Live Preview Modal */}
      {isPreviewModalOpen && previewingPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Play className="text-primary" size={18} />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Live Prompt Interpolator: {previewingPrompt.name}
                </h3>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Variable Inputs */}
            <div className="space-y-3 p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Variable Inspector & Test Values</h4>
              {previewingPrompt.variables?.length === 0 ? (
                <p className="text-xs text-gray-400">No variable placeholders found in prompt.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previewingPrompt.variables?.map((v: any) => (
                    <div key={v.id || v.name}>
                      <label className="block text-[11px] font-mono mb-1 text-gray-700 dark:text-zinc-300">
                        {`{{${v.name}}}`}
                      </label>
                      <input
                        type="text"
                        value={previewValues[v.name] || ''}
                        onChange={(e) => {
                          const updated = { ...previewValues, [v.name]: e.target.value };
                          setPreviewValues(updated);
                          runPreview(previewingPrompt.systemPrompt, previewingPrompt.userPrompt, updated);
                        }}
                        placeholder={`Enter ${v.name}...`}
                        className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compiled Output View */}
            {previewResult && (
              <div className="space-y-3">
                {previewResult.compiledSystemPrompt && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 mb-1">Compiled System Instruction</h4>
                    <div className="p-3 rounded-lg bg-gray-900 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                      {previewResult.compiledSystemPrompt}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 mb-1">Compiled User Prompt Payload</h4>
                  <div className="p-3 rounded-lg bg-gray-900 text-blue-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    {previewResult.compiledUserPrompt}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                  <span>Detected Placeholders: {previewResult.placeholdersDetected?.join(', ') || 'None'}</span>
                  <span className={previewResult.isFullyResolved ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {previewResult.isFullyResolved ? '✓ All Variables Interpolated' : `⚠ Missing: ${previewResult.missingVariables?.join(', ')}`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {isVersionModalOpen && versionPrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="text-primary" size={18} />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Version History: {versionPrompt.name}
                </h3>
              </div>
              <button onClick={() => setIsVersionModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {versionLoading ? (
              <div className="p-8 text-center text-gray-500">Loading versions...</div>
            ) : (
              <div className="space-y-3">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-white">
                          v{ver.versionNumber}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{ver.changeSummary}</span>
                      </div>
                      {ver.versionNumber === versionPrompt.currentVersion ? (
                        <span className="text-xs font-semibold text-emerald-600">Active Current Version</span>
                      ) : (
                        <button
                          onClick={() => handleRestoreVersion(ver.id)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Restore Version
                        </button>
                      )}
                    </div>

                    <div className="p-2.5 rounded bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 font-mono text-xs text-gray-800 dark:text-zinc-200 line-clamp-3">
                      {ver.userPrompt}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                      <span>Created by {ver.creator?.firstName || 'Admin'}</span>
                      <span>{new Date(ver.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Prompt Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {editingPrompt ? `Edit Prompt Template (v${editingPrompt.currentVersion})` : 'Create Prompt Template'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSavePrompt} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Prompt Title *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sales Proposal Generator"
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <option value="">Unassigned Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this prompt accomplish?"
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                  System Instruction Prompt
                </label>
                <textarea
                  rows={2}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="e.g. You are an expert Enterprise AI assistant for {{company_name}}."
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                  User Prompt Payload * (Use placeholders like &#123;&#123;client_name&#125;&#125;)
                </label>
                <textarea
                  rows={5}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Analyze lead info for {{client_name}}..."
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Temperature ({temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Max Output Tokens</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="crm, sales, lead"
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Prompt Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Create Prompt Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Sales & CRM Prompts"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Description</label>
                <input
                  type="text"
                  placeholder="Optional details"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
