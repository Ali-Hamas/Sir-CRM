'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Network, Play, Send, CheckCircle2, XCircle, Clock, AlertTriangle,
  Layers, GitBranch, Activity, FileText, BarChart3, ListTodo,
  Loader2, RefreshCw, ChevronRight, Eye, Bot, UserCheck, BookOpen,
  DollarSign, Calendar, Shield, Briefcase, Target, Sparkles
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  stepOrder: number;
  agentKey: string;
  agentName: string;
  task: string;
  inputData: string | null;
  outputData: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  latencyMs: number;
}

interface WorkflowDelegation {
  id: string;
  fromAgentKey: string;
  fromAgentName: string;
  toAgentKey: string;
  toAgentName: string;
  taskDescription: string;
  status: string;
  children: WorkflowDelegation[];
}

interface WorkflowConversation {
  id: string;
  fromAgent: string;
  fromAgentName: string;
  toAgent: string;
  toAgentName: string;
  message: string;
  messageType: string;
  createdAt: string;
}

interface ExecutionGraphData {
  id: string;
  graphData: { nodes: { id: string; label: string; task: string; order: number; status: string }[]; edges: { from: string; to: string; label: string }[] };
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalLatencyMs: number;
  status: string;
}

interface SharedContextEntry {
  id: string;
  contextKey: string;
  contextType: string;
  data: any;
  sourceAgentKey: string | null;
  version: number;
}

interface Workflow {
  id: string;
  title: string;
  userPrompt: string;
  finalResponse: string | null;
  status: string;
  executionPlan: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  steps: WorkflowStep[];
  delegations: WorkflowDelegation[];
  conversations: WorkflowConversation[];
  executionGraph: ExecutionGraphData | null;
  sharedContexts: SharedContextEntry[];
  _count?: { steps: number; delegations: number };
}

const AGENT_ICONS: Record<string, any> = {
  sales_agent: Target,
  project_manager_agent: Briefcase,
  knowledge_assistant: BookOpen,
  meeting_assistant: Calendar,
  finance_assistant: DollarSign,
  ceo_executive_assistant: Shield,
};

const AGENT_COLORS: Record<string, string> = {
  sales_agent: 'bg-emerald-500',
  project_manager_agent: 'bg-blue-500',
  knowledge_assistant: 'bg-purple-500',
  meeting_assistant: 'bg-amber-500',
  finance_assistant: 'bg-indigo-500',
  ceo_executive_assistant: 'bg-rose-500',
};

const AGENT_BG_COLORS: Record<string, string> = {
  sales_agent: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  project_manager_agent: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  knowledge_assistant: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
  meeting_assistant: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  finance_assistant: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
  ceo_executive_assistant: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
    PLANNING: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    EXECUTING: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    COMPLETED: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    FAILED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
    RUNNING: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    SKIPPED: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.PENDING}`}>
      {status === 'COMPLETED' && <CheckCircle2 size={12} />}
      {status === 'FAILED' && <XCircle size={12} />}
      {status === 'EXECUTING' && <Loader2 size={12} className="animate-spin" />}
      {status === 'RUNNING' && <Loader2 size={12} className="animate-spin" />}
      {status === 'PENDING' && <Clock size={12} />}
      {status}
    </span>
  );
}

export default function AIOrchestratorPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'dashboard' | 'graph' | 'timeline' | 'details' | 'progress' | 'logs' | 'history'>('dashboard');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Execute form
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/organizations/${orgSlug}/ai/orchestrator/workflows?limit=50`);
      setWorkflows(data.items || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const executeWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setExecuting(true);
    try {
      const result = await apiFetch(`/organizations/${orgSlug}/ai/orchestrator/execute`, {
        method: 'POST',
        body: JSON.stringify({ prompt: prompt.trim(), title: title.trim() || undefined }),
      });
      setSelectedWorkflow(result);
      setActiveTab('details');
      setPrompt('');
      setTitle('');
      fetchWorkflows();
    } catch (err) {
      console.error('Workflow execution failed:', err);
    } finally {
      setExecuting(false);
    }
  };

  const loadWorkflowDetails = async (workflowId: string) => {
    try {
      const [workflow, logs] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/ai/orchestrator/workflows/${workflowId}`),
        apiFetch(`/organizations/${orgSlug}/ai/orchestrator/workflows/${workflowId}/logs`).catch(() => []),
      ]);
      setSelectedWorkflow(workflow);
      setWorkflowLogs(logs || []);
      setActiveTab('details');
    } catch (err) {
      console.error('Failed to load workflow details:', err);
    }
  };

  const renderExecutionPlan = (planStr: string | null) => {
    if (!planStr) return null;
    try {
      const plan = JSON.parse(planStr);
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-zinc-400">{plan.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {plan.agents?.map((a: any, i: number) => {
              const AgentIcon = AGENT_ICONS[a.key] || Bot;
              const color = AGENT_COLORS[a.key] || 'bg-gray-500';
              return (
                <div key={a.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  <AgentIcon size={14} className="text-gray-500 dark:text-zinc-400" />
                  <span className="text-sm font-medium">{a.name}</span>
                  {i < plan.agents.length - 1 && <ChevronRight size={14} className="text-gray-400" />}
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch {
      return <p className="text-sm text-gray-500">{planStr}</p>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
          <Network className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Enterprise Multi-Agent Orchestrator</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">Coordinate specialized AI agents to collaborate, delegate, and execute complex tasks</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-zinc-800 pb-1 overflow-x-auto">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { key: 'graph', label: 'Execution Graph', icon: GitBranch },
          { key: 'timeline', label: 'Agent Timeline', icon: Activity },
          { key: 'details', label: 'Execution Details', icon: FileText },
          { key: 'progress', label: 'Live Progress', icon: Loader2 },
          { key: 'logs', label: 'Logs', icon: ListTodo },
          { key: 'history', label: 'History', icon: RefreshCw },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Execute Form */}
            <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Play size={18} className="text-indigo-500" />
                Execute Multi-Agent Workflow
              </h2>
              <form onSubmit={executeWorkflow} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Optional workflow title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Enter your request for the AI agents (e.g., 'Prepare a proposal for ABC Company')..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={executing || !prompt.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {executing ? (
                      <><Loader2 size={16} className="animate-spin" /> Executing...</>
                    ) : (
                      <><Send size={16} /> Execute Workflow</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrompt('Prepare a proposal for ABC Company')}
                    className="px-4 py-2.5 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Example: Proposal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrompt('Analyze current project health and risks')}
                    className="px-4 py-2.5 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Example: Project Health
                  </button>
                </div>
              </form>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 text-sm mb-1">
                  <Activity size={16} />
                  Total Workflows
                </div>
                <p className="text-2xl font-bold">{workflows.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-emerald-500 text-sm mb-1">
                  <CheckCircle2 size={16} />
                  Completed
                </div>
                <p className="text-2xl font-bold">{workflows.filter((w) => w.status === 'COMPLETED').length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-amber-500 text-sm mb-1">
                  <Loader2 size={16} />
                  In Progress
                </div>
                <p className="text-2xl font-bold">{workflows.filter((w) => w.status === 'EXECUTING' || w.status === 'PLANNING' || w.status === 'PENDING').length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
                  <AlertTriangle size={16} />
                  Failed
                </div>
                <p className="text-2xl font-bold">{workflows.filter((w) => w.status === 'FAILED').length}</p>
              </div>
            </div>

            {/* Recent Workflows */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Recent Workflows</h3>
              <div className="space-y-2">
                {workflows.slice(0, 10).map((wf) => (
                  <div
                    key={wf.id}
                    onClick={() => loadWorkflowDetails(wf.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={wf.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{wf.title}</p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{wf.userPrompt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                      {wf._count && <span>{wf._count.steps} steps</span>}
                      <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                ))}
                {workflows.length === 0 && !loading && (
                  <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-8">No workflows executed yet. Enter a prompt above to get started.</p>
                )}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Execution Graph Tab */}
        {activeTab === 'graph' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Execution Graph</h2>
            {!selectedWorkflow && (
              <div className="text-center py-12">
                <GitBranch size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                <p className="text-gray-500 dark:text-zinc-400">Select a workflow from the Dashboard or History tab to view its execution graph.</p>
              </div>
            )}
            {selectedWorkflow?.executionGraph && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Total Steps: <strong>{selectedWorkflow.executionGraph.totalSteps}</strong></span>
                  <span className="text-emerald-500">Completed: <strong>{selectedWorkflow.executionGraph.completedSteps}</strong></span>
                  <span className="text-red-500">Failed: <strong>{selectedWorkflow.executionGraph.failedSteps}</strong></span>
                  <span className="text-gray-500">Latency: <strong>{selectedWorkflow.executionGraph.totalLatencyMs}ms</strong></span>
                </div>
                <div className="relative">
                  {(() => {
                    const graph = selectedWorkflow.executionGraph!.graphData;
                    return (
                      <div className="space-y-4">
                        {graph.nodes.map((node, idx) => {
                          const AgentIcon = AGENT_ICONS[node.id] || Bot;
                          const bgColor = AGENT_BG_COLORS[node.id] || 'bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700';
                          const isActive = node.status === 'RUNNING' || node.status === 'EXECUTING';
                          const isDone = node.status === 'COMPLETED';
                          const isFailed = node.status === 'FAILED';
                          return (
                            <div key={node.id} className="relative">
                              {idx > 0 && (
                                <div className="absolute -top-4 left-8 w-px h-4 border-l-2 border-dashed border-gray-300 dark:border-zinc-600" />
                              )}
                              <div className={`flex items-start gap-4 p-4 rounded-xl border ${bgColor}`}>
                                <div className={`p-2 rounded-lg ${isDone ? 'bg-emerald-100 dark:bg-emerald-900/30' : isFailed ? 'bg-red-100 dark:bg-red-900/30' : isActive ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                                  <AgentIcon size={20} className={isDone ? 'text-emerald-600' : isFailed ? 'text-red-600' : isActive ? 'text-amber-600' : 'text-gray-500'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{node.label}</span>
                                    <StatusBadge status={node.status} />
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{node.task}</p>
                                </div>
                                <div className="text-xs text-gray-400 shrink-0">Step {node.order + 1}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agent Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Agent Timeline</h2>
            {!selectedWorkflow?.steps?.length ? (
              <div className="text-center py-12">
                <Activity size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                <p className="text-gray-500 dark:text-zinc-400">No execution data available. Run a workflow first.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedWorkflow.steps.map((step) => {
                  const AgentIcon = AGENT_ICONS[step.agentKey] || Bot;
                  const color = AGENT_COLORS[step.agentKey] || 'bg-gray-500';
                  return (
                    <div key={step.id} className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-zinc-800">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${color} mt-1`} />
                        {step.stepOrder < selectedWorkflow.steps.length && <div className="w-px flex-1 bg-gray-200 dark:bg-zinc-700 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <AgentIcon size={16} className="text-gray-500" />
                          <span className="font-medium text-sm">{step.agentName}</span>
                          <StatusBadge status={step.status} />
                          {step.latencyMs > 0 && <span className="text-xs text-gray-400">{step.latencyMs}ms</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{step.task}</p>
                        {step.outputData && (
                          <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 text-xs text-gray-600 dark:text-zinc-400 max-h-32 overflow-y-auto">
                            {step.outputData}
                          </div>
                        )}
                        {step.errorMessage && (
                          <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
                            {step.errorMessage}
                          </div>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-400">
                          {step.startedAt && <span>Started: {new Date(step.startedAt).toLocaleTimeString()}</span>}
                          {step.completedAt && <span>Completed: {new Date(step.completedAt).toLocaleTimeString()}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Execution Details Tab */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Execution Details</h2>
              {selectedWorkflow && (
                <button onClick={() => loadWorkflowDetails(selectedWorkflow.id)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                  <RefreshCw size={14} /> Refresh
                </button>
              )}
            </div>
            {!selectedWorkflow ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                <p className="text-gray-500 dark:text-zinc-400">Select a workflow to view execution details.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedWorkflow.status} />
                  <span className="font-medium">{selectedWorkflow.title}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                    <span className="text-gray-500">Created</span>
                    <p className="font-medium">{new Date(selectedWorkflow.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedWorkflow.startedAt && (
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                      <span className="text-gray-500">Started</span>
                      <p className="font-medium">{new Date(selectedWorkflow.startedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedWorkflow.completedAt && (
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                      <span className="text-gray-500">Completed</span>
                      <p className="font-medium">{new Date(selectedWorkflow.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                    <span className="text-gray-500">Steps</span>
                    <p className="font-medium">{selectedWorkflow.steps?.length || 0}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                  <h3 className="text-sm font-medium mb-2">User Prompt</h3>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">{selectedWorkflow.userPrompt}</p>
                </div>
                {selectedWorkflow.executionPlan && (
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                    <h3 className="text-sm font-medium mb-2">Execution Plan</h3>
                    {renderExecutionPlan(selectedWorkflow.executionPlan)}
                  </div>
                )}
                {selectedWorkflow.finalResponse && (
                  <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                    <h3 className="text-sm font-medium mb-2 text-indigo-700 dark:text-indigo-400">Final Response</h3>
                    <div className="text-sm text-indigo-600 dark:text-indigo-300 whitespace-pre-wrap">{selectedWorkflow.finalResponse}</div>
                  </div>
                )}
                {selectedWorkflow.errorMessage && (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <h3 className="text-sm font-medium mb-1 text-red-700 dark:text-red-400">Error</h3>
                    <p className="text-sm text-red-600 dark:text-red-300">{selectedWorkflow.errorMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Live Progress</h2>
            {!selectedWorkflow || (selectedWorkflow.status !== 'EXECUTING' && selectedWorkflow.status !== 'PLANNING' && selectedWorkflow.status !== 'PENDING') ? (
              <div className="text-center py-12">
                <Loader2 size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                <p className="text-gray-500 dark:text-zinc-400">No active workflow execution. Run a workflow to see live progress.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-amber-500" />
                  <span className="text-sm font-medium">Workflow in progress...</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${selectedWorkflow.executionGraph ? ((selectedWorkflow.executionGraph.completedSteps + selectedWorkflow.executionGraph.failedSteps) / selectedWorkflow.executionGraph.totalSteps) * 100 : 0}%` }}
                  />
                </div>
                <div className="space-y-2">
                  {selectedWorkflow.steps?.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 p-2">
                      <StatusBadge status={step.status} />
                      <span className="text-sm">{step.agentName}</span>
                      {step.status === 'RUNNING' && <Loader2 size={14} className="animate-spin text-amber-500" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Execution Logs</h2>
            {workflowLogs.length === 0 ? (
              <div className="text-center py-12">
                <ListTodo size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                <p className="text-gray-500 dark:text-zinc-400">No logs available for the selected workflow.</p>
              </div>
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {workflowLogs.map((log, idx) => (
                  <div key={idx} className={`flex gap-3 p-2 rounded ${log.level === 'ERROR' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : log.level === 'WARN' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'text-gray-600 dark:text-zinc-400'}`}>
                    <span className="text-gray-400 w-16 shrink-0">[{log.level || 'INFO'}]</span>
                    {log.agentName && <span className="text-indigo-500 w-32 shrink-0">[{log.agentName}]</span>}
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Execution History</h2>
              <button onClick={fetchWorkflows} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {workflows.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw size={48} className="mx-auto text-gray-300 dark:text-zinc-600 mb-4" />
                <p className="text-gray-500 dark:text-zinc-400">No workflows executed yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-800">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Prompt</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Steps</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((wf) => (
                      <tr key={wf.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30">
                        <td className="py-3 px-4"><StatusBadge status={wf.status} /></td>
                        <td className="py-3 px-4 font-medium max-w-[200px] truncate">{wf.title}</td>
                        <td className="py-3 px-4 text-gray-500 max-w-[300px] truncate">{wf.userPrompt}</td>
                        <td className="py-3 px-4">{wf._count?.steps || wf.steps?.length || '-'}</td>
                        <td className="py-3 px-4 text-gray-500">{new Date(wf.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => loadWorkflowDetails(wf.id)}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 text-xs ml-auto"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
