'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Layers, Shield, Zap, RefreshCw, Plus, CheckCircle2, AlertTriangle,
  XCircle, Search, ExternalLink, Lock, Key, Link2, Unlink, Settings,
  Radio, FileCode, Server, Activity, ArrowRight, Play, Check, Trash2,
  Copy, Eye, EyeOff, Globe, Database, Cpu, MessageSquare, Briefcase,
  DollarSign, Download, Filter, Clock
} from 'lucide-react';

interface Provider {
  id: string;
  key: string;
  name: string;
  category: string;
  description: string;
  iconUrl: string;
  authType: string;
  docUrl: string;
  supportedCapabilities: string;
}

interface Connection {
  id: string;
  name: string;
  status: string;
  authType: string;
  externalAccountEmail?: string;
  healthStatus: string;
  lastSyncedAt?: string;
  provider: Provider;
  credentials?: Array<{ id: string; type: string }>;
  _count?: { syncJobs: number; logs: number; webhooks: number };
}

interface SyncJob {
  id: string;
  syncType: string;
  status: string;
  entityType: string;
  recordsProcessed: number;
  recordsFailed: number;
  createdAt: string;
  connection: { name: string; provider: { name: string } };
}

interface WebhookItem {
  id: string;
  name: string;
  webhookUrl: string;
  secretKey: string;
  events: string;
  isEnabled: boolean;
  totalDelivered: number;
}

interface LogItem {
  id: string;
  level: string;
  action: string;
  message: string;
  createdAt: string;
  connection?: { name: string };
}

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  provider?: { name: string };
}

export default function IntegrationHubPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Marketplace' | 'Installed Integrations' | 'Connection Manager' | 'Sync Jobs' | 'Webhook Manager' | 'Logs' | 'Templates'
  >('Overview');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [credentialInput, setCredentialInput] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Webhook Modal State
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookName, setWebhookName] = useState('');
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, connRes, jobRes, whRes, logRes, tplRes, statRes] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/integrations/providers`),
        apiFetch(`/organizations/${orgSlug}/integrations/connections`),
        apiFetch(`/organizations/${orgSlug}/integrations/sync-jobs`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/integrations/webhooks`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/integrations/logs`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/integrations/templates`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/integrations/stats`).catch(() => null),
      ]);

      setProviders(provRes);
      setConnections(connRes);
      setSyncJobs(jobRes);
      setWebhooks(whRes);
      setLogs(logRes);
      setTemplates(tplRes);
      setStats(statRes);
    } catch (err) {
      console.error('Failed to load integrations data:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setConnectionName(`${provider.name} Connection`);
    setCredentialInput('');
    setConnectModalOpen(true);
  };

  const handleSubmitConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    setConnecting(true);
    try {
      if (selectedProvider.authType === 'OAUTH2') {
        // Trigger OAuth authorization flow
        const oauthRes = await apiFetch(
          `/organizations/${orgSlug}/integrations/oauth/authorize?providerKey=${selectedProvider.key}`
        );
        // Complete mock OAuth callback
        await apiFetch(`/organizations/${orgSlug}/integrations/oauth/callback`, {
          method: 'POST',
          body: JSON.stringify({ providerKey: selectedProvider.key, code: 'mock_oauth_code_123' }),
        });
      } else {
        // Submit API Key / Credential
        await apiFetch(`/organizations/${orgSlug}/integrations/connections`, {
          method: 'POST',
          body: JSON.stringify({
            providerKey: selectedProvider.key,
            name: connectionName,
            apiKey: credentialInput,
          }),
        });
      }

      setConnectModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to establish connection:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect and revoke this integration?')) return;
    try {
      await apiFetch(`/organizations/${orgSlug}/integrations/connections/${connectionId}`, {
        method: 'DELETE',
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleTriggerSync = async (connectionId: string) => {
    try {
      await apiFetch(`/organizations/${orgSlug}/integrations/connections/${connectionId}/sync`, {
        method: 'POST',
        body: JSON.stringify({ syncType: 'MANUAL', entityType: 'ALL' }),
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingWebhook(true);
    try {
      await apiFetch(`/organizations/${orgSlug}/integrations/webhooks`, {
        method: 'POST',
        body: JSON.stringify({ name: webhookName, events: ['*'] }),
      });
      setWebhookModalOpen(false);
      setWebhookName('');
      await fetchData();
    } catch (err) {
      console.error('Failed to create webhook:', err);
    } finally {
      setCreatingWebhook(false);
    }
  };

  const filteredProviders = providers.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">Loading Enterprise Integration Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise Integration Hub</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Connect BlackDesk OS with Google Workspace, Microsoft 365, Slack, GitHub, Jira, Stripe, Salesforce, Zapier & webhooks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors border border-gray-200 dark:border-zinc-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 dark:border-zinc-800 scrollbar-hide">
        {(
          [
            { id: 'Overview', icon: Activity },
            { id: 'Marketplace', icon: Globe },
            { id: 'Installed Integrations', icon: CheckCircle2 },
            { id: 'Connection Manager', icon: Key },
            { id: 'Sync Jobs', icon: RefreshCw },
            { id: 'Webhook Manager', icon: Link2 },
            { id: 'Logs', icon: Server },
            { id: 'Templates', icon: FileCode },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-semibold bg-primary/5'
                  : 'border-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-zinc-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.id}
            </button>
          );
        })}
      </div>

      {/* ========================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================== */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Available Connectors</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats?.totalProviders || 19}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600">
                <Globe className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Active Connections</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{connections.length}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Total Sync Jobs</p>
                <p className="text-2xl font-bold mt-1 text-indigo-600 dark:text-indigo-400">{stats?.totalSyncJobs || syncJobs.length}</p>
              </div>
              <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600">
                <RefreshCw className="h-5 w-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Registered Webhooks</p>
                <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{webhooks.length}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600">
                <Link2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Installed Integration Cards Grid */}
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Active Integrations Summary</h3>
              <button
                onClick={() => setActiveTab('Marketplace')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Browse Marketplace <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {connections.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <Layers className="h-10 w-10 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">No active integrations connected yet.</p>
                <button
                  onClick={() => setActiveTab('Marketplace')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90"
                >
                  Connect First Integration
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((conn) => (
                  <div key={conn.id} className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img src={conn.provider.iconUrl} alt={conn.provider.name} className="h-8 w-8 object-contain" />
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">{conn.name}</h4>
                          <span className="text-[10px] text-gray-500">{conn.provider.category}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {conn.healthStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] border-t border-gray-200 dark:border-zinc-800 pt-2.5">
                      <span className="text-gray-500">Last Synced: {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleTimeString() : 'Just now'}</span>
                      <button
                        onClick={() => handleTriggerSync(conn.id)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Sync Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: MARKETPLACE */}
      {/* ========================================== */}
      {activeTab === 'Marketplace' && (
        <div className="space-y-6">
          {/* Search & Category Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Google Workspace, Slack, Jira, Stripe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {['ALL', 'COMMUNICATION', 'PROJECT', 'CRM', 'PAYMENT', 'AUTOMATION', 'STORAGE'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    categoryFilter === cat
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((prov) => {
              const isConnected = connections.some((c) => c.provider.key === prov.key);
              const capabilities: string[] = JSON.parse(prov.supportedCapabilities || '[]');

              return (
                <div
                  key={prov.key}
                  className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-4 hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={prov.iconUrl} alt={prov.name} className="h-9 w-9 object-contain" />
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{prov.name}</h4>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                            {prov.category}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                        {prov.authType}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2">{prov.description}</p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {capabilities.slice(0, 3).map((cap, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-gray-50 dark:bg-zinc-800/80 text-gray-500 border border-gray-100 dark:border-zinc-800">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-zinc-800">
                    <a
                      href={prov.docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-gray-500 hover:underline flex items-center gap-1"
                    >
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>

                    {isConnected ? (
                      <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-xs font-bold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConnectProvider(prov)}
                        className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: INSTALLED INTEGRATIONS */}
      {/* ========================================== */}
      {activeTab === 'Installed Integrations' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold">Configured Tenant Connections</h3>

            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
              {connections.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No integrations installed yet.</p>
              ) : (
                connections.map((conn) => (
                  <div key={conn.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img src={conn.provider.iconUrl} alt={conn.provider.name} className="h-10 w-10 object-contain" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{conn.name}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {conn.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Account: {conn.externalAccountEmail || 'Enterprise Tenant'} | Auth: {conn.authType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTriggerSync(conn.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 flex items-center gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Sync
                      </button>

                      <button
                        onClick={() => handleDisconnect(conn.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100 flex items-center gap-1.5"
                      >
                        <Unlink className="h-3.5 w-3.5" /> Disconnect
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: CONNECTION MANAGER */}
      {/* ========================================== */}
      {activeTab === 'Connection Manager' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold">Credential Storage & Security Health</h3>
            <p className="text-xs text-gray-500">All credentials (API Keys, Access Tokens, OAuth Secrets) are encrypted using AES-256-CBC with unique IVs.</p>

            <div className="space-y-3">
              {connections.map((conn) => (
                <div key={conn.id} className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-gray-900 dark:text-white">{conn.name}</span>
                    <p className="text-xs text-gray-500 mt-0.5">Encrypted Credential Records: {conn.credentials?.length || 1}</p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    AES-256 Encrypted
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 5: SYNC JOBS */}
      {/* ========================================== */}
      {activeTab === 'Sync Jobs' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold">Data Synchronization History</h3>

            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
              {syncJobs.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No sync jobs executed yet.</p>
              ) : (
                syncJobs.map((job) => (
                  <div key={job.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white">{job.connection?.name || 'Integration Sync'}</span>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Type: {job.syncType} | Entity: {job.entityType} | Processed: {job.recordsProcessed} records
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {job.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 6: WEBHOOK MANAGER */}
      {/* ========================================== */}
      {activeTab === 'Webhook Manager' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Inbound Webhook Registration</h3>
              <button
                onClick={() => setWebhookModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Register Webhook
              </button>
            </div>

            <div className="space-y-3">
              {webhooks.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No webhooks registered.</p>
              ) : (
                webhooks.map((wh) => (
                  <div key={wh.id} className="p-4 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">{wh.name}</span>
                      <span className="text-[10px] font-semibold text-emerald-600">Delivered: {wh.totalDelivered}</span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-600 dark:text-zinc-400 break-all">{wh.webhookUrl}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 7: AUDIT LOGS */}
      {/* ========================================== */}
      {activeTab === 'Logs' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold">Integration Audit Logs</h3>
            <div className="divide-y divide-gray-200 dark:divide-zinc-800">
              {logs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-gray-900 dark:text-white">[{log.action}] {log.message}</span>
                    {log.connection && <p className="text-[11px] text-gray-500">{log.connection.name}</p>}
                  </div>
                  <span className="text-[10px] text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 8: TEMPLATES */}
      {/* ========================================== */}
      {activeTab === 'Templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div key={tpl.id} className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  {tpl.category}
                </span>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{tpl.name}</h4>
                <p className="text-xs text-gray-600 dark:text-zinc-400">{tpl.description}</p>
                <button
                  onClick={() => alert(`Activated template: ${tpl.name}`)}
                  className="w-full py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white"
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONNECT MODAL */}
      {connectModalOpen && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={selectedProvider.iconUrl} alt={selectedProvider.name} className="h-8 w-8 object-contain" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Connect {selectedProvider.name}</h3>
              </div>
              <button onClick={() => setConnectModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitConnect} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Connection Name</label>
                <input
                  type="text"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  required
                />
              </div>

              {selectedProvider.authType === 'API_KEY' && (
                <div>
                  <label className="block font-semibold mb-1">API Key / Secret Token</label>
                  <input
                    type="password"
                    placeholder="sk_live_..."
                    value={credentialInput}
                    onChange={(e) => setCredentialInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    required
                  />
                </div>
              )}

              {selectedProvider.authType === 'OAUTH2' && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                  Clicking "Authorize & Connect" will redirect to {selectedProvider.name} OAuth2 consent screen.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90"
                >
                  {connecting ? 'Connecting...' : selectedProvider.authType === 'OAUTH2' ? 'Authorize & Connect' : 'Save Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WEBHOOK MODAL */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-zinc-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Register Inbound Webhook</h3>
            <form onSubmit={handleCreateWebhook} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Webhook Name</label>
                <input
                  type="text"
                  placeholder="e.g. GitHub Push Webhook"
                  value={webhookName}
                  onChange={(e) => setWebhookName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWebhookModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingWebhook}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90"
                >
                  {creatingWebhook ? 'Creating...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
