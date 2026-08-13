'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Bot, Cpu, Plus, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Search, Shield, Key, Eye, EyeOff, Star, Trash2, Edit2, Zap, Settings2, Sliders
} from 'lucide-react';

const PROVIDER_PRESETS: Record<string, { name: string; color: string; badge: string; defaultUrl: string }> = {
  OPENAI: { name: 'OpenAI', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', badge: 'GPT-4o / GPT-4', defaultUrl: 'https://api.openai.com/v1' },
  ANTHROPIC: { name: 'Anthropic Claude', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', badge: 'Claude 3.5 Sonnet', defaultUrl: 'https://api.anthropic.com/v1' },
  GEMINI: { name: 'Google Gemini', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', badge: 'Gemini 1.5 Pro', defaultUrl: 'https://generativelanguage.googleapis.com/v1' },
  DEEPSEEK: { name: 'DeepSeek', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20', badge: 'DeepSeek V3 / R1', defaultUrl: 'https://api.deepseek.com/v1' },
  OPENROUTER: { name: 'OpenRouter', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', badge: 'Multi-Model Router', defaultUrl: 'https://openrouter.ai/api/v1' },
  OLLAMA: { name: 'Ollama (Local Models)', color: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20', badge: 'Llama 3 / Mistral', defaultUrl: 'http://localhost:11434' },
};

export default function AISettingsPage({ params }: { params: { orgSlug: string } }) {
  const { orgSlug } = params;

  const [providers, setProviders] = useState<any[]>([]);
  const [allModels, setAllModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PROVIDERS' | 'MODELS'>('PROVIDERS');
  const [search, setSearch] = useState('');

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [providerType, setProviderType] = useState('OPENAI');
  const [name, setName] = useState('OpenAI Production');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [enabled, setEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Connection Test Modal State
  const [testResult, setTestResult] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchAIData = async () => {
    setLoading(true);
    try {
      const [providersRes, modelsRes] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/ai/providers`),
        apiFetch(`/organizations/${orgSlug}/ai/models`),
      ]);
      setProviders(providersRes || []);
      setAllModels(modelsRes || []);
    } catch (err) {
      console.error('Failed to load AI provider data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIData();
  }, [orgSlug]);

  const handleOpenAddModal = () => {
    setEditingProvider(null);
    setProviderType('OPENAI');
    setName('OpenAI Production');
    setApiKey('');
    setBaseUrl('https://api.openai.com/v1');
    setEnabled(true);
    setIsDefault(providers.length === 0);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (provider: any) => {
    setEditingProvider(provider);
    setProviderType(provider.providerType);
    setName(provider.name);
    setApiKey('');
    setBaseUrl(provider.baseUrl || PROVIDER_PRESETS[provider.providerType]?.defaultUrl || '');
    setEnabled(provider.enabled);
    setIsDefault(provider.isDefault);
    setError('');
    setIsModalOpen(true);
  };

  const handleSelectProviderType = (type: string) => {
    setProviderType(type);
    setName(`${PROVIDER_PRESETS[type]?.name || type} Provider`);
    setBaseUrl(PROVIDER_PRESETS[type]?.defaultUrl || '');
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      if (editingProvider) {
        await apiFetch(`/organizations/${orgSlug}/ai/providers/${editingProvider.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name,
            apiKey: apiKey || undefined,
            baseUrl: baseUrl || undefined,
            enabled,
            isDefault,
          }),
        });
      } else {
        await apiFetch(`/organizations/${orgSlug}/ai/providers`, {
          method: 'POST',
          body: JSON.stringify({
            name,
            providerType,
            apiKey,
            baseUrl,
            enabled,
            isDefault,
          }),
        });
      }

      setIsModalOpen(false);
      fetchAIData();
    } catch (err: any) {
      console.error('Failed to save provider:', err);
      setError(err.message || 'Failed to save AI Provider configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnable = async (provider: any) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/ai/providers/${provider.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !provider.enabled }),
      });
      fetchAIData();
    } catch (err) {
      console.error('Failed to toggle provider:', err);
    }
  };

  const handleSetDefault = async (provider: any) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/ai/providers/${provider.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
      });
      fetchAIData();
    } catch (err) {
      console.error('Failed to set default provider:', err);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI Provider configuration?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/ai/providers/${id}`, {
        method: 'DELETE',
      });
      fetchAIData();
    } catch (err) {
      console.error('Failed to delete provider:', err);
    }
  };

  const handleTestConnection = async (provider: any) => {
    setTestingId(provider.id);
    setTestResult(null);
    try {
      const res = await apiFetch(`/organizations/${orgSlug}/ai/providers/${provider.id}/test`, {
        method: 'POST',
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        providerId: provider.id,
        providerName: provider.name,
        status: 'OFFLINE',
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  const filteredProviders = providers.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.providerType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            AI Provider Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Configure multi-provider LLM infrastructure (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Ollama).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAIData}
            className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-gray-600 dark:text-zinc-300"
            title="Refresh Data"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Configure AI Provider
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className="text-amber-600 shrink-0" />
          <span>
            <strong>Enterprise Security:</strong> All API keys are encrypted at rest using AES-256-GCM. Secret values are never sent raw to frontend clients.
          </span>
        </div>
        <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">Super Admin</span>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('PROVIDERS')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'PROVIDERS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Configured Providers ({providers.length})
          </button>
          <button
            onClick={() => setActiveTab('MODELS')}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'MODELS' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Available AI Models ({allModels.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search providers or models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
          />
        </div>
      </div>

      {/* Providers Tab */}
      {activeTab === 'PROVIDERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 p-12 text-center text-gray-500">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading AI Providers...
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="col-span-2 p-12 text-center bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800">
              <Cpu className="h-12 w-12 text-gray-400 mx-auto mb-3 opacity-40" />
              <h3 className="font-semibold text-gray-900 dark:text-white">No AI Providers Configured</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Add an AI provider (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, or Ollama) to enable intelligence features across Blackdesk OS.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium mt-4"
              >
                <Plus size={14} /> Add First Provider
              </button>
            </div>
          ) : (
            filteredProviders.map((provider) => {
              const preset = PROVIDER_PRESETS[provider.providerType] || { name: provider.providerType, color: 'bg-gray-100 text-gray-800', badge: 'AI Model' };
              return (
                <div
                  key={provider.id}
                  className={`p-5 rounded-xl border transition-all bg-white dark:bg-zinc-900 space-y-4 ${
                    provider.isDefault
                      ? 'border-primary/50 ring-1 ring-primary/20 shadow-md'
                      : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Cpu size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-gray-900 dark:text-white">{provider.name}</h3>
                          {provider.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Star size={10} className="fill-amber-500" /> DEFAULT
                            </span>
                          )}
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-1 border ${preset.color}`}>
                          {preset.badge}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleEnable(provider)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        provider.enabled
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {provider.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-zinc-800/80 text-xs">
                    <div className="flex justify-between items-center text-gray-500 dark:text-zinc-400">
                      <span>API Secret Key:</span>
                      <span className="font-mono bg-gray-100 dark:bg-zinc-950 px-2 py-0.5 rounded text-gray-800 dark:text-zinc-200">
                        {provider.apiKeyMasked}
                      </span>
                    </div>
                    {provider.baseUrl && (
                      <div className="flex justify-between items-center text-gray-500 dark:text-zinc-400">
                        <span>Base Endpoint URL:</span>
                        <span className="font-mono text-gray-700 dark:text-zinc-300 truncate max-w-[200px]">
                          {provider.baseUrl}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-gray-500 dark:text-zinc-400">
                      <span>Active Models:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {provider.models?.length || 0} Models Configured
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <button
                      onClick={() => handleTestConnection(provider)}
                      disabled={testingId === provider.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                    >
                      <Zap size={14} />
                      {testingId === provider.id ? 'Pinging Endpoint...' : 'Test Connection'}
                    </button>

                    <div className="flex items-center gap-2">
                      {!provider.isDefault && (
                        <button
                          onClick={() => handleSetDefault(provider)}
                          className="text-xs text-gray-500 hover:text-amber-600 font-medium px-2 py-1 rounded hover:bg-amber-500/10"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(provider)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
                        title="Edit Provider"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        title="Delete Provider"
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

      {/* Models Tab */}
      {activeTab === 'MODELS' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 text-xs font-medium text-gray-500 dark:text-zinc-400 border-b border-gray-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Model Name</th>
                  <th className="px-6 py-3.5">Provider</th>
                  <th className="px-6 py-3.5">Max Output Tokens</th>
                  <th className="px-6 py-3.5">Context Window</th>
                  <th className="px-6 py-3.5">Temperature</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {allModels.map((model) => (
                  <tr key={model.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {model.displayName}
                      <span className="block text-xs font-mono font-normal text-gray-500">{model.modelName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {model.providerName} ({model.providerType})
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-zinc-300">
                      {model.maxTokens?.toLocaleString()} tokens
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-zinc-300">
                      {model.contextWindow ? `${(model.contextWindow / 1000).toFixed(0)}k tokens` : '-'}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-zinc-300">
                      {model.temperature}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Test Result Drawer */}
      {testResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${testResult.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                {testResult.status === 'ONLINE' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Connection Test: {testResult.status}
                </h3>
                <p className="text-xs text-gray-500">{testResult.providerName} ({testResult.providerType})</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 text-xs font-mono space-y-1">
              <p className="text-gray-800 dark:text-zinc-200">{testResult.message}</p>
              {testResult.latencyMs && <p className="text-gray-500">Latency: {testResult.latencyMs}ms</p>}
              <p className="text-gray-400 text-[10px]">Tested at: {testResult.testedAt}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTestResult(null)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90"
              >
                Close Test Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {editingProvider ? 'Edit AI Provider' : 'Configure New AI Provider'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProvider} className="space-y-4">
              {!editingProvider && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Select Provider Platform *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(PROVIDER_PRESETS).map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => handleSelectProviderType(type)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all ${
                          providerType === type
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span>{PROVIDER_PRESETS[type].name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Provider Name / Alias *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OpenAI Production"
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">
                  {providerType === 'OLLAMA' ? 'API Key (Optional for Local Ollama)' : 'API Key Secret *'}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={editingProvider ? 'Leave empty to keep existing key' : 'sk-proj-...'}
                    className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 pl-3 pr-9 py-2 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-zinc-300">Base Endpoint URL (Optional Override)</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-primary"
                  />
                  Enable Provider immediately
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-gray-300 text-primary"
                  />
                  Set as Default LLM Provider
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-zinc-800">
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
                  {saving ? 'Saving Provider...' : 'Save AI Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
