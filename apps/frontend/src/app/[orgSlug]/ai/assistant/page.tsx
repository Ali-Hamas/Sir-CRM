'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import {
  Bot, Sparkles, Shield, Cpu, Sliders, MessageSquare, History,
  CheckCircle2, XCircle, Play, Save, RefreshCw, Send, Lock,
  Zap, Database, Eye, FileText, Briefcase, Target, Workflow,
  Search, Bell, Layers, Key
} from 'lucide-react';

interface AssistantData {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  systemPrompt: string;
  defaultProvider: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  capabilities: { id: string; capability: string; enabled: boolean }[];
  permissions: { id: string; permission: string; granted: boolean }[];
}

interface SessionData {
  id: string;
  title: string;
  selectedProvider: string;
  selectedModel: string;
  status: string;
  startedAt: string;
  user?: { firstName: string; lastName: string; email: string };
  _count?: { executions: number };
}

interface ExecutionData {
  id: string;
  userPrompt: string;
  assistantResponse: string;
  tokens: number;
  latencyMs: number;
  provider: string;
  model: string;
  memoryUsed: string[];
  toolsRequested: string[];
  executionStatus: string;
  createdAt: string;
  user?: { firstName: string; lastName: string };
}

const ALL_CAPABILITIES = [
  { key: 'CRM', label: 'CRM Engine', description: 'Access leads, contacts, companies, & opportunities', icon: Target },
  { key: 'PROJECTS', label: 'Project Management', description: 'Monitor projects, phases, & milestones', icon: Briefcase },
  { key: 'TASKS', label: 'Task & Kanban', description: 'Manage task assignments & checklists', icon: CheckCircle2 },
  { key: 'KNOWLEDGE', label: 'Knowledge Base', description: 'Query articles, categories, & FAQs', icon: BookOpenIcon },
  { key: 'DOCUMENTS', label: 'Document Library', description: 'Search & reference company documents', icon: FileText },
  { key: 'MEETINGS', label: 'Meetings & Syncs', description: 'Access meeting summaries & action items', icon: CalendarIcon },
  { key: 'CONTRACTS', label: 'Contracts & Client', description: 'Reference legal & service agreements', icon: Shield },
  { key: 'PROPOSALS', label: 'Proposals & Quotes', description: 'Query proposal values & approval logs', icon: Layers },
  { key: 'WORKFLOW_ENGINE', label: 'Workflow Engine', description: 'Inspect triggers, conditions, & actions', icon: Workflow },
  { key: 'GLOBAL_SEARCH', label: 'Global Enterprise Search', description: 'Execute cross-module search indexing', icon: Search },
  { key: 'MEMORY', label: 'AI Memory & Context', description: 'Access pinned workspace & user memories', icon: Database },
  { key: 'NOTIFICATIONS', label: 'Notifications Hub', description: 'Trigger in-app alert notifications', icon: Bell },
];

const ALL_PERMISSIONS = [
  { key: 'READ', label: 'Read Operations', description: 'Allow assistant to inspect workspace records' },
  { key: 'WRITE', label: 'Write Operations', description: 'Allow assistant to update workspace entities' },
  { key: 'EXECUTE_ACTIONS', label: 'Execute Workflow Actions', description: 'Allow assistant to trigger automation rules' },
  { key: 'ACCESS_FINANCIAL_DATA', label: 'Access Financial Data', description: 'Allow assistant to inspect budget & revenue data' },
  { key: 'ACCESS_SENSITIVE_INFO', label: 'Access Sensitive Info', description: 'Allow assistant to inspect high-security fields' },
  { key: 'ORGANIZATION_SCOPE', label: 'Organization Scope', description: 'Scope context across the entire organization' },
  { key: 'WORKSPACE_SCOPE', label: 'Workspace Scope', description: 'Limit context to the active workspace' },
];

function BookOpenIcon(props: any) { return <FileText {...props} />; }
function CalendarIcon(props: any) { return <Layers {...props} />; }

export default function AIAssistantCorePage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'capabilities' | 'permissions' | 'settings' | 'sessions' | 'executions'>('overview');
  const [assistant, setAssistant] = useState<AssistantData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [executions, setExecutions] = useState<ExecutionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Settings Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    defaultProvider: 'OPENAI',
    defaultModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    enabled: true,
  });

  // Mock Chat state
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; meta?: any }>>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/ai/assistant`);
      setAssistant(data);
      setFormData({
        name: data.name || '',
        description: data.description || '',
        systemPrompt: data.systemPrompt || '',
        defaultProvider: data.defaultProvider || 'OPENAI',
        defaultModel: data.defaultModel || 'gpt-4o',
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 4096,
        enabled: data.enabled ?? true,
      });

      const [sessData, execData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/ai/assistant/sessions?limit=20`).catch(() => []),
        apiFetch(`/organizations/${orgSlug}/ai/assistant/executions?limit=30`).catch(() => []),
      ]);

      setSessions(sessData || []);
      setExecutions(execData || []);
    } catch (err: any) {
      console.error('Failed to load AI Assistant Core data:', err);
      setApiError(err?.message || 'Failed to connect to AI Assistant service');
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistant) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/ai/assistant/${assistant.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setAssistant(updated);
      setStatusMessage('AI Assistant settings saved successfully.');
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleCapability = async (capabilityKey: string) => {
    if (!assistant) return;
    const currentEnabled = assistant.capabilities.find((c) => c.capability === capabilityKey)?.enabled ?? true;
    const updatedCapabilities = ALL_CAPABILITIES.map((cap) => {
      const existing = assistant.capabilities.find((c) => c.capability === cap.key);
      const isTarget = cap.key === capabilityKey;
      return {
        capability: cap.key,
        enabled: isTarget ? !currentEnabled : existing?.enabled ?? true,
      };
    });

    try {
      const updatedList = await apiFetch(`/organizations/${orgSlug}/ai/assistant/${assistant.id}/capabilities`, {
        method: 'PATCH',
        body: JSON.stringify({ capabilities: updatedCapabilities }),
      });
      setAssistant((prev) => prev ? { ...prev, capabilities: updatedList } : null);
    } catch (err) {
      console.error('Failed to update capability:', err);
    }
  };

  const togglePermission = async (permissionKey: string) => {
    if (!assistant) return;
    const currentGranted = assistant.permissions.find((p) => p.permission === permissionKey)?.granted ?? false;
    const updatedPermissions = ALL_PERMISSIONS.map((perm) => {
      const existing = assistant.permissions.find((p) => p.permission === perm.key);
      const isTarget = perm.key === permissionKey;
      return {
        permission: perm.key,
        granted: isTarget ? !currentGranted : existing?.granted ?? true,
      };
    });

    try {
      const updatedList = await apiFetch(`/organizations/${orgSlug}/ai/assistant/${assistant.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: updatedPermissions }),
      });
      setAssistant((prev) => prev ? { ...prev, permissions: updatedList } : null);
    } catch (err) {
      console.error('Failed to update permission:', err);
    }
  };

  const handleSendMockChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim() || chatLoading) return;

    const userMessageText = chatPrompt.trim();
    setChatPrompt('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessageText }]);
    setChatLoading(true);

    try {
      const result = await apiFetch(`/organizations/${orgSlug}/ai/assistant/chat`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: userMessageText,
          sessionId: activeSessionId || undefined,
          provider: assistant?.defaultProvider,
          model: assistant?.defaultModel,
        }),
      });

      if (result.sessionId) {
        setActiveSessionId(result.sessionId);
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          meta: {
            tokens: result.tokens,
            latencyMs: result.latencyMs,
            memoryUsed: result.memoryUsed,
            toolsRequested: result.toolsRequested,
          },
        },
      ]);

      // Refresh executions & sessions asynchronously
      apiFetch(`/organizations/${orgSlug}/ai/assistant/executions?limit=30`).then((res) => setExecutions(res || []));
      apiFetch(`/organizations/${orgSlug}/ai/assistant/sessions?limit=20`).then((res) => setSessions(res || []));
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[Error]: ${err.message || 'Mock execution failed'}` },
      ]);
    } finally {
      setChatLoading(false);
    }
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
      {/* API Error Banner */}
      {apiError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          <XCircle size={18} className="shrink-0" />
          <span><strong>Error:</strong> {apiError}</span>
          <button onClick={fetchData} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors text-xs font-medium">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-600/10 dark:from-primary/20 dark:via-indigo-900/20 dark:to-purple-900/20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Bot size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {assistant?.name || 'Enterprise AI Assistant Core'}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                assistant?.enabled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {assistant?.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Central orchestration engine for intelligent automation across CRM, Projects, Workflows, & Knowledge
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-2">
            <Cpu size={14} className="text-primary" />
            <span className="text-gray-500">Provider:</span>
            <span className="font-semibold">{assistant?.defaultProvider}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-2">
            <Zap size={14} className="text-amber-500" />
            <span className="text-gray-500">Model:</span>
            <span className="font-semibold">{assistant?.defaultModel}</span>
          </div>
        </div>
      </div>

      {/* AI Suite Sub-Module Quick Nav */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-b border-gray-100 dark:border-zinc-800/80">
        <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mr-1 shrink-0">
          AI Suite:
        </span>
        <Link
          href={`/${orgSlug}/ai/assistant`}
          className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-semibold text-xs transition-colors shrink-0"
        >
          AI Workspace
        </Link>
        <Link
          href={`/${orgSlug}/ai/chat`}
          className="px-2.5 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors shrink-0"
        >
          AI Chat
        </Link>
        <Link
          href={`/${orgSlug}/ai/agents`}
          className="px-2.5 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors shrink-0"
        >
          AI Agents
        </Link>
        <Link
          href={`/${orgSlug}/ai/orchestrator`}
          className="px-2.5 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors shrink-0"
        >
          Orchestrator
        </Link>
        <Link
          href={`/${orgSlug}/ai/tools`}
          className="px-2.5 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors shrink-0"
        >
          AI Tools
        </Link>
        <Link
          href={`/${orgSlug}/ai/rag`}
          className="px-2.5 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors shrink-0"
        >
          RAG Engine
        </Link>
        <Link
          href={`/${orgSlug}/ai/memory`}
          className="px-2.5 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors shrink-0"
        >
          AI Memory
        </Link>
        <Link
          href={`/${orgSlug}/ai/business-processes`}
          className="px-2.5 py-1 rounded-md text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-medium text-xs transition-colors shrink-0"
        >
          Business Processes
        </Link>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide pb-0.5">
        {[
          { id: 'overview', label: 'Overview', icon: Sparkles },
          { id: 'chat', label: 'Mock Chat Test', icon: MessageSquare },
          { id: 'capabilities', label: 'Capabilities Grid', icon: Cpu },
          { id: 'permissions', label: 'Permission Matrix', icon: Shield },
          { id: 'settings', label: 'Assistant Settings', icon: Sliders },
          { id: 'sessions', label: 'Sessions', icon: History },
          { id: 'executions', label: 'Execution History', icon: Database },
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Status</span>
                <Bot className="text-primary" size={18} />
              </div>
              <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {assistant?.enabled ? 'Online' : 'Disabled'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Core Engine Ready</p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Active Capabilities</span>
                <Cpu className="text-indigo-500" size={18} />
              </div>
              <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {assistant?.capabilities.filter((c) => c.enabled).length || 0} / {ALL_CAPABILITIES.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Integrated Modules</p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Granted Permissions</span>
                <Shield className="text-emerald-500" size={18} />
              </div>
              <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {assistant?.permissions.filter((p) => p.granted).length || 0} / {ALL_PERMISSIONS.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">RBAC Scope Controls</p>
            </div>

            <div className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase">
                <span>Executions Logged</span>
                <Database className="text-amber-500" size={18} />
              </div>
              <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                {executions.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Mock Executions Audited</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Prompt Box */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> Active System Prompt
              </h3>
              <p className="text-xs text-gray-500">System prompt governing default behavior:</p>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 font-mono text-xs text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800/80 leading-relaxed">
                {assistant?.systemPrompt}
              </div>
            </div>

            {/* Recent Executions Preview */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <History size={16} className="text-indigo-500" /> Recent Mock Executions
                </h3>
                <button onClick={() => setActiveTab('executions')} className="text-xs text-primary font-medium hover:underline">
                  View All
                </button>
              </div>

              {executions.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  No mock executions logged yet. Use the Mock Chat Test tab to run assistant prompts.
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.slice(0, 3).map((exec) => (
                    <div key={exec.id} className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                          "{exec.userPrompt}"
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {exec.latencyMs}ms | {exec.tokens} tokens
                        </span>
                      </div>
                      <p className="text-gray-500 dark:text-zinc-400 truncate">
                        {exec.assistantResponse.split('\n')[0]}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Mock Chat Panel */}
      {activeTab === 'chat' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden flex flex-col h-[650px]">
          {/* Mock Chat Header */}
          <div className="px-6 py-3.5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">AI Assistant Core Tester (Mock Mode)</p>
                <p className="text-[11px] text-gray-500">Simulates assistant execution, tool calls, & memory retrieval</p>
              </div>
            </div>
            {activeSessionId && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                Session ID: {activeSessionId.substring(0, 8)}...
              </span>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3">
                <Bot size={40} className="text-primary/60" />
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Ask the Enterprise AI Assistant anything
                </p>
                <p className="text-xs max-w-sm">
                  Try asking: "Show pipeline leads", "Check project milestones", "Search HR SOP document", or "Status of workflow automations".
                </p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 mt-1">
                      <Bot size={16} />
                    </div>
                  )}
                  <div className={`max-w-xl p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white font-medium rounded-tr-none'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-tl-none whitespace-pre-wrap font-sans'
                  }`}>
                    {msg.content}
                    {msg.meta && (
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-zinc-700/80 text-[10px] text-gray-500 dark:text-zinc-400 space-y-1 font-mono">
                        <div className="flex items-center gap-3">
                          <span>Tokens: {msg.meta.tokens}</span>
                          <span>Latency: {msg.meta.latencyMs}ms</span>
                        </div>
                        {msg.meta.toolsRequested?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-primary">Simulated Tools:</span>
                            <span>{msg.meta.toolsRequested.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <RefreshCw size={14} className="animate-spin text-primary" />
                Assistant orchestrating response across capabilities...
              </div>
            )}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendMockChat} className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex gap-2">
            <input
              type="text"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              placeholder="Ask AI Assistant (e.g. CRM leads, project status, workflow health)..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatPrompt.trim()}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Send size={16} /> Send
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Capabilities Grid */}
      {activeTab === 'capabilities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assistant Capabilities Grid</h2>
              <p className="text-xs text-gray-500">Enable or disable domain capabilities available to this assistant</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              const isEnabled = assistant?.capabilities.find((c) => c.capability === cap.key)?.enabled ?? true;
              return (
                <div
                  key={cap.key}
                  onClick={() => toggleCapability(cap.key)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                    isEnabled
                      ? 'border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-sm'
                      : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-60'
                  }`}
                >
                  <div className={`p-3 rounded-xl shrink-0 ${
                    isEnabled ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{cap.label}</h3>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => {}} // Handled by parent div
                        className="rounded text-primary focus:ring-primary h-4 w-4 shrink-0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{cap.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Permission Matrix */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">RBAC Permission Matrix</h2>
            <p className="text-xs text-gray-500">Control granular permission grants & data scope for the AI Assistant</p>
          </div>

          <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Permission Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {ALL_PERMISSIONS.map((perm) => {
                  const isGranted = assistant?.permissions.find((p) => p.permission === perm.key)?.granted ?? true;
                  return (
                    <tr
                      key={perm.key}
                      onClick={() => togglePermission(perm.key)}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Key size={16} className="text-primary" />
                        {perm.label}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-zinc-400">{perm.description}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          isGranted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                        }`}>
                          {isGranted ? 'Granted' : 'Revoked'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="border border-gray-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-6 space-y-6">
          {statusMessage && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-400">
              {statusMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Assistant Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Default Provider
              </label>
              <select
                value={formData.defaultProvider}
                onChange={(e) => setFormData({ ...formData, defaultProvider: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
              >
                <option value="OPENAI">OpenAI</option>
                <option value="ANTHROPIC">Anthropic</option>
                <option value="GOOGLE">Google Gemini</option>
                <option value="LOCAL">Local LLM / Ollama</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Default Model
              </label>
              <input
                type="text"
                value={formData.defaultModel}
                onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Temperature ({formData.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              System Prompt
            </label>
            <textarea
              rows={4}
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-mono"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 6: Sessions */}
      {activeTab === 'sessions' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-500">
              <tr>
                <th className="px-6 py-3.5">Session Title</th>
                <th className="px-6 py-3.5">Provider & Model</th>
                <th className="px-6 py-3.5">Executions</th>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5 text-right">Started At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-400">
                    No active sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{sess.title}</td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600 dark:text-zinc-400">
                      {sess.selectedProvider} ({sess.selectedModel})
                    </td>
                    <td className="px-6 py-4 text-xs">{sess._count?.executions || 0} calls</td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-zinc-400">
                      {sess.user?.firstName} {sess.user?.lastName}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {new Date(sess.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 7: Execution History */}
      {activeTab === 'executions' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">User Prompt</th>
                  <th className="px-6 py-3.5">Simulated Response</th>
                  <th className="px-6 py-3.5">Tokens & Latency</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-400">
                      No execution logs found.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                        {exec.userPrompt}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-zinc-400 max-w-[300px] truncate">
                        {exec.assistantResponse.split('\n')[0]}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {exec.tokens} tok | {exec.latencyMs}ms
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold">
                          {exec.executionStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-gray-400">
                        {new Date(exec.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
