'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import {
  Brain, Cpu, Plus, Search, Filter, Star, Pin, Trash2, Edit2, Play,
  Zap, Database, Layers, Sparkles, RefreshCw, X, Tag, UserCheck, Shield, Check
} from 'lucide-react';

const MEMORY_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  USER: { label: 'User Memory', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  ORGANIZATION: { label: 'Organization Memory', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  WORKSPACE: { label: 'Workspace Memory', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  CONVERSATION: { label: 'Conversation Memory', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  CRM: { label: 'CRM Memory', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  PROJECT: { label: 'Project Memory', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  KNOWLEDGE: { label: 'Knowledge Memory', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

export default function AIMemoryPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  const [memories, setMemories] = useState<any[]>([]);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EXPLORER' | 'CONTEXT_BUILDER' | 'PREFERENCES'>('EXPLORER');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [memoryType, setMemoryType] = useState('CRM');
  const [summary, setSummary] = useState('');
  const [source, setSource] = useState('CRM');
  const [tagsInput, setTagsInput] = useState('vip, enterprise');
  const [importance, setImportance] = useState(8);
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  // Context Builder State
  const [contextResult, setContextResult] = useState<any>(null);
  const [buildingContext, setBuildingContext] = useState(false);

  // Preference Form State
  const [aiTone, setAiTone] = useState('Professional & Concise');
  const [contextDepth, setContextDepth] = useState('Full Enterprise Context');
  const [prefSaving, setPrefSaving] = useState(false);

  const fetchMemoryData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [memoriesRes, prefsRes] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/ai/memory?search=${search}&memoryType=${typeFilter}&source=${sourceFilter}`),
        apiFetch(`/organizations/${orgSlug}/ai/memory/preferences`),
      ]);
      setMemories(memoriesRes || []);
      setPreferences(prefsRes || []);

      if (prefsRes && prefsRes.length > 0) {
        const toneObj = prefsRes.find((p: any) => p.preferenceKey === 'AI_TONE');
        if (toneObj) setAiTone(toneObj.preferenceValue);
        const depthObj = prefsRes.find((p: any) => p.preferenceKey === 'CONTEXT_DEPTH');
        if (depthObj) setContextDepth(depthObj.preferenceValue);
      }
    } catch (err: any) {
      console.error('Failed to load AI memory data:', err);
      setApiError(err?.message || 'Failed to load AI Memory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoryData();
  }, [orgSlug, search, typeFilter, sourceFilter]);

  const handleOpenAddModal = () => {
    setEditingMemory(null);
    setTitle('Acme Corp Preferred SLA Terms');
    setMemoryType('CRM');
    setSummary('Client requires 24/7 dedicated support escalation and 99.9% uptime SLA guarantee.');
    setSource('CRM');
    setTagsInput('crm, sla, enterprise');
    setImportance(9);
    setIsPinned(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mem: any) => {
    setEditingMemory(mem);
    setTitle(mem.title);
    setMemoryType(mem.memoryType);
    setSummary(mem.summary);
    setSource(mem.source);
    setTagsInput(Array.isArray(mem.tags) ? mem.tags.join(', ') : '');
    setImportance(mem.importance);
    setIsPinned(mem.isPinned);
    setIsModalOpen(true);
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;

    setSaving(true);
    const tagsArray = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      if (editingMemory) {
        await apiFetch(`/organizations/${orgSlug}/ai/memory/${editingMemory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title,
            summary,
            tags: tagsArray,
            importance,
            isPinned,
          }),
        });
      } else {
        await apiFetch(`/organizations/${orgSlug}/ai/memory`, {
          method: 'POST',
          body: JSON.stringify({
            title,
            memoryType,
            summary,
            source,
            tags: tagsArray,
            importance,
            isPinned,
          }),
        });
      }

      setIsModalOpen(false);
      fetchMemoryData();
    } catch (err) {
      console.error('Failed to save AI memory:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('Are you sure you want to archive this AI Memory record?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/ai/memory/${id}`, { method: 'DELETE' });
      fetchMemoryData();
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleBuildContext = async () => {
    setBuildingContext(true);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/ai/context/build`, {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'ORGANIZATION_SUMMARY',
          entityId: orgSlug,
        }),
      });
      setContextResult(res);
    } catch (err) {
      console.error('Failed to build context:', err);
    } finally {
      setBuildingContext(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaving(true);
    try {
      await Promise.all([
        apiFetch(`/organizations/${orgSlug}/ai/memory/preferences`, {
          method: 'POST',
          body: JSON.stringify({ preferenceKey: 'AI_TONE', preferenceValue: aiTone }),
        }),
        apiFetch(`/organizations/${orgSlug}/ai/memory/preferences`, {
          method: 'POST',
          body: JSON.stringify({ preferenceKey: 'CONTEXT_DEPTH', preferenceValue: contextDepth }),
        }),
      ]);
      fetchMemoryData();
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setPrefSaving(false);
    }
  };

  const filteredMemories = memories.filter(
    (m) => m.title.toLowerCase().includes(search.toLowerCase()) || m.summary.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            Enterprise AI Memory & Context Engine
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Centralized memory repository & context builder powering intelligent AI assistants across Blackdesk OS.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMemoryData}
            className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-zinc-300"
            title="Refresh Memory Repository"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Add Memory Record
          </button>
        </div>
      </div>

      {/* Top Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-gray-500 font-medium">Total AI Memories</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{memories.length}</div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-gray-500 font-medium">Pinned High-Priority</div>
          <div className="text-2xl font-bold text-amber-500 mt-1">
            {memories.filter((m) => m.isPinned).length}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-gray-500 font-medium">Avg Importance Rating</div>
          <div className="text-2xl font-bold text-primary mt-1">
            {memories.length ? (memories.reduce((acc, m) => acc + (m.importance || 5), 0) / memories.length).toFixed(1) : '5.0'} / 10
          </div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="text-xs text-gray-500 font-medium">Multi-Module Sources</div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">7 Modules</div>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('EXPLORER')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'EXPLORER' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Memory Explorer ({filteredMemories.length})
          </button>
          <button
            onClick={() => { setActiveTab('CONTEXT_BUILDER'); if (!contextResult) handleBuildContext(); }}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'CONTEXT_BUILDER' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Live Context Builder
          </button>
          <button
            onClick={() => setActiveTab('PREFERENCES')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'PREFERENCES' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            User AI Preferences
          </button>
        </div>

        {activeTab === 'EXPLORER' && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Memory Explorer */}
      {activeTab === 'EXPLORER' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 p-12 text-center text-gray-500">Loading AI memories...</div>
          ) : filteredMemories.length === 0 ? (
            <div className="col-span-2 p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3 opacity-40" />
              <h3 className="font-semibold text-gray-900 dark:text-white">No AI Memories Found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Add an AI memory record or connect CRM, Projects, or Knowledge Base to automatically populate memory.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium mt-4"
              >
                <Plus size={14} /> Add First Memory
              </button>
            </div>
          ) : (
            filteredMemories.map((mem) => {
              const badge = MEMORY_TYPE_BADGES[mem.memoryType] || MEMORY_TYPE_BADGES.ORGANIZATION;
              return (
                <div
                  key={mem.id}
                  className="p-5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white">{mem.title}</h3>
                        {mem.isPinned && <Pin size={14} className="text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mt-1 ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg text-xs font-bold">
                      <Star size={12} className="fill-amber-500" />
                      <span>{mem.importance} / 10</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">{mem.summary}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800 text-[11px]">
                    <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-600 dark:text-zinc-400 font-semibold">
                      Source: {mem.source}
                    </span>
                    {mem.tags?.map((t: string) => (
                      <span key={t} className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] text-gray-400">
                      Created: {new Date(mem.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(mem)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                        title="Edit Memory"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        title="Archive Memory"
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
      )}

      {/* Tab 2: Live Context Builder */}
      {activeTab === 'CONTEXT_BUILDER' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="text-primary" size={24} />
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Unified Multi-Module Context Aggregator</h3>
                <p className="text-xs text-gray-500">Compiles real-time enterprise context from CRM, Projects, Knowledge, and Meetings.</p>
              </div>
            </div>
            <button
              onClick={handleBuildContext}
              disabled={buildingContext}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              <RefreshCw size={14} className={buildingContext ? 'animate-spin' : ''} />
              {buildingContext ? 'Compiling Context...' : 'Re-compile Live Context'}
            </button>
          </div>

          {contextResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Compiled System Context Prompt</h4>
                <div className="p-3 rounded-lg bg-gray-900 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                  {contextResult.compiledSystemContextString}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Structured Data Payload (JSON)</h4>
                <div className="p-3 rounded-lg bg-gray-900 text-blue-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-80">
                  {JSON.stringify(contextResult.dataSources, null, 2)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: User AI Preferences */}
      {activeTab === 'PREFERENCES' && (
        <div className="p-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 max-w-xl space-y-4">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Personal AI Persona Preferences</h3>
            <p className="text-xs text-gray-500 mt-0.5">Customize how AI assistants interact with your user profile.</p>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">AI Response Tone</label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="Professional & Concise">Professional & Concise</option>
                <option value="Detailed & Analytical">Detailed & Analytical</option>
                <option value="Creative & Strategic">Creative & Strategic</option>
                <option value="Executive Summary Style">Executive Summary Style</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Default Context Window Depth</label>
              <select
                value={contextDepth}
                onChange={(e) => setContextDepth(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="Full Enterprise Context">Full Enterprise Context (CRM + Projects + Knowledge)</option>
                <option value="Project-Focused Context">Project-Focused Context Only</option>
                <option value="CRM & Sales Context">CRM & Sales Context Only</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={prefSaving}
                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {prefSaving ? 'Saving...' : 'Save AI Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Memory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {editingMemory ? 'Edit Memory Record' : 'Add AI Memory Record'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMemory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Memory Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Preferred SLA & Billing Terms"
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Memory Type</label>
                  <select
                    value={memoryType}
                    onChange={(e) => setMemoryType(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  >
                    {Object.keys(MEMORY_TYPE_BADGES).map((type) => (
                      <option key={type} value={type}>{MEMORY_TYPE_BADGES[type].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Source Module</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  >
                    <option value="CRM">CRM Module</option>
                    <option value="PROJECT">Project Management</option>
                    <option value="KNOWLEDGE">Knowledge Base</option>
                    <option value="MEETING">Meetings</option>
                    <option value="CONVERSATION">Conversation History</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Memory Summary *</label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summary text for AI context..."
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                  Importance Rating ({importance} / 10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={importance}
                  onChange={(e) => setImportance(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="crm, sla, enterprise"
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Memory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
