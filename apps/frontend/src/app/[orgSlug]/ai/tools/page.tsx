'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import {
  Wrench, Cpu, Shield, Search, Terminal, Play, CheckCircle2,
  AlertTriangle, Filter, Layers, Code, RefreshCw, Key, ChevronRight,
  Sparkles, Check, X, Info
} from 'lucide-react';

interface ToolCategory {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  _count?: { tools: number };
}

interface ToolParameter {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
}

interface ToolPermission {
  id: string;
  role: string;
  allowed: boolean;
  requiresApproval: boolean;
}

interface ToolItem {
  id: string;
  key: string;
  name: string;
  description: string;
  category: ToolCategory;
  jsonSchema: any;
  requiredParams: string[];
  optionalParams: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  parameters: ToolParameter[];
  permissions: ToolPermission[];
}

interface ExecutionLog {
  id: string;
  tool: { key: string; name: string; category: { displayName: string } };
  user: { firstName: string; lastName: string; email: string };
  inputParams: any;
  outputResult: any;
  status: string;
  errorMessage?: string;
  latencyMs: number;
  isMock: boolean;
  createdAt: string;
}

const RISK_COLORS: Record<string, string> = {
  LOW: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400',
  HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-400',
};

export default function AIToolsFrameworkPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [activeTab, setActiveTab] = useState<'registry' | 'tester' | 'logs' | 'permissions'>('registry');
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);

  // Tool Test Form State
  const [testInputParams, setTestInputParams] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsData, catData, execData] = await Promise.all([
        apiFetch(`/organizations/${orgSlug}/ai/tools`),
        apiFetch(`/organizations/${orgSlug}/ai/tools/categories`),
        apiFetch(`/organizations/${orgSlug}/ai/tools/executions?limit=30`).catch(() => []),
      ]);

      setTools(toolsData || []);
      setCategories(catData || []);
      setExecutions(execData || []);

      if (toolsData && toolsData.length > 0 && !selectedTool) {
        setSelectedTool(toolsData[0]);
      }
    } catch (err) {
      console.error('Failed to load AI tools framework data:', err);
    } finally {
      setLoading(false);
    }
  }, [orgSlug, selectedTool]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When selected tool changes, initialize default test inputs
  useEffect(() => {
    if (selectedTool) {
      const initialParams: Record<string, any> = {};
      selectedTool.parameters.forEach((param) => {
        if (param.type === 'NUMBER') initialParams[param.name] = 100;
        else if (param.type === 'BOOLEAN') initialParams[param.name] = true;
        else initialParams[param.name] = `Sample ${param.name}`;
      });
      setTestInputParams(initialParams);
      setTestResult(null);
    }
  }, [selectedTool]);

  const handleExecuteMockTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool || testLoading) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await apiFetch(`/organizations/${orgSlug}/ai/tools/execute`, {
        method: 'POST',
        body: JSON.stringify({
          toolKey: selectedTool.key,
          params: testInputParams,
        }),
      });

      setTestResult(res);
      // Refresh execution logs
      apiFetch(`/organizations/${orgSlug}/ai/tools/executions?limit=30`).then((data) => setExecutions(data || []));
    } catch (err: any) {
      setTestResult({
        status: 'FAILED',
        error: err.message || 'Execution failed',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || tool.category.name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

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
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-600/10 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-blue-900/20 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <Wrench size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Enterprise Tool Calling Framework
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                Mock Executor Active
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Secure internal function execution framework allowing AI Assistants to trigger platform actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-xs font-medium flex items-center gap-2">
            <Layers size={14} className="text-emerald-500" />
            <span className="text-gray-500">Registered Tools:</span>
            <span className="font-bold">{tools.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide pb-0.5">
        {[
          { id: 'registry', label: 'Tool Registry', icon: Wrench },
          { id: 'tester', label: 'Inspector & Tester', icon: Terminal },
          { id: 'logs', label: 'Execution Logs', icon: Code },
          { id: 'permissions', label: 'Permission Matrix', icon: Shield },
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

      {/* Tab 1: Tool Registry */}
      {activeTab === 'registry' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools by name, key, or category..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === 'ALL'
                    ? 'bg-primary text-white font-semibold'
                    : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100'
                }`}
              >
                All Categories ({tools.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedCategory === cat.name
                      ? 'bg-primary text-white font-semibold'
                      : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100'
                  }`}
                >
                  {cat.displayName}
                </button>
              ))}
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => {
                  setSelectedTool(tool);
                  setActiveTab('tester');
                }}
                className="p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary/50 transition-all cursor-pointer shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                      {tool.category?.displayName || 'General'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${RISK_COLORS[tool.riskLevel] || ''}`}>
                      {tool.riskLevel} RISK
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                    {tool.name}
                  </h3>

                  <p className="text-xs font-mono text-gray-400">{tool.key}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2">{tool.description}</p>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-gray-500">
                  <span>{tool.parameters?.length || 0} Parameters</span>
                  <span className="text-primary font-medium flex items-center gap-1">
                    Test Tool <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Tool Inspector & Interactive Tester */}
      {activeTab === 'tester' && selectedTool && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Parameter Form & Inspector */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTool.name}</h2>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded ${RISK_COLORS[selectedTool.riskLevel]}`}>
                  {selectedTool.riskLevel} RISK
                </span>
              </div>
              <p className="text-xs font-mono text-primary mb-2">{selectedTool.key}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">{selectedTool.description}</p>
            </div>

            {/* Test Form */}
            <form onSubmit={handleExecuteMockTool} className="space-y-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Terminal size={14} className="text-primary" /> Test Execution Parameters
              </h3>

              {selectedTool.parameters.length === 0 ? (
                <p className="text-xs text-gray-400">No parameters required for this tool.</p>
              ) : (
                selectedTool.parameters.map((param) => (
                  <div key={param.id} className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-zinc-300">
                      {param.name} {param.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={param.type === 'NUMBER' ? 'number' : 'text'}
                      value={testInputParams[param.name] ?? ''}
                      onChange={(e) =>
                        setTestInputParams({
                          ...testInputParams,
                          [param.name]: param.type === 'NUMBER' ? parseFloat(e.target.value) || 0 : e.target.value,
                        })
                      }
                      placeholder={param.description || `Enter ${param.name}`}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950 text-xs font-mono"
                      required={param.required}
                    />
                  </div>
                ))
              )}

              <button
                type="submit"
                disabled={testLoading}
                className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white font-medium rounded-xl text-xs shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              >
                <Play size={14} /> {testLoading ? 'Executing Mock Tool...' : 'Execute Tool (Mock Mode)'}
              </button>
            </form>
          </div>

          {/* Right Column: JSON Schema & Output Result */}
          <div className="space-y-6">
            {/* JSON Schema Viewer */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Code size={14} className="text-indigo-500" /> JSON Schema Definition
              </h3>
              <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(selectedTool.jsonSchema, null, 2)}
              </pre>
            </div>

            {/* Execution Result Box */}
            <div className="p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500" /> Structured Mock Output Payload
              </h3>
              {!testResult ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  Click "Execute Tool" to trigger mock execution and view structured JSON payload.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold px-2 py-0.5 rounded ${
                      testResult.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-red-100 text-red-800'
                    }`}>
                      Status: {testResult.status}
                    </span>
                    <span className="font-mono text-gray-400">Latency: {testResult.latencyMs}ms</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-gray-950 text-emerald-400 text-xs font-mono overflow-x-auto max-h-64 leading-relaxed">
                    {JSON.stringify(testResult.outputResult || testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Execution Logs */}
      {activeTab === 'logs' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Tool Key</th>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Input Parameters</th>
                  <th className="px-6 py-3.5">Output Payload</th>
                  <th className="px-6 py-3.5">Latency</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-xs text-gray-400">
                      No tool execution logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                      <td className="px-6 py-4 font-mono font-semibold text-primary text-xs">
                        {exec.tool?.key}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-zinc-400">
                        {exec.user?.firstName} {exec.user?.lastName}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-600 dark:text-zinc-400 max-w-[200px] truncate">
                        {JSON.stringify(exec.inputParams)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-emerald-600 dark:text-emerald-400 max-w-[250px] truncate">
                        {JSON.stringify(exec.outputResult)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-400">{exec.latencyMs}ms</td>
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

      {/* Tab 4: Permission Matrix */}
      {activeTab === 'permissions' && (
        <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Tool Name & Key</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Risk Level</th>
                  <th className="px-6 py-3.5">Super Admin</th>
                  <th className="px-6 py-3.5">Admin</th>
                  <th className="px-6 py-3.5">Manager</th>
                  <th className="px-6 py-3.5">Employee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {tools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-xs">{tool.name}</p>
                      <p className="text-[10px] font-mono text-gray-400">{tool.key}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-zinc-400">{tool.category?.displayName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${RISK_COLORS[tool.riskLevel]}`}>
                        {tool.riskLevel}
                      </span>
                    </td>
                    {['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'].map((role) => {
                      const isAllowed = tool.permissions.find((p) => p.role === role)?.allowed ?? true;
                      return (
                        <td key={role} className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            isAllowed ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {isAllowed ? <Check size={14} /> : <X size={14} />}
                            {isAllowed ? 'Allowed' : 'Blocked'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
