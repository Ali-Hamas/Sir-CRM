'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Database, Search, Layers, RefreshCw, FileText, Cpu, Sliders,
  CheckCircle2, AlertCircle, Sparkles, Filter, ChevronRight, Target,
  Briefcase, BookOpen, Workflow, Zap, Code, Shield, Save
} from 'lucide-react';

interface RAGStats {
  indexId: string;
  name: string;
  chunkStrategy: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingProvider: string;
  embeddingModel: string;
  dimensions: number;
  status: string;
  totalDocuments: number;
  totalChunks: number;
  lastIndexedAt: string | null;
}

interface SearchResultChunk {
  chunkId: string;
  documentId: string;
  sourceType: string;
  title: string;
  content: string;
  relevanceScore: number;
  tokenCount: number;
  metadata: any;
}

interface SearchResponse {
  searchId: string;
  query: string;
  searchType: string;
  totalMatches: number;
  executionTimeMs: number;
  results: SearchResultChunk[];
}

interface ContextResponse {
  query: string;
  tokensUsed: number;
  tokenLimit: number;
  sourcesCount: number;
  includedChunksCount: number;
  contextBySource: Record<string, any[]>;
  includedChunks: any[];
  promptContextFormatted: string;
}

const DATA_SOURCES = [
  { key: 'CRM_COMPANY', label: 'CRM Companies', icon: Target },
  { key: 'CRM_CONTACT', label: 'CRM Contacts', icon: Target },
  { key: 'PROJECT', label: 'Projects', icon: Briefcase },
  { key: 'TASK', label: 'Tasks', icon: CheckCircle2 },
  { key: 'KNOWLEDGE', label: 'Knowledge Base', icon: BookOpen },
  { key: 'DOCUMENT', label: 'Documents Library', icon: FileText },
  { key: 'WORKFLOW_LOG', label: 'Workflow Logs', icon: Workflow },
];

export default function RAGEnginePage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'index' | 'search' | 'context' | 'settings'>('overview');
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);

  // Search Tester state
  const [searchQuery, setSearchQuery] = useState('marketing plan client project');
  const [searchType, setSearchType] = useState('HYBRID');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Context Builder Preview state
  const [contextQuery, setContextQuery] = useState('Q3 project timeline and proposal for Acme Corp');
  const [contextResult, setContextResult] = useState<ContextResponse | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    chunkStrategy: 'PARAGRAPH',
    chunkSize: 512,
    chunkOverlap: 64,
    embeddingProvider: 'OPENAI',
    embeddingModel: 'text-embedding-3-small',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/rag/stats`);
      setStats(data);
      setSettingsForm({
        chunkStrategy: data.chunkStrategy || 'PARAGRAPH',
        chunkSize: data.chunkSize || 512,
        chunkOverlap: data.chunkOverlap || 64,
        embeddingProvider: data.embeddingProvider || 'OPENAI',
        embeddingModel: data.embeddingModel || 'text-embedding-3-small',
      });
    } catch (err) {
      console.error('Failed to load RAG stats:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleTriggerIndexing = async () => {
    setIndexing(true);
    setIndexMessage(null);
    try {
      const result = await apiFetch(`/organizations/${orgSlug}/rag/index`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setIndexMessage(`Successfully indexed ${result.totalDocumentsIndexed} documents into ${result.totalChunksIndexed} vector chunks.`);
      fetchStats();
    } catch (err: any) {
      setIndexMessage(err.message || 'Indexing failed');
    } finally {
      setIndexing(false);
    }
  };

  const handleExecuteSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchLoading) return;
    setSearchLoading(true);

    try {
      const res = await apiFetch(`/organizations/${orgSlug}/rag/search`, {
        method: 'POST',
        body: JSON.stringify({
          query: searchQuery,
          searchType,
          sourceFilters: selectedSources.length > 0 ? selectedSources : undefined,
          topK: 6,
        }),
      });
      setSearchResults(res);
    } catch (err) {
      console.error('Failed to execute search:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleBuildContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextQuery.trim() || contextLoading) return;
    setContextLoading(true);

    try {
      const res = await apiFetch(`/organizations/${orgSlug}/rag/context`, {
        method: 'POST',
        body: JSON.stringify({
          query: contextQuery,
          maxTokenLimit: 2048,
        }),
      });
      setContextResult(res);
    } catch (err) {
      console.error('Failed to build context payload:', err);
    } finally {
      setContextLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/rag/settings`, {
        method: 'PATCH',
        body: JSON.stringify(settingsForm),
      });
      fetchStats();
      setIndexMessage('RAG Engine settings updated successfully.');
    } catch (err: any) {
      console.error('Failed to save RAG settings:', err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const toggleSourceFilter = (key: string) => {
    setSelectedSources((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-purple-600/10 via-indigo-500/5 to-blue-600/10 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Database size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Enterprise RAG Engine
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                stats?.status === 'READY'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {stats?.status === 'READY' ? 'Index Ready' : 'Indexing'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Retrieval-Augmented Generation engine assembling workspace intelligence before AI execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerIndexing}
            disabled={indexing}
            className="px-4 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={indexing ? 'animate-spin' : ''} />
            {indexing ? 'Indexing Workspace...' : 'Re-Index Workspace'}
          </button>
        </div>
      </div>

      {indexMessage && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center justify-between">
          <span>{indexMessage}</span>
          <button onClick={() => setIndexMessage(null)} className="text-blue-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide pb-0.5">
        {[
          { id: 'overview', label: 'RAG Overview', icon: Sparkles },
          { id: 'index', label: 'Index Manager', icon: Layers },
          { id: 'search', label: 'Search Tester', icon: Search },
          { id: 'context', label: 'Context Builder Preview', icon: Code },
          { id: 'settings', label: 'Statistics & Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Indexed Documents</span>
                <FileText className="text-primary" size={18} />
              </div>
              <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {stats?.totalDocuments || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Workspace Sources</p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Vector Chunks</span>
                <Layers className="text-purple-500" size={18} />
              </div>
              <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {stats?.totalChunks || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Chunk Strategy: {stats?.chunkStrategy}</p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Vector Provider</span>
                <Cpu className="text-indigo-500" size={18} />
              </div>
              <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {stats?.embeddingProvider}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats?.dimensions}-dim Placeholder</p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Last Indexed</span>
                <RefreshCw className="text-emerald-500" size={18} />
              </div>
              <p className="text-base font-bold mt-2 text-gray-900 dark:text-white truncate">
                {stats?.lastIndexedAt ? new Date(stats.lastIndexedAt).toLocaleTimeString() : 'Never'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Auto-Synced</p>
            </div>
          </div>

          {/* Supported Data Sources Status */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Indexed Multi-Source Data Coverage
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DATA_SOURCES.map((source) => {
                const Icon = source.icon;
                return (
                  <div key={source.key} className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800/80 bg-gray-50 dark:bg-zinc-950 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-xs text-gray-900 dark:text-white">{source.label}</p>
                        <p className="text-[10px] font-mono text-gray-400">{source.key}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                      ACTIVE
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Index Manager */}
      {activeTab === 'index' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Index Manager</h2>
              <p className="text-xs text-gray-500">Manage indexed entity documents and vector chunk counts</p>
            </div>
            <button
              onClick={handleTriggerIndexing}
              disabled={indexing}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={indexing ? 'animate-spin' : ''} />
              Re-Index Now
            </button>
          </div>

          <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 p-8 text-center space-y-3">
            <Layers size={40} className="mx-auto text-primary" />
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">RAG Index Health Summary</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Your RAG Index currently contains <span className="font-semibold text-gray-900 dark:text-white">{stats?.totalDocuments} documents</span> split into <span className="font-semibold text-gray-900 dark:text-white">{stats?.totalChunks} text chunks</span> using <span className="font-mono">{stats?.chunkStrategy}</span> chunking.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Search Tester */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Bar & Filters Form */}
          <form onSubmit={handleExecuteSearch} className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter RAG search query (e.g. project deadline, company status)..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                className="px-6 py-3 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Search size={16} /> {searchLoading ? 'Searching...' : 'Search RAG'}
              </button>
            </div>

            {/* Source Filters Toggle Bar */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pt-2">
              <span className="text-xs font-medium text-gray-500 shrink-0">Filter Sources:</span>
              {DATA_SOURCES.map((source) => {
                const isSelected = selectedSources.includes(source.key);
                return (
                  <button
                    key={source.key}
                    type="button"
                    onClick={() => toggleSourceFilter(source.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-primary text-white font-semibold'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200'
                    }`}
                  >
                    {source.label}
                  </button>
                );
              })}
            </div>
          </form>

          {/* Search Results List */}
          {searchResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                <span>Found {searchResults.totalMatches} relevant chunks</span>
                <span className="font-mono">Execution Time: {searchResults.executionTimeMs}ms</span>
              </div>

              <div className="space-y-3">
                {searchResults.results.map((res, index) => (
                  <div key={res.chunkId} className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary font-mono">#{index + 1}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                          {res.sourceType}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {res.title}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-mono">
                        Relevance: {res.relevanceScore}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-950 p-3 rounded-xl border border-gray-100 dark:border-zinc-800/80 font-sans leading-relaxed">
                      {res.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Context Builder Preview */}
      {activeTab === 'context' && (
        <div className="space-y-6">
          <form onSubmit={handleBuildContext} className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <Code size={16} className="text-primary" /> RAG Context Builder Generator
            </h3>
            <p className="text-xs text-gray-500">Assembles ranked multi-source context into a structured JSON payload ready for AI prompts</p>

            <div className="flex gap-2">
              <input
                type="text"
                value={contextQuery}
                onChange={(e) => setContextQuery(e.target.value)}
                placeholder="Enter prompt query to assemble context..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
              />
              <button
                type="submit"
                disabled={contextLoading}
                className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-xs shadow-md flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <Sparkles size={14} /> {contextLoading ? 'Building...' : 'Assemble Context'}
              </button>
            </div>
          </form>

          {contextResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formatted Text Payload */}
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">Prompt Ready Context Text</h4>
                <pre className="p-4 rounded-xl bg-gray-950 text-gray-100 text-xs font-mono overflow-x-auto max-h-[400px] leading-relaxed whitespace-pre-wrap">
                  {contextResult.promptContextFormatted}
                </pre>
              </div>

              {/* Structured JSON Payload */}
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">Structured Context JSON</h4>
                <pre className="p-4 rounded-xl bg-gray-950 text-emerald-400 text-xs font-mono overflow-x-auto max-h-[400px] leading-relaxed">
                  {JSON.stringify(contextResult, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Statistics & Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-6">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">RAG Engine Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Chunking Strategy
              </label>
              <select
                value={settingsForm.chunkStrategy}
                onChange={(e) => setSettingsForm({ ...settingsForm, chunkStrategy: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
              >
                <option value="PARAGRAPH">Paragraph Chunking (\n\n)</option>
                <option value="MARKDOWN">Markdown Header Chunking (#)</option>
                <option value="SENTENCE">Sentence Chunking (.)</option>
                <option value="DOCUMENT">Full Document Chunking</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Embedding Provider
              </label>
              <select
                value={settingsForm.embeddingProvider}
                onChange={(e) => setSettingsForm({ ...settingsForm, embeddingProvider: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
              >
                <option value="OPENAI">OpenAI (1536 dim)</option>
                <option value="GEMINI">Google Gemini Embeddings</option>
                <option value="CLAUDE">Anthropic Claude</option>
                <option value="OLLAMA">Ollama Local Embeddings</option>
                <option value="OPENROUTER">OpenRouter Multi-Provider</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Chunk Size ({settingsForm.chunkSize} chars)
              </label>
              <input
                type="number"
                value={settingsForm.chunkSize}
                onChange={(e) => setSettingsForm({ ...settingsForm, chunkSize: parseInt(e.target.value) || 512 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Chunk Overlap ({settingsForm.chunkOverlap} chars)
              </label>
              <input
                type="number"
                value={settingsForm.chunkOverlap}
                onChange={(e) => setSettingsForm({ ...settingsForm, chunkOverlap: parseInt(e.target.value) || 64 })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="submit"
              disabled={settingsSaving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} /> {settingsSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
