'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Users, Bot, Sparkles, Shield, Cpu, Sliders, MessageSquare, History,
  CheckCircle2, XCircle, Play, Save, RefreshCw, Send, Lock,
  Zap, Database, Eye, FileText, Briefcase, Target, Workflow,
  Search, Bell, Layers, Key, DollarSign, Calendar, BookOpen, AlertTriangle, ChevronRight, UserCheck
} from 'lucide-react';

interface AgentCapability {
  id: string;
  capability: string;
  displayName: string;
  description: string | null;
  enabled: boolean;
}

interface AgentPrompt {
  id: string;
  promptType: string;
  name: string;
  content: string;
  isActive: boolean;
  promptTemplateId?: string | null;
}

interface KnowledgeScope {
  id: string;
  scopeType: string;
  allowed: boolean;
}

interface ToolAccess {
  id: string;
  toolKey: string;
  allowed: boolean;
  requiresApproval: boolean;
}

interface AIAgent {
  id: string;
  key: string;
  name: string;
  role: string;
  department: string;
  description: string | null;
  avatar: string | null;
  systemPrompt: string | null;
  defaultProvider: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  isCustom: boolean;
  capabilities: AgentCapability[];
  prompts: AgentPrompt[];
  knowledgeScopes: KnowledgeScope[];
  toolAccesses: ToolAccess[];
}

interface AgentExecution {
  id: string;
  agentId: string;
  userPrompt: string;
  agentResponse: string;
  capabilityUsed: string | null;
  toolsExecuted: string | string[];
  knowledgeRetrieved: string | string[];
  provider: string;
  model: string;
  tokens: number;
  latencyMs: number;
  status: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; email: string };
}

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  Sales: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', icon: Target },
  'Project Management': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: Briefcase },
  Knowledge: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', icon: BookOpen },
  Meetings: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', icon: Calendar },
  Finance: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', icon: DollarSign },
  Executive: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', icon: Shield },
};

export default function EnterpriseAIAgentsPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'detail' | 'settings' | 'chat' | 'executions'>('dashboard');
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Settings form state for selected agent
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    role: '',
    department: '',
    description: '',
    systemPrompt: '',
    defaultProvider: 'OPENAI',
    defaultModel: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    enabled: true,
  });

  // Chat state
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; meta?: any }>>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/ai/agents`);
      setAgents(data || []);
      if (data && data.length > 0) {
        const first = data[0];
        setSelectedAgent(first);
        populateSettingsForm(first);
      }
    } catch (err) {
      console.error('Failed to load AI agents:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const populateSettingsForm = (agent: AIAgent) => {
    setSettingsForm({
      name: agent.name || '',
      role: agent.role || '',
      department: agent.department || '',
      description: agent.description || '',
      systemPrompt: agent.systemPrompt || '',
      defaultProvider: agent.defaultProvider || 'OPENAI',
      defaultModel: agent.defaultModel || 'gpt-4o',
      temperature: agent.temperature ?? 0.7,
      maxTokens: agent.maxTokens ?? 4096,
      enabled: agent.enabled ?? true,
    });
    if (agent.capabilities && agent.capabilities.length > 0) {
      setSelectedCapability(agent.capabilities[0].capability);
    }
  };

  const handleSelectAgent = async (agent: AIAgent) => {
    setSelectedAgent(agent);
    populateSettingsForm(agent);
    setChatMessages([]);
    // Fetch executions for selected agent
    try {
      const execs = await apiFetch(`/organizations/${orgSlug}/ai/agents/${agent.id}/executions?limit=30`);
      setExecutions(execs || []);
    } catch (err) {
      console.error('Failed to load agent executions:', err);
    }
  };

  const handleToggleAgentEnabled = async (agent: AIAgent) => {
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/ai/agents/${agent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !agent.enabled }),
      });
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? updated : a)));
      if (selectedAgent?.id === agent.id) {
        setSelectedAgent(updated);
      }
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/ai/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        body: JSON.stringify(settingsForm),
      });
      setSelectedAgent(updated);
      setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? updated : a)));
      setStatusMessage(`${updated.name} settings saved successfully.`);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to update agent settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCapability = async (capabilityKey: string, currentEnabled: boolean) => {
    if (!selectedAgent) return;
    const updatedCaps = selectedAgent.capabilities.map((c) =>
      c.capability === capabilityKey ? { ...c, enabled: !currentEnabled } : c
    );
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/ai/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ capabilities: updatedCaps }),
      });
      setSelectedAgent(updated);
      setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? updated : a)));
    } catch (err) {
      console.error('Failed to update capability:', err);
    }
  };

  const handleToggleKnowledgeScope = async (scopeType: string, currentAllowed: boolean) => {
    if (!selectedAgent) return;
    const updatedScopes = selectedAgent.knowledgeScopes.map((s) =>
      s.scopeType === scopeType ? { ...s, allowed: !currentAllowed } : s
    );
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/ai/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ knowledgeScopes: updatedScopes }),
      });
      setSelectedAgent(updated);
      setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? updated : a)));
    } catch (err) {
      console.error('Failed to update knowledge scope:', err);
    }
  };

  const handleToggleToolAccess = async (toolKey: string, currentAllowed: boolean) => {
    if (!selectedAgent) return;
    const updatedTools = selectedAgent.toolAccesses.map((t) =>
      t.toolKey === toolKey ? { ...t, allowed: !currentAllowed } : t
    );
    try {
      const updated = await apiFetch(`/organizations/${orgSlug}/ai/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ toolAccesses: updatedTools }),
      });
      setSelectedAgent(updated);
      setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? updated : a)));
    } catch (err) {
      console.error('Failed to update tool access:', err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim() || !selectedAgent || chatLoading) return;

    const userPromptText = chatPrompt.trim();
    setChatPrompt('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userPromptText }]);
    setChatLoading(true);

    try {
      const result = await apiFetch(`/organizations/${orgSlug}/ai/agents/${selectedAgent.id}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: userPromptText,
          capability: selectedCapability || undefined,
          provider: selectedAgent.defaultProvider,
          model: selectedAgent.defaultModel,
        }),
      });

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: result.response,
          meta: {
            capabilityUsed: result.capabilityUsed,
            tokens: result.tokens,
            latencyMs: result.latencyMs,
            toolsExecuted: result.toolsExecuted,
            knowledgeRetrieved: result.knowledgeRetrieved,
          },
        },
      ]);

      // Refresh executions asynchronously
      apiFetch(`/organizations/${orgSlug}/ai/agents/${selectedAgent.id}/executions?limit=30`)
        .then((res) => setExecutions(res || []));
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[Error]: ${err.message || 'Agent execution failed'}` },
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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-indigo-900/10 via-purple-600/10 to-primary/10 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-primary/20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <UserCheck size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Enterprise Specialized AI Agents
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                {agents.filter((a) => a.enabled).length} Active Agents
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Reusable department-specific AI agents inheriting AI Assistant Core, AI Memory, Tool Calling Framework, RAG Engine, & Prompt Library.
            </p>
          </div>
        </div>

        {/* Security & Isolation Pill */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-2">
            <Shield size={14} className="text-emerald-500" />
            <span className="text-gray-500">Security:</span>
            <span className="font-semibold">RBAC & Org Isolated</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-2">
            <Cpu size={14} className="text-indigo-500" />
            <span className="text-gray-500">Mode:</span>
            <span className="font-semibold">Mock LLM Engine</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-0.5 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'dashboard', label: 'Agent Dashboard', icon: Users },
            { id: 'detail', label: 'Agent Detail', icon: Eye },
            { id: 'settings', label: 'Settings & Matrix', icon: Sliders },
            { id: 'chat', label: 'Agent Chat Playground', icon: MessageSquare },
            { id: 'executions', label: 'Execution Audit Logs', icon: Database },
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

        {/* Selected Agent Indicator */}
        {selectedAgent && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-zinc-800/80 rounded-xl text-xs">
            <span className="text-gray-400">Selected Agent:</span>
            <span className="font-semibold text-gray-900 dark:text-white">{selectedAgent.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {selectedAgent.department}
            </span>
          </div>
        )}
      </div>

      {/* Tab 1: Agent Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const deptStyle = DEPARTMENT_COLORS[agent.department] || {
                bg: 'bg-gray-50 dark:bg-zinc-800',
                text: 'text-gray-700 dark:text-zinc-300',
                border: 'border-gray-200 dark:border-zinc-700',
                icon: Bot,
              };
              const DeptIcon = deptStyle.icon;
              const activeCapCount = agent.capabilities?.filter((c) => c.enabled).length || 0;
              const isSelected = selectedAgent?.id === agent.id;

              return (
                <div
                  key={agent.id}
                  className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary shadow-md bg-white dark:bg-zinc-900 ring-2 ring-primary/20'
                      : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${deptStyle.bg} ${deptStyle.text} ${deptStyle.border} shrink-0`}>
                          <DeptIcon size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-gray-900 dark:text-white">{agent.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${deptStyle.bg} ${deptStyle.text} ${deptStyle.border} mt-1`}>
                            {agent.department}
                          </span>
                        </div>
                      </div>

                      {/* Enable Switch */}
                      <button
                        onClick={() => handleToggleAgentEnabled(agent)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          agent.enabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {agent.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-medium">
                      {agent.role}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 line-clamp-2">
                      {agent.description}
                    </p>
                  </div>

                  {/* Footer Metrics & Actions */}
                  <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                      <span>{activeCapCount} Capabilities</span>
                      <span>{agent.defaultProvider} ({agent.defaultModel})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleSelectAgent(agent);
                          setActiveTab('chat');
                        }}
                        className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare size={14} /> Chat
                      </button>
                      <button
                        onClick={() => {
                          handleSelectAgent(agent);
                          setActiveTab('settings');
                        }}
                        className="py-2 px-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <Sliders size={14} /> Config
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Agent Detail */}
      {activeTab === 'detail' && selectedAgent && (
        <div className="space-y-6">
          {/* Agent Hero Card */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-bold">
                  {selectedAgent.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedAgent.name}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                      key: {selectedAgent.key}
                    </span>
                  </h2>
                  <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">{selectedAgent.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <MessageSquare size={14} /> Launch Chat Playground
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sliders size={14} /> Edit Configuration
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400">{selectedAgent.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Prompt Box */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-primary" /> Active System Prompt
              </h3>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-zinc-950 font-mono text-xs text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800 leading-relaxed">
                {selectedAgent.systemPrompt}
              </div>
            </div>

            {/* Knowledge & Tool Summary */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <Database size={16} className="text-indigo-500" /> Authorized Knowledge & Tool Scopes
              </h3>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Knowledge Scopes</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.knowledgeScopes?.map((ks) => (
                    <span
                      key={ks.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        ks.allowed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 line-through'
                      }`}
                    >
                      {ks.scopeType}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Tool Calling Grants</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAgent.toolAccesses?.map((ta) => (
                    <span
                      key={ta.id}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono ${
                        ta.allowed
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-zinc-800 line-through'
                      }`}
                    >
                      {ta.toolKey} {ta.requiresApproval && '(Needs Approval)'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Settings & Matrix */}
      {activeTab === 'settings' && selectedAgent && (
        <div className="space-y-6">
          {/* Main Settings Form */}
          <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sliders size={18} className="text-primary" /> Configuration Settings for {selectedAgent.name}
            </h2>

            {statusMessage && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-sm text-blue-700 dark:text-blue-400">
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                  Role Title
                </label>
                <input
                  type="text"
                  value={settingsForm.role}
                  onChange={(e) => setSettingsForm({ ...settingsForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                  Default Provider
                </label>
                <select
                  value={settingsForm.defaultProvider}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultProvider: e.target.value })}
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
                  value={settingsForm.defaultModel}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultModel: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                System Prompt
              </label>
              <textarea
                rows={4}
                value={settingsForm.systemPrompt}
                onChange={(e) => setSettingsForm({ ...settingsForm, systemPrompt: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-sm font-mono"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-sm shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> {saving ? 'Saving...' : 'Save Agent Config'}
              </button>
            </div>
          </form>

          {/* Capability Matrix */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Cpu size={18} className="text-indigo-500" /> Capability Matrix
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedAgent.capabilities?.map((cap) => (
                <div
                  key={cap.id}
                  onClick={() => handleToggleCapability(cap.capability, cap.enabled)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    cap.enabled
                      ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                      : 'border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 opacity-60'
                  }`}
                >
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{cap.displayName}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{cap.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={cap.enabled}
                    onChange={() => {}}
                    className="h-4 w-4 text-primary rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tool Access & Knowledge Scope Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Knowledge Scopes */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Database size={18} className="text-purple-500" /> Knowledge Scope Permissions
              </h3>
              <div className="space-y-2">
                {selectedAgent.knowledgeScopes?.map((ks) => (
                  <div
                    key={ks.id}
                    onClick={() => handleToggleKnowledgeScope(ks.scopeType, ks.allowed)}
                    className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40"
                  >
                    <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {ks.scopeType}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      ks.allowed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                    }`}>
                      {ks.allowed ? 'Allowed' : 'Blocked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tool Access Matrix */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Key size={18} className="text-amber-500" /> Tool Calling Access Matrix
              </h3>
              <div className="space-y-2">
                {selectedAgent.toolAccesses?.map((ta) => (
                  <div
                    key={ta.id}
                    onClick={() => handleToggleToolAccess(ta.toolKey, ta.allowed)}
                    className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/40"
                  >
                    <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">
                      {ta.toolKey}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      ta.allowed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400'
                    }`}>
                      {ta.allowed ? 'Granted' : 'Revoked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Agent Chat Playground */}
      {activeTab === 'chat' && selectedAgent && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden flex flex-col h-[650px]">
          {/* Chat Header */}
          <div className="px-6 py-3.5 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold">
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAgent.name} Playground</p>
                <p className="text-[11px] text-gray-500">{selectedAgent.role}</p>
              </div>
            </div>

            {/* Capability Selector */}
            {selectedAgent.capabilities?.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Capability:</span>
                <select
                  value={selectedCapability}
                  onChange={(e) => setSelectedCapability(e.target.value)}
                  className="px-3 py-1 rounded-lg border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold"
                >
                  {selectedAgent.capabilities.filter((c) => c.enabled).map((c) => (
                    <option key={c.id} value={c.capability}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Chat Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3">
                <Bot size={40} className="text-primary/60" />
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  Ask {selectedAgent.name} anything in {selectedAgent.department} domain
                </p>
                <p className="text-xs max-w-sm">
                  {selectedAgent.description}
                </p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 mt-1 font-bold text-xs">
                      {selectedAgent.name.charAt(0)}
                    </div>
                  )}
                  <div className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-white font-medium rounded-tr-none'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 rounded-tl-none font-sans whitespace-pre-wrap'
                  }`}>
                    {msg.content}
                    {msg.meta && (
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-zinc-700/80 text-[10px] text-gray-500 dark:text-zinc-400 space-y-1 font-mono">
                        <div className="flex items-center gap-3">
                          <span>Tokens: {msg.meta.tokens}</span>
                          <span>Latency: {msg.meta.latencyMs}ms</span>
                        </div>
                        {msg.meta.toolsExecuted?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-primary">Executed Tools:</span>
                            <span>{msg.meta.toolsExecuted.join(', ')}</span>
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
                {selectedAgent.name} generating mock briefing...
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSendChat} className="p-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 flex gap-2">
            <input
              type="text"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              placeholder={`Ask ${selectedAgent.name}...`}
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

      {/* Tab 5: Execution Audit Logs */}
      {activeTab === 'executions' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">User Prompt</th>
                  <th className="px-6 py-3.5">Capability Used</th>
                  <th className="px-6 py-3.5">Tokens & Latency</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-400">
                      No agent execution logs found.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100 max-w-[250px] truncate">
                        {exec.userPrompt}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-primary">
                        {exec.capabilityUsed || 'GENERAL'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {exec.tokens} tok | {exec.latencyMs}ms
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold">
                          {exec.status}
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
